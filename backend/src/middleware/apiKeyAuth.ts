import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { hashApiKey } from '../utils/apiKey';

// Public-API authentication. Looks up an Authorization: Bearer <raw_key>
// header, hashes it, and matches against ApiKey.keyHash. Sets
// req.apiKey + req.user (synthetic from key.userId) so downstream handlers
// can use the standard userId surface.

// Throttle lastUsedAt updates to once per minute per key — without this,
// a torrent of requests would write to the same row on every call.
const lastUsedTouchedAt = new Map<string, number>();
const TOUCH_INTERVAL_MS = 60_000;

export const requireApiKey = async (req: any, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m || !m[1]) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }
  const raw = m[1];
  const hash = hashApiKey(raw);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { user: { select: { id: true, role: true, email: true, tokenVersion: true } } },
  });
  if (!key || key.revokedAt) {
    res.status(401).json({ error: 'Invalid or revoked API key' });
    return;
  }
  // Throttled lastUsedAt update — failure here shouldn't break the request.
  const last = lastUsedTouchedAt.get(key.id) || 0;
  if (Date.now() - last > TOUCH_INTERVAL_MS) {
    lastUsedTouchedAt.set(key.id, Date.now());
    prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
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
