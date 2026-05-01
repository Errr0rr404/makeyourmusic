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

// Sentinel returned when the DB lookup itself failed (vs. user not found).
// Lets callers distinguish "user genuinely doesn't exist" from "transient DB
// error" so authenticate / optionalAuth can apply consistent semantics.
const TV_DB_ERROR = Symbol('tv_db_error');
type TvResult = number | null | typeof TV_DB_ERROR;

async function getCurrentTokenVersion(userId: string): Promise<TvResult> {
  const cached = tvCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    // Bump on access for true LRU ordering — Map preserves insertion order,
    // so re-inserting moves the key to the end and shields hot keys from
    // eviction.
    tvCache.delete(userId);
    tvCache.set(userId, cached);
    return cached.tv;
  }
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!u) return null;
    if (tvCache.size >= TV_MAX) {
      // True LRU: drop the oldest entry (Map iteration order = insertion).
      const firstKey = tvCache.keys().next().value;
      if (firstKey) tvCache.delete(firstKey);
    }
    tvCache.set(userId, { tv: u.tokenVersion, expiresAt: now + TV_TTL_MS });
    return u.tokenVersion;
  } catch {
    return TV_DB_ERROR;
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
      if (currentTv === TV_DB_ERROR) {
        // DB unreachable. Fail closed to match the rest of authenticate.
        res.status(503).json({ error: 'Authentication service unavailable' });
        return;
      }
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
        if (typeof decoded.tv !== 'number') {
          next();
          return;
        }
        const currentTv = await getCurrentTokenVersion(decoded.userId);
        // For optionalAuth, both "user not found" and "DB error" should leave
        // the request unauthenticated. The previous version conflated the two
        // by returning null in both cases; with the new sentinel the policy
        // is now explicit and matched here.
        if (currentTv === TV_DB_ERROR || currentTv === null || currentTv !== decoded.tv) {
          next();
          return;
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
