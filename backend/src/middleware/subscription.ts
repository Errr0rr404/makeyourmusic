import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import logger from '../utils/logger';

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

    // Both CREATOR ($3.99) and PREMIUM (higher tier) unlock paid features.
    // CREATOR is the lead tier per the platform's pricing, so gating on
    // `tier === 'PREMIUM'` would lock out the majority of paying users.
    const isPaid =
      subscription &&
      subscription.status === 'ACTIVE' &&
      (subscription.tier === 'PREMIUM' || subscription.tier === 'CREATOR');
    if (!isPaid) {
      res.status(403).json({
        error: 'Paid subscription required',
        upgradeUrl: '/library?upgrade=true',
      });
      return;
    }

    next();
  } catch (err) {
    logger.error('requirePremium check failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

// Strict PREMIUM-only check for tier-specific features (above CREATOR).
export const requirePremiumOnly = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user.userId } });
    if (!sub || sub.tier !== 'PREMIUM' || sub.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Premium subscription required' });
      return;
    }
    next();
  } catch (err) {
    logger.error('requirePremiumOnly check failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};
