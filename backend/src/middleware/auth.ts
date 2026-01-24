import { Response, NextFunction } from 'express';
import { RequestWithUser, UserRole } from '../types';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate = (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.length === 0) {
      return res.status(401).json({ error: 'Authentication required' });
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
    return res.status(401).json({ error: 'Authentication required' });
  }
};

export const requireAdmin = (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
