import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { generateApiKey } from '../utils/apiKey';

const MAX_KEYS_PER_USER = 10;

// Allowlist of valid scopes. Adding a scope here without wiring it into
// `requireScope` middleware on a route just means the scope is reservable
// but unused — that's fine. Adding a scope NOT in this list at key creation
// time is a security risk (could be used to mint forged "admin:*" scopes).
export const ALLOWED_SCOPES = [
  'music:read',
  'music:write',
  'lyrics:read',
  'lyrics:write',
  'tracks:read',
  'tracks:write',
  'agents:read',
] as const;
export type AllowedScope = (typeof ALLOWED_SCOPES)[number];

export const createApiKey = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { name, scopes } = req.body || {};
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 60) {
      res.status(400).json({ error: 'name is required (1-60 chars)' });
      return;
    }
    const existing = await prisma.apiKey.count({ where: { userId: req.user.userId, revokedAt: null } });
    if (existing >= MAX_KEYS_PER_USER) {
      res.status(400).json({ error: `Maximum ${MAX_KEYS_PER_USER} active keys per user` });
      return;
    }

    const { raw, prefix, hash } = generateApiKey();
    const key = await prisma.apiKey.create({
      data: {
        userId: req.user.userId,
        name,
        prefix,
        keyHash: hash,
        scopes: Array.isArray(scopes)
          ? Array.from(
              new Set(
                scopes
                  .filter((s: unknown): s is string => typeof s === 'string')
                  .filter((s) => (ALLOWED_SCOPES as readonly string[]).includes(s)),
              ),
            )
          : [],
      },
      select: { id: true, name: true, prefix: true, scopes: true, createdAt: true },
    });

    // raw is returned ONCE at creation; we never store or echo it again.
    res.status(201).json({ key, secret: raw });
  } catch (error) {
    logger.error('createApiKey error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

export const listApiKeys = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    });
    res.json({ keys });
  } catch (error) {
    logger.error('listApiKeys error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list API keys' });
  }
};

export const revokeApiKey = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== req.user.userId) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    if (!key.revokedAt) {
      await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    }
    res.json({ ok: true });
  } catch (error) {
    logger.error('revokeApiKey error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to revoke key' });
  }
};
