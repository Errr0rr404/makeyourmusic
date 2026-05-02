// OAuth 2.0 authorization-code flow with PKCE (S256).
//
// Endpoints:
//   GET  /api/oauth/info?client_id=...    — pre-flight metadata for the consent screen
//   POST /api/oauth/authorize             — user-action endpoint (called by the consent page)
//   POST /api/oauth/token                 — exchange code OR refresh token for access token
//   POST /api/oauth/revoke                — revoke an access/refresh token (RFC 7009-ish)
//
// We support two grant types on /token: authorization_code (initial exchange)
// and refresh_token (rotating renewal). Refresh tokens are 180-day rotated;
// access tokens drop to 60 minutes once a refresh is issued so a leaked
// access token isn't durable. No introspection endpoint — apps can verify
// validity by hitting any /api/v1 endpoint.

import crypto from 'crypto';
import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { hashApiKey } from '../utils/apiKey';

// Without a refresh token, access tokens are long-lived (90 days). Once a
// refresh token is issued, the access token TTL drops to 60 min so leaks
// auto-expire quickly; the refresh token (180 days) is the durable creds.
const ACCESS_TOKEN_TTL_LONG_MS = 90 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_SHORT_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 min

function generateAuthorizationCode(): string {
  return `mym_oauthcode_${crypto.randomBytes(28).toString('base64url')}`;
}

function generateAccessToken(): string {
  return `mym_oauth_${crypto.randomBytes(28).toString('base64url')}`;
}

function generateRefreshToken(): string {
  return `mym_oauthrefresh_${crypto.randomBytes(32).toString('base64url')}`;
}

function verifyPkce(verifier: string, challenge: string, method: string | null | undefined): boolean {
  // Only S256 is accepted. `plain` is insecure and we never set it server-side.
  if (method !== 'S256') return false;
  const hashed = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return hashed === challenge;
}

// GET /api/oauth/info?client_id=... — used by the frontend consent page so
// it can show the app's name/icon + the requested scopes BEFORE the user
// approves. We don't require auth here (the user might still be logging in).
export const getAppInfo = async (req: RequestWithUser, res: Response) => {
  try {
    const clientId = String(req.query.client_id || '');
    if (!clientId) {
      res.status(400).json({ error: 'client_id is required' });
      return;
    }
    const app = await prisma.oAuthApp.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        homepage: true,
        redirectUris: true,
        scopes: true,
        status: true,
      },
    });
    if (!app || app.status !== 'APPROVED') {
      res.status(404).json({ error: 'App not found or not approved' });
      return;
    }
    res.json({ app });
  } catch (error) {
    logger.error('getAppInfo error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load app info' });
  }
};

// POST /api/oauth/authorize — auth required.
// The frontend consent page POSTs here with the user's approval; we mint
// a short-lived authorization code and return it for the redirect.
//
// Body:
//   { client_id, redirect_uri, scope, code_challenge, code_challenge_method, state }
// Response:
//   { redirect: "<redirect_uri>?code=...&state=..." }
//
// We return the redirect URL ourselves rather than performing a 302 from
// the API — the consent page does the actual browser navigation, which
// preserves auth headers + matches the frontend SPA flow.
export const authorize = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const {
      client_id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method,
      state,
    } = req.body || {};

    if (typeof client_id !== 'string' || !client_id) {
      res.status(400).json({ error: 'client_id is required' });
      return;
    }
    if (typeof redirect_uri !== 'string' || !redirect_uri) {
      res.status(400).json({ error: 'redirect_uri is required' });
      return;
    }
    if (typeof code_challenge !== 'string' || !code_challenge) {
      res.status(400).json({ error: 'code_challenge is required (PKCE)' });
      return;
    }
    if (code_challenge_method !== 'S256') {
      res.status(400).json({ error: 'code_challenge_method must be S256' });
      return;
    }

    const app = await prisma.oAuthApp.findUnique({ where: { clientId: client_id } });
    if (!app || app.status !== 'APPROVED') {
      res.status(404).json({ error: 'App not found or not approved' });
      return;
    }
    if (!app.redirectUris.includes(redirect_uri)) {
      res.status(400).json({ error: 'redirect_uri not registered' });
      return;
    }

    // Restrict scopes to the intersection of (requested, app-allowed).
    const requested = typeof scope === 'string' ? scope.split(/[\s,]+/).filter(Boolean) : [];
    const finalScopes = requested.filter((s) => app.scopes.includes(s));

    const rawCode = generateAuthorizationCode();
    const codeHash = hashApiKey(rawCode);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Upsert the grant — re-authorizing replaces the previous grant entirely.
    await prisma.oAuthGrant.upsert({
      where: {
        appId_userId: { appId: app.id, userId: req.user.userId },
      },
      create: {
        appId: app.id,
        userId: req.user.userId,
        scopes: finalScopes,
        codeHash,
        codeExpiresAt: expiresAt,
        codeChallenge: code_challenge,
        codeChallengeMethod: 'S256',
        redirectUri: redirect_uri,
      },
      update: {
        scopes: finalScopes,
        codeHash,
        codeExpiresAt: expiresAt,
        codeChallenge: code_challenge,
        codeChallengeMethod: 'S256',
        redirectUri: redirect_uri,
        // Wipe any previous access token so the old session can't keep
        // riding on the prior consent.
        accessTokenHash: null,
        accessTokenExpiresAt: null,
        revokedAt: null,
      },
    });

    const params = new URLSearchParams({ code: rawCode });
    if (typeof state === 'string' && state.length > 0) params.set('state', state);
    const sep = redirect_uri.includes('?') ? '&' : '?';
    res.json({ redirect: `${redirect_uri}${sep}${params.toString()}` });
  } catch (error) {
    logger.error('oauth authorize error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to authorize' });
  }
};

// POST /api/oauth/token — public (no auth). Validates client credentials and
// either (a) exchanges an authorization_code for access+refresh tokens, or
// (b) rotates a refresh_token for new access+refresh tokens.
//
// Body (authorization_code):
//   { grant_type: 'authorization_code', client_id, client_secret,
//     code, redirect_uri, code_verifier }
// Body (refresh_token):
//   { grant_type: 'refresh_token', client_id, client_secret, refresh_token }
//
// Response: { access_token, refresh_token, token_type, expires_in, scope }
export const exchangeToken = async (req: RequestWithUser, res: Response) => {
  try {
    const { grant_type, client_id, client_secret } = req.body || {};
    if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
      res.status(400).json({ error: 'unsupported_grant_type' });
      return;
    }
    if (typeof client_id !== 'string' || typeof client_secret !== 'string') {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }

    const app = await prisma.oAuthApp.findUnique({ where: { clientId: client_id } });
    if (!app) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }
    if (app.status !== 'APPROVED') {
      res.status(401).json({ error: 'invalid_client: app not approved' });
      return;
    }
    // Constant-time compare on the hashed secret.
    const candidate = hashApiKey(client_secret);
    const match =
      candidate.length === app.clientSecretHash.length &&
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(app.clientSecretHash));
    if (!match) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }

    if (grant_type === 'refresh_token') {
      const { refresh_token } = req.body || {};
      if (typeof refresh_token !== 'string' || !refresh_token) {
        res.status(400).json({ error: 'invalid_request: refresh_token required' });
        return;
      }
      const refreshHash = hashApiKey(refresh_token);
      const grant = await prisma.oAuthGrant.findUnique({ where: { refreshTokenHash: refreshHash } });
      if (!grant || grant.appId !== app.id) {
        res.status(400).json({ error: 'invalid_grant' });
        return;
      }
      if (grant.revokedAt) {
        res.status(400).json({ error: 'invalid_grant: revoked' });
        return;
      }
      if (!grant.refreshTokenExpiresAt || grant.refreshTokenExpiresAt.getTime() < Date.now()) {
        res.status(400).json({ error: 'invalid_grant: refresh token expired' });
        return;
      }

      // Rotate: mint fresh access + refresh tokens, invalidate the prior
      // refresh by overwriting its hash. If the old refresh ever shows up
      // again it'll fail the lookup.
      const newAccess = generateAccessToken();
      const newAccessHash = hashApiKey(newAccess);
      const newAccessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SHORT_MS);
      const newRefresh = generateRefreshToken();
      const newRefreshHash = hashApiKey(newRefresh);
      const newRefreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      await prisma.oAuthGrant.update({
        where: { id: grant.id },
        data: {
          accessTokenHash: newAccessHash,
          accessTokenExpiresAt: newAccessExpiresAt,
          refreshTokenHash: newRefreshHash,
          refreshTokenExpiresAt: newRefreshExpiresAt,
        },
      });

      res.json({
        access_token: newAccess,
        refresh_token: newRefresh,
        token_type: 'Bearer',
        expires_in: Math.floor(ACCESS_TOKEN_TTL_SHORT_MS / 1000),
        scope: grant.scopes.join(' '),
      });
      return;
    }

    // grant_type === 'authorization_code' below.
    const { code, redirect_uri, code_verifier } = req.body || {};
    if (typeof code !== 'string') {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    if (typeof code_verifier !== 'string' || code_verifier.length < 43) {
      res.status(400).json({ error: 'invalid_request: code_verifier required (>= 43 chars)' });
      return;
    }
    if (typeof redirect_uri !== 'string') {
      res.status(400).json({ error: 'invalid_request: redirect_uri required' });
      return;
    }

    const codeHash = hashApiKey(code);
    const grant = await prisma.oAuthGrant.findUnique({
      where: { codeHash },
    });
    if (!grant || grant.appId !== app.id) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }
    if (!grant.codeExpiresAt || grant.codeExpiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: 'invalid_grant: code expired' });
      return;
    }
    if (grant.redirectUri && grant.redirectUri !== redirect_uri) {
      res.status(400).json({ error: 'invalid_grant: redirect_uri mismatch' });
      return;
    }
    if (!grant.codeChallenge || !verifyPkce(code_verifier, grant.codeChallenge, grant.codeChallengeMethod)) {
      res.status(400).json({ error: 'invalid_grant: PKCE verification failed' });
      return;
    }

    // Mint access + refresh tokens; consume the code (one-shot).
    const rawAccessToken = generateAccessToken();
    const accessTokenHash = hashApiKey(rawAccessToken);
    const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SHORT_MS);
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashApiKey(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.oAuthGrant.update({
      where: { id: grant.id },
      data: {
        codeHash: null,
        codeExpiresAt: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        accessTokenHash,
        accessTokenExpiresAt,
        refreshTokenHash,
        refreshTokenExpiresAt,
        revokedAt: null,
      },
    });

    res.json({
      access_token: rawAccessToken,
      refresh_token: rawRefreshToken,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_SHORT_MS / 1000),
      scope: grant.scopes.join(' '),
    });
  } catch (error) {
    logger.error('oauth exchangeToken error', { error: (error as Error).message });
    res.status(500).json({ error: 'server_error' });
  }
};

// Reference for backward compat — keep the constant exported so any
// external caller that imported ACCESS_TOKEN_TTL_MS still resolves. The
// long-form value is the safer default here since unrefreshed apps must
// still work.
export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_LONG_MS;

// POST /api/oauth/revoke — RFC 7009-ish. Body: { token } — pass either the
// access_token or refresh_token. We don't reveal whether the token was
// valid (per spec).
export const revokeToken = async (req: RequestWithUser, res: Response) => {
  try {
    const { token } = req.body || {};
    if (typeof token !== 'string' || !token) {
      // Spec says we should still 200 even on missing token to avoid info leak.
      res.json({});
      return;
    }
    const tokenHash = hashApiKey(token);
    await prisma.oAuthGrant.updateMany({
      where: {
        OR: [{ accessTokenHash: tokenHash }, { refreshTokenHash: tokenHash }],
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    res.json({});
  } catch (error) {
    logger.error('oauth revokeToken error', { error: (error as Error).message });
    // Still mask errors per RFC 7009.
    res.json({});
  }
};

// GET /api/oauth/grants — auth required. Lists the user's active grants
// so they can see + revoke individual app access from the dashboard.
export const listMyGrants = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const grants = await prisma.oAuthGrant.findMany({
      where: { userId: req.user.userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        app: { select: { slug: true, name: true, iconUrl: true } },
      },
    });
    res.json({
      grants: grants.map((g) => ({
        id: g.id,
        scopes: g.scopes,
        createdAt: g.createdAt,
        accessTokenExpiresAt: g.accessTokenExpiresAt,
        app: g.app,
      })),
    });
  } catch (error) {
    logger.error('listMyGrants error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list grants' });
  }
};

// DELETE /api/oauth/grants/:id — revoke a specific grant the user holds.
export const revokeGrant = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const grant = await prisma.oAuthGrant.findUnique({ where: { id } });
    if (!grant || grant.userId !== req.user.userId) {
      res.status(404).json({ error: 'Grant not found' });
      return;
    }
    await prisma.oAuthGrant.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('revokeGrant error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to revoke grant' });
  }
};
