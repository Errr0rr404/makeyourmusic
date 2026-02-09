import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';

export const requirePremium = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admins bypass premium check
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });

    if (!subscription || subscription.tier !== 'PREMIUM' || subscription.status !== 'ACTIVE') {
      res.status(403).json({
        error: 'Premium subscription required',
        upgradeUrl: '/library?upgrade=true',
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};
