// Developer-app management surface. Developers register an OAuth app here
// and (after admin approval) end-users can authorize it via /oauth/authorize.
// Mirrors the ApiKey lifecycle: client_secret is shown ONCE at creation,
// hashed at rest, never echoed back.

import crypto from 'crypto';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { hashApiKey } from '../utils/apiKey';
import { slugify } from '../utils/slugify';
import { ALLOWED_SCOPES } from './apiKeyController';

const MAX_APPS_PER_USER = 10;

function generateClientId(): string {
  return `mym_oauth_${crypto.randomBytes(8).toString('hex')}`;
}

function generateClientSecret(): string {
  // Same prefix scheme as ApiKey so the apiKeyOrOAuth middleware can sniff
  // for "mym_" before hitting the slow lookup path.
  return `mym_secret_${crypto.randomBytes(28).toString('base64url')}`;
}

function uniqueScopes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((s): s is string => typeof s === 'string')
        .filter((s) => (ALLOWED_SCOPES as readonly string[]).includes(s)),
    ),
  );
}

function validateRedirectUris(input: unknown): string[] | { error: string } {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const u of input.slice(0, 10)) {
    if (typeof u !== 'string') continue;
    const trimmed = u.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > 500) return { error: 'redirect uri too long (max 500 chars)' };
    try {
      const parsed = new URL(trimmed);
      // Require https except for localhost (for local dev). Disallow
      // fragments — OAuth disallows them in redirect URIs.
      const isLocal = ['localhost', '127.0.0.1'].includes(parsed.hostname);
      if (!isLocal && parsed.protocol !== 'https:') {
        return { error: `redirect uri must use https: ${trimmed}` };
      }
      if (parsed.hash && parsed.hash.length > 0) {
        return { error: `redirect uri must not include a fragment: ${trimmed}` };
      }
      out.push(trimmed);
    } catch {
      return { error: `redirect uri is not a valid URL: ${trimmed}` };
    }
  }
  return out;
}

// POST /api/developers/apps — create a new developer app.
export const createApp = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { name, description, iconUrl, homepage, redirectUris, scopes } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      res.status(400).json({ error: 'name is required (2-80 chars)' });
      return;
    }
    const existing = await prisma.oAuthApp.count({
      where: { ownerUserId: req.user.userId, status: { not: 'REMOVED' } },
    });
    if (existing >= MAX_APPS_PER_USER) {
      res.status(400).json({ error: `Maximum ${MAX_APPS_PER_USER} apps per developer` });
      return;
    }

    const redirects = validateRedirectUris(redirectUris);
    if (!Array.isArray(redirects)) {
      res.status(400).json({ error: redirects.error });
      return;
    }

    const baseSlug = slugify(name) || 'app';
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const clientSecretHash = hashApiKey(clientSecret);

    const app = await prisma.oAuthApp.create({
      data: {
        clientId,
        clientSecretHash,
        name: name.trim().slice(0, 80),
        slug,
        description: typeof description === 'string' ? description.slice(0, 2000) : null,
        iconUrl: typeof iconUrl === 'string' ? iconUrl.slice(0, 500) : null,
        homepage: typeof homepage === 'string' ? homepage.slice(0, 500) : null,
        redirectUris: redirects,
        scopes: uniqueScopes(scopes),
        status: 'PENDING',
        listed: false,
        ownerUserId: req.user.userId,
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        slug: true,
        description: true,
        iconUrl: true,
        homepage: true,
        redirectUris: true,
        scopes: true,
        status: true,
        listed: true,
        createdAt: true,
      },
    });

    res.status(201).json({ app, clientSecret });
  } catch (error) {
    logger.error('createApp error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create app' });
  }
};

// PATCH /api/developers/apps/:id — owner edits. Editing scopes resets to PENDING.
export const updateApp = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const existing = await prisma.oAuthApp.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    if (existing.ownerUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the app owner can update it' });
      return;
    }
    const { name, description, iconUrl, homepage, redirectUris, scopes } = req.body || {};
    const updates: Prisma.OAuthAppUpdateInput = {};
    if (typeof name === 'string' && name.trim().length >= 2) updates.name = name.trim().slice(0, 80);
    if (typeof description === 'string') updates.description = description.slice(0, 2000);
    if (typeof iconUrl === 'string') updates.iconUrl = iconUrl.slice(0, 500);
    if (typeof homepage === 'string') updates.homepage = homepage.slice(0, 500);

    if (redirectUris !== undefined) {
      const redirects = validateRedirectUris(redirectUris);
      if (!Array.isArray(redirects)) {
        res.status(400).json({ error: redirects.error });
        return;
      }
      updates.redirectUris = redirects;
    }
    if (scopes !== undefined) {
      const next = uniqueScopes(scopes);
      const prev = (existing.scopes || []) as string[];
      const sameSet = next.length === prev.length && next.every((s) => prev.includes(s));
      updates.scopes = next;
      // Editing the requested scopes resets review state — admins re-review.
      if (!sameSet) updates.status = 'PENDING';
    }

    const app = await prisma.oAuthApp.update({ where: { id }, data: updates });
    res.json({ app });
  } catch (error) {
    logger.error('updateApp error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update app' });
  }
};

// POST /api/developers/apps/:id/rotate-secret — generates a new client_secret,
// invalidates all existing grants. Useful when a secret is leaked.
export const rotateSecret = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const existing = await prisma.oAuthApp.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    if (existing.ownerUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the app owner can rotate the secret' });
      return;
    }
    const clientSecret = generateClientSecret();
    const clientSecretHash = hashApiKey(clientSecret);
    await prisma.$transaction(async (tx) => {
      await tx.oAuthApp.update({ where: { id }, data: { clientSecretHash } });
      // All existing access tokens are now untrusted — revoke.
      await tx.oAuthGrant.updateMany({
        where: { appId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    res.json({ clientSecret });
  } catch (error) {
    logger.error('rotateSecret error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
};

// GET /api/developers/apps/mine
export const listMyApps = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const apps = await prisma.oAuthApp.findMany({
      where: { ownerUserId: req.user.userId, status: { not: 'REMOVED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        name: true,
        slug: true,
        description: true,
        iconUrl: true,
        homepage: true,
        redirectUris: true,
        scopes: true,
        status: true,
        listed: true,
        createdAt: true,
      },
    });
    res.json({ apps });
  } catch (error) {
    logger.error('listMyApps error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list apps' });
  }
};

// GET /api/developers/apps — public registry (APPROVED + listed).
export const listPublicApps = async (_req: RequestWithUser, res: Response) => {
  try {
    const apps = await prisma.oAuthApp.findMany({
      where: { status: 'APPROVED', listed: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        homepage: true,
        scopes: true,
      },
    });
    res.json({ apps });
  } catch (error) {
    logger.error('listPublicApps error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list apps' });
  }
};

// GET /api/developers/apps/:slug — public detail.
export const getPublicApp = async (req: RequestWithUser, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const app = await prisma.oAuthApp.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        homepage: true,
        scopes: true,
        status: true,
        listed: true,
      },
    });
    if (!app || app.status !== 'APPROVED' || !app.listed) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json({ app });
  } catch (error) {
    logger.error('getPublicApp error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load app' });
  }
};

// ─── Admin review queue ─────────────────────────────────

export const adminListApps = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const status = req.query.status as string | undefined;
    const where: Prisma.OAuthAppWhereInput = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'].includes(status)) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
    }
    const apps = await prisma.oAuthApp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        owner: { select: { id: true, username: true, email: true, displayName: true } },
      },
    });
    res.json({ apps });
  } catch (error) {
    logger.error('adminListApps error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list apps' });
  }
};

export const adminUpdateApp = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const id = req.params.id as string;
    const { status, listed } = req.body || {};
    const updates: Prisma.OAuthAppUpdateInput = {};
    if (typeof status === 'string' && ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'].includes(status)) {
      updates.status = status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
    }
    if (typeof listed === 'boolean') updates.listed = listed;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }
    const app = await prisma.oAuthApp.update({ where: { id }, data: updates });
    res.json({ app });
  } catch (error) {
    logger.error('adminUpdateApp error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update app' });
  }
};
