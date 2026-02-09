import { Response, NextFunction } from 'express';
import { RequestWithUser, UserRole } from '../types';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate = (req: RequestWithUser, res: Response, next: NextFunction) => {
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

    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
      sessionId: decoded.sessionId,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
};

export const optionalAuth = (req: RequestWithUser, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role as UserRole,
          sessionId: decoded.sessionId,
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
