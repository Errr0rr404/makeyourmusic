import { Response, NextFunction } from 'express';
import { RequestWithUser, UserRole } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/db';

// Tiny per-process LRU cache of (userId -> tokenVersion) so we can verify
// `tv` against the DB without a per-request hit. 60s TTL is short enough
// that logout/password-reset propagates quickly across processes.
const TV_TTL_MS = 60_000;
const TV_MAX = 5_000;
const tvCache = new Map<string, { tv: number; expiresAt: number }>();

async function getCurrentTokenVersion(userId: string): Promise<number | null> {
  const cached = tvCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.tv;
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!u) return null;
    if (tvCache.size >= TV_MAX) {
      // Cheap LRU-ish eviction: drop oldest entry.
      const firstKey = tvCache.keys().next().value;
      if (firstKey) tvCache.delete(firstKey);
    }
    tvCache.set(userId, { tv: u.tokenVersion, expiresAt: now + TV_TTL_MS });
    return u.tokenVersion;
  } catch {
    return null;
  }
}

export function invalidateTokenVersionCache(userId: string): void {
  tvCache.delete(userId);
}

export const authenticate = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);

    if (!token || token.length === 0) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = await verifyAccessToken(token);

    // Compare token version. Without this, logout / password change leaves
    // the access token valid until JWT expiry (15 min). The cache softens
    // the per-request DB cost.
    if (typeof decoded.tv === 'number') {
      const currentTv = await getCurrentTokenVersion(decoded.userId);
      if (currentTv === null || currentTv !== decoded.tv) {
        res.status(401).json({ error: 'Token revoked' });
        return;
      }
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
      sessionId: decoded.sessionId,
      tv: decoded.tv,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
};

export const optionalAuth = async (req: RequestWithUser, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        const decoded = await verifyAccessToken(token);
        if (typeof decoded.tv === 'number') {
          const currentTv = await getCurrentTokenVersion(decoded.userId);
          if (currentTv === null || currentTv !== decoded.tv) {
            // Stale token — treat as unauthenticated, don't 401 for optional
            // auth.
            next();
            return;
          }
        }
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role as UserRole,
          sessionId: decoded.sessionId,
          tv: decoded.tv,
        };
      }
    }
  } catch {
    // Not authenticated, that's fine
  }
  next();
};

export const requireAdmin = (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const requireAgentOwner = (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'AGENT_OWNER' && req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Agent owner access required' });
    return;
  }
  next();
};
