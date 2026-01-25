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
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
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

// Require ADMIN or MASTERMIND role
export const requireAdminOrMastermind = (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'MASTERMIND') {
    res.status(403).json({ error: 'Admin or Mastermind access required' });
    return;
  }

  next();
};
