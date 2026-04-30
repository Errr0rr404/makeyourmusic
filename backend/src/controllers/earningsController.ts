import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

/**
 * Aggregates the creator's earnings across tips and channel subscriptions.
 * Numbers are NET (after platform fee). Period defaults to all-time + month.
 */
export const getCreatorEarningsSummary = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const userId = req.user.userId;

    const monthStart = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      1
    ));

    const [
      tipsLifetime,
      tipsThisMonth,
      activeSubs,
      recentTips,
      connect,
    ] = await Promise.all([
      prisma.tip.aggregate({
        _sum: { netCents: true },
        _count: { _all: true },
        where: { toUserId: userId, status: 'SUCCEEDED' },
      }),
      prisma.tip.aggregate({
        _sum: { netCents: true },
        _count: { _all: true },
        where: { toUserId: userId, status: 'SUCCEEDED', createdAt: { gte: monthStart } },
      }),
      prisma.channelSubscription.findMany({
        where: { creatorUserId: userId, status: 'ACTIVE' },
        select: { amountCents: true, platformFeeBps: true, playlistId: true },
      }),
      prisma.tip.findMany({
        where: { toUserId: userId, status: 'SUCCEEDED' },
        include: {
          fromUser: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.connectAccount.findUnique({ where: { userId } }),
    ]);

    const mrrNetCents = activeSubs.reduce(
      (sum, s) => sum + Math.floor((s.amountCents * (10000 - s.platformFeeBps)) / 10000),
      0
    );

    res.json({
      canMonetize: Boolean(connect && connect.status === 'ACTIVE' && connect.payoutsEnabled),
      connectStatus: connect?.status || null,
      lifetime: {
        tipsNetCents: tipsLifetime._sum.netCents || 0,
        tipsCount: tipsLifetime._count._all,
      },
      thisMonth: {
        tipsNetCents: tipsThisMonth._sum.netCents || 0,
        tipsCount: tipsThisMonth._count._all,
      },
      activeSubscribers: activeSubs.length,
      monthlyRecurringNetCents: mrrNetCents,
      recentTips,
    });
  } catch (error) {
    logger.error('Get creator earnings summary error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get earnings summary' });
  }
};
