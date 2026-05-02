import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { hashApiKey } from '../utils/apiKey';
import logger from '../utils/logger';

// Public-API authentication. Accepts either:
//   1. A personal API key (mym_<random>) → matches ApiKey.keyHash.
//   2. An OAuth access token (mym_oauth_<random>) → matches OAuthGrant.accessTokenHash
//      (issued via /api/oauth/token after end-user consent).
// Sets req.apiKey OR req.oauthGrant, plus req.user (synthetic) so downstream
// handlers can use the standard userId surface either way.

// Throttle lastUsedAt updates to once per minute per key — without this,
// a torrent of requests would write to the same row on every call.
const lastUsedTouchedAt = new Map<string, number>();
const TOUCH_INTERVAL_MS = 60_000;
const TOUCH_MAP_MAX = 10_000;

const OAUTH_TOKEN_PREFIX = 'mym_oauth_';

export const requireApiKey = async (req: any, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m || !m[1]) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }
  const raw = m[1];
  const hash = hashApiKey(raw);

  // OAuth access tokens have a distinct prefix; route them to the OAuthGrant
  // table to avoid an unnecessary ApiKey lookup.
  if (raw.startsWith(OAUTH_TOKEN_PREFIX)) {
    const grant = await prisma.oAuthGrant.findUnique({
      where: { accessTokenHash: hash },
      include: {
        app: { select: { id: true, status: true, scopes: true } },
        user: { select: { id: true, role: true, email: true, tokenVersion: true } },
      },
    });
    if (!grant || grant.revokedAt) {
      res.status(401).json({ error: 'Invalid or revoked access token' });
      return;
    }
    if (grant.accessTokenExpiresAt && grant.accessTokenExpiresAt.getTime() < Date.now()) {
      res.status(401).json({ error: 'Access token expired' });
      return;
    }
    if (grant.app.status !== 'APPROVED') {
      res.status(401).json({ error: 'OAuth app is no longer approved' });
      return;
    }
    req.oauthGrant = grant;
    // Synthetic apiKey shape so downstream `requireScope` works unchanged —
    // it just reads req.apiKey?.scopes.
    req.apiKey = { id: `oauth:${grant.id}`, scopes: grant.scopes };
    req.user = {
      userId: grant.user.id,
      role: grant.user.role,
      email: grant.user.email,
      tv: grant.user.tokenVersion,
    };
    next();
    return;
  }

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { user: { select: { id: true, role: true, email: true, tokenVersion: true } } },
  });
  if (!key || key.revokedAt) {
    res.status(401).json({ error: 'Invalid or revoked API key' });
    return;
  }
  // Throttled lastUsedAt update — failure here shouldn't break the request.
  // Bound the map so a long-running process doesn't accumulate one entry per
  // unique key id ever seen; drop the oldest insertion when over budget.
  const last = lastUsedTouchedAt.get(key.id) || 0;
  if (Date.now() - last > TOUCH_INTERVAL_MS) {
    if (lastUsedTouchedAt.size >= TOUCH_MAP_MAX) {
      const firstKey = lastUsedTouchedAt.keys().next().value;
      if (firstKey) lastUsedTouchedAt.delete(firstKey);
    }
    lastUsedTouchedAt.set(key.id, Date.now());
    prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch((err) => {
        logger.warn('apiKey lastUsedAt update failed', { keyId: key.id, error: (err as Error).message });
      });
  }

  req.apiKey = key;
  req.user = {
    userId: key.user.id,
    role: key.user.role,
    email: key.user.email,
    tv: key.user.tokenVersion,
  };
  next();
};

// Per-route scope check. Apply after `requireApiKey` to restrict access
// to keys with the named scope. Empty scope arrays no longer get a free
// pass — every key must list the scopes it needs. The previous "empty
// means full" carve-out for legacy dashboard-issued keys was an unintended
// privilege-escalation vector: a key could be created with `scopes: []`
// and silently bypass every per-route check. If you have such legacy
// keys, regenerate them with explicit scopes.
export const requireScope = (scope: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    const scopes: string[] = Array.isArray(req.apiKey?.scopes) ? req.apiKey.scopes : [];
    if (scopes.includes(scope)) return next();
    res.status(403).json({ error: `Missing required scope: ${scope}` });
  };
};
