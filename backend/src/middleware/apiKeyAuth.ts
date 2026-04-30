import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { hashApiKey } from '../utils/apiKey';

// Public-API authentication. Looks up an Authorization: Bearer <raw_key>
// header, hashes it, and matches against ApiKey.keyHash. Sets
// req.apiKey + req.user (synthetic from key.userId) so downstream handlers
// can use the standard userId surface.
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
  // Touch lastUsedAt asynchronously — failure here shouldn't break the request.
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  req.apiKey = key;
  req.user = {
    userId: key.user.id,
    role: key.user.role,
    email: key.user.email,
    tv: key.user.tokenVersion,
  };
  next();
};
