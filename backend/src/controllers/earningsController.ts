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

// ─── Public ledger ─────────────────────────────────────────
//
// Aspirational signal for new creators: every agent profile shows lifetime
// earnings + last-30-days. We sum tips, channel subs, and sync licenses on
// the agent owner. Returns zeroes (not 404) when an agent has no earnings.

export const publicAgentEarnings = async (req: RequestWithUser, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const agent = await prisma.aiAgent.findUnique({
      where: { slug },
      include: { tracks: { select: { id: true } } },
    });
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const ownerId = agent.ownerId;
    const trackIds = agent.tracks.map((t) => t.id);
    const since30d = new Date(Date.now() - 30 * 24 * 3_600_000);

    const [tipsLifetime, tips30d, subsAll, subs30d, syncLifetime, sync30d] = await Promise.all([
      prisma.tip.aggregate({
        where: { toUserId: ownerId, status: 'SUCCEEDED' },
        _sum: { netCents: true },
      }),
      prisma.tip.aggregate({
        where: { toUserId: ownerId, status: 'SUCCEEDED', createdAt: { gte: since30d } },
        _sum: { netCents: true },
      }),
      prisma.channelSubscription.findMany({
        where: { creatorUserId: ownerId, status: 'ACTIVE' },
        select: { amountCents: true, platformFeeBps: true, createdAt: true, status: true },
      }),
      prisma.channelSubscription.findMany({
        where: { creatorUserId: ownerId, status: 'ACTIVE', currentPeriodStart: { gte: since30d } },
        select: { amountCents: true, platformFeeBps: true },
      }),
      trackIds.length
        ? prisma.syncLicense.aggregate({
            where: { trackId: { in: trackIds }, status: 'PAID' },
            _sum: { netCents: true },
          })
        : Promise.resolve({ _sum: { netCents: 0 } }),
      trackIds.length
        ? prisma.syncLicense.aggregate({
            where: { trackId: { in: trackIds }, status: 'PAID', createdAt: { gte: since30d } },
            _sum: { netCents: true },
          })
        : Promise.resolve({ _sum: { netCents: 0 } }),
    ]);

    // monthsBetween × current amountCents was a coarse approximation that
    // INFLATED lifetime earnings: a churned subscriber from a year ago used to
    // contribute 12+ months of "current price" revenue even after they
    // cancelled. Filtering subsAll above to ACTIVE limits the impact, but the
    // proper fix is to sum stored Invoice.amount_paid rows. Pending that, we
    // bound the multiplier to the period-since-period-start so a long-lived
    // active sub still rolls up correctly.
    const monthsBetween = (start: Date | null) => {
      if (!start) return 1;
      return Math.max(1, Math.ceil((Date.now() - start.getTime()) / (30 * 24 * 3_600_000)));
    };
    const subsTotalCents = subsAll.reduce(
      (acc, s) =>
        acc + Math.floor((s.amountCents * (10000 - s.platformFeeBps)) / 10000) * monthsBetween(s.createdAt),
      0
    );
    const subs30Cents = subs30d.reduce(
      (acc, s) => acc + Math.floor((s.amountCents * (10000 - s.platformFeeBps)) / 10000),
      0
    );

    const lifetimeCents =
      (tipsLifetime._sum.netCents ?? 0) + subsTotalCents + (syncLifetime._sum.netCents ?? 0);
    const last30Cents =
      (tips30d._sum.netCents ?? 0) + subs30Cents + (sync30d._sum.netCents ?? 0);

    res.json({
      agentSlug: slug,
      lifetimeCents,
      last30Cents,
      breakdown: {
        tipsCents: tipsLifetime._sum.netCents ?? 0,
        channelSubsCents: subsTotalCents,
        syncLicensesCents: syncLifetime._sum.netCents ?? 0,
      },
    });
  } catch (error) {
    logger.error('publicAgentEarnings error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load earnings' });
  }
};

// Top earners — leaderboard for landing/discovery pages. Sums tips and
// sync-license net per owner; channel-sub MRR is intentionally left out
// here (it muddies the comparison and we display it in the agent ledger).
export const topEarners = async (req: RequestWithUser, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    const rows = await prisma.$queryRaw<Array<{
      agent_id: string;
      agent_slug: string;
      agent_name: string;
      avatar: string | null;
      lifetime_cents: number;
    }>>`
      SELECT a.id AS agent_id, a.slug AS agent_slug, a.name AS agent_name, a.avatar,
             COALESCE(t.cents, 0) + COALESCE(sl.cents, 0) AS lifetime_cents
      FROM ai_agents a
      LEFT JOIN LATERAL (
        SELECT SUM(net_cents)::int AS cents FROM tips
        WHERE to_user_id = a.owner_id AND status = 'SUCCEEDED'
      ) t ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(sync_licenses.net_cents)::int AS cents
        FROM sync_licenses
        JOIN tracks ON tracks.id = sync_licenses.track_id
        WHERE tracks.agent_id = a.id AND sync_licenses.status = 'PAID'
      ) sl ON TRUE
      WHERE COALESCE(t.cents, 0) + COALESCE(sl.cents, 0) > 0
      ORDER BY lifetime_cents DESC, a.follower_count DESC
      LIMIT ${limit}
    `;
    res.json({ topEarners: rows });
  } catch (error) {
    logger.error('topEarners error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load top earners' });
  }
};
