import { Response, Request } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { issueAdminToken, verifyAdminPassword } from '../utils/adminAuth';
import { COSTS, SUB_PRICE_USD, estimateMusicCost, estimateVideoCost } from '../utils/cost';

// ─── Admin password gate ──────────────────────────────────

export const verifyAdminPanelPassword = async (req: Request, res: Response) => {
  try {
    const password = (req.body?.password as string) || '';
    if (!verifyAdminPassword(password)) {
      // Small jitter so brute-force timing is messier. Real defense is the
      // global rate limiter; this is just belt-and-braces.
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
      res.status(401).json({ error: 'Incorrect admin password' });
      return;
    }
    const token = await issueAdminToken();
    res.json({ token, expiresIn: '12h' });
  } catch (error) {
    logger.error('Admin password verify error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to verify admin password' });
  }
};

// ─── Dashboard (single fat KPI endpoint) ─────────────────

export const getDashboard = async (_req: RequestWithUser, res: Response) => {
  try {
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      userCount,
      newUsers7d,
      newUsers30d,
      agentCount,
      trackCount,
      totalPlays,
      plays7d,
      pendingReports,
      pendingTakedowns,
      // Generations
      musicTotal,
      music30d,
      music24h,
      musicByStatus,
      videoTotal,
      video30d,
      // Subscriptions
      subsByTier,
      // Tips & sync
      tipAgg,
      tipCount,
      syncAgg,
      syncCount,
      channelSubAgg,
      channelSubCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.aiAgent.count(),
      prisma.track.count({ where: { status: 'ACTIVE' } }),
      prisma.play.count(),
      prisma.play.count({ where: { createdAt: { gte: since7 } } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.takedown.count({ where: { status: 'PENDING' } }),
      prisma.musicGeneration.count(),
      prisma.musicGeneration.count({ where: { createdAt: { gte: since30 } } }),
      prisma.musicGeneration.count({ where: { createdAt: { gte: since24h } } }),
      prisma.musicGeneration.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.videoGeneration.count(),
      prisma.videoGeneration.count({ where: { createdAt: { gte: since30 } } }),
      prisma.subscription.groupBy({
        by: ['tier', 'status'],
        _count: { _all: true },
      }),
      prisma.tip.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amountCents: true, platformFeeCents: true },
      }),
      prisma.tip.count({ where: { status: 'SUCCEEDED' } }),
      prisma.syncLicense.aggregate({
        where: { status: 'PAID' },
        _sum: { amountCents: true, platformFeeCents: true },
      }),
      prisma.syncLicense.count({ where: { status: 'PAID' } }),
      prisma.channelSubscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amountCents: true },
      }),
      prisma.channelSubscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Subscription summary: count active by tier and compute MRR.
    const tierCounts: Record<string, number> = { FREE: 0, CREATOR: 0, PREMIUM: 0 };
    const tierActiveCounts: Record<string, number> = { FREE: 0, CREATOR: 0, PREMIUM: 0 };
    let mrrUsd = 0;
    for (const row of subsByTier) {
      tierCounts[row.tier] = (tierCounts[row.tier] || 0) + row._count._all;
      if (row.status === 'ACTIVE') {
        tierActiveCounts[row.tier] = (tierActiveCounts[row.tier] || 0) + row._count._all;
        mrrUsd += (SUB_PRICE_USD[row.tier] || 0) * row._count._all;
      }
    }

    // Cost estimate: count generations by status × pricing per call.
    const completedMusic =
      musicByStatus.find((r) => r.status === 'COMPLETED')?._count._all || 0;
    const failedMusic = musicByStatus.find((r) => r.status === 'FAILED')?._count._all || 0;
    // Even failures cost the upstream call.
    const musicSpend = (completedMusic + failedMusic) * COSTS.perMusic();

    // We don't groupBy video status here; estimate from total minus pending.
    const videoCompleted = await prisma.videoGeneration.count({
      where: { status: { in: ['COMPLETED', 'FAILED'] } },
    });
    const videoSpend = videoCompleted * ((COSTS.perVideo6s() + COSTS.perVideo10s()) / 2);

    const totalSpendUsd = musicSpend + videoSpend;

    // Revenue (cents → USD)
    const tipsRevenueCents = tipAgg._sum.amountCents || 0;
    const tipsPlatformCents = tipAgg._sum.platformFeeCents || 0;
    const syncRevenueCents = syncAgg._sum.amountCents || 0;
    const syncPlatformCents = syncAgg._sum.platformFeeCents || 0;
    const channelSubRevenueCents = channelSubAgg._sum.amountCents || 0;

    const platformRevenueUsd =
      tipsPlatformCents / 100 +
      syncPlatformCents / 100 +
      mrrUsd; // Assume subs flow direct to platform
    const grossPaymentsUsd =
      tipsRevenueCents / 100 + syncRevenueCents / 100 + channelSubRevenueCents / 100 + mrrUsd;

    res.json({
      users: {
        total: userCount,
        new7d: newUsers7d,
        new30d: newUsers30d,
      },
      content: {
        agents: agentCount,
        tracks: trackCount,
        totalPlays,
        plays7d,
      },
      generations: {
        musicTotal,
        music30d,
        music24h,
        musicCompleted: completedMusic,
        musicFailed: failedMusic,
        videoTotal,
        video30d,
      },
      subscriptions: {
        byTier: tierCounts,
        active: tierActiveCounts,
        mrrUsd: Number(mrrUsd.toFixed(2)),
        arrUsd: Number((mrrUsd * 12).toFixed(2)),
      },
      revenue: {
        platformRevenueUsd: Number(platformRevenueUsd.toFixed(2)),
        grossPaymentsUsd: Number(grossPaymentsUsd.toFixed(2)),
        tipsCount: tipCount,
        tipsGrossUsd: Number((tipsRevenueCents / 100).toFixed(2)),
        tipsFeeUsd: Number((tipsPlatformCents / 100).toFixed(2)),
        syncCount,
        syncGrossUsd: Number((syncRevenueCents / 100).toFixed(2)),
        syncFeeUsd: Number((syncPlatformCents / 100).toFixed(2)),
        channelSubCount,
        channelSubGrossUsd: Number((channelSubRevenueCents / 100).toFixed(2)),
      },
      costs: {
        totalSpendUsd: Number(totalSpendUsd.toFixed(2)),
        musicSpendUsd: Number(musicSpend.toFixed(2)),
        videoSpendUsd: Number(videoSpend.toFixed(2)),
        perMusicUsd: COSTS.perMusic(),
        perVideo6sUsd: COSTS.perVideo6s(),
      },
      moderation: {
        pendingReports,
        pendingTakedowns,
      },
      pricing: SUB_PRICE_USD,
    });
  } catch (error) {
    logger.error('Admin dashboard error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

// ─── Stats (legacy, kept for backwards compatibility) ─────

export const getStats = async (_req: RequestWithUser, res: Response) => {
  try {
    const [users, agents, tracks, plays, premiumSubs] = await Promise.all([
      prisma.user.count(),
      prisma.aiAgent.count(),
      prisma.track.count({ where: { status: 'ACTIVE' } }),
      prisma.play.count(),
      prisma.subscription.count({ where: { tier: 'PREMIUM', status: 'ACTIVE' } }),
    ]);

    res.json({ stats: { users, agents, tracks, plays, premiumSubs } });
  } catch (error) {
    logger.error('Admin stats error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ─── Users ────────────────────────────────────────────────

export const listUsers = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 25), 100);
    const search = req.query.search as string | undefined;
    const sort = (req.query.sort as string) || 'recent';
    const tier = req.query.tier as string | undefined;
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && ['LISTENER', 'AGENT_OWNER', 'ADMIN'].includes(role)) {
      where.role = role;
    }
    if (tier && ['FREE', 'CREATOR', 'PREMIUM'].includes(tier)) {
      where.subscription = tier === 'FREE' ? { is: null } : { tier };
    }

    const orderBy: any =
      sort === 'name'
        ? { username: 'asc' }
        : { createdAt: 'desc' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          avatar: true,
          createdAt: true,
          emailVerified: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              currentPeriodEnd: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              agents: true,
              likes: true,
              playlists: true,
              plays: true,
              musicGenerations: true,
              videoGenerations: true,
              tipsReceived: true,
              tipsSent: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Decorate with cost + revenue per user. We do a single grouped query for
    // each so this stays O(1) regardless of page size.
    const userIds = users.map((u) => u.id);

    const [tipRevenueByUser, musicByUser, videoByUser] = userIds.length
      ? await Promise.all([
          prisma.tip.groupBy({
            by: ['toUserId'],
            where: { toUserId: { in: userIds }, status: 'SUCCEEDED' },
            _sum: { amountCents: true, netCents: true },
          }),
          prisma.musicGeneration.groupBy({
            by: ['userId', 'status'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
          }),
          prisma.videoGeneration.groupBy({
            by: ['userId', 'status'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
          }),
        ])
      : [[], [], []];

    const tipsMap = new Map<string, { gross: number; net: number }>();
    for (const t of tipRevenueByUser) {
      tipsMap.set(t.toUserId, {
        gross: (t._sum.amountCents || 0) / 100,
        net: (t._sum.netCents || 0) / 100,
      });
    }

    const musicCostMap = new Map<string, { music: number; cost: number }>();
    for (const m of musicByUser) {
      const isBilled = m.status === 'COMPLETED' || m.status === 'FAILED';
      const cur = musicCostMap.get(m.userId) || { music: 0, cost: 0 };
      cur.music += m._count._all;
      if (isBilled) cur.cost += m._count._all * COSTS.perMusic();
      musicCostMap.set(m.userId, cur);
    }
    const videoCostMap = new Map<string, { video: number; cost: number }>();
    for (const v of videoByUser) {
      const isBilled = v.status === 'COMPLETED' || v.status === 'FAILED';
      const cur = videoCostMap.get(v.userId) || { video: 0, cost: 0 };
      cur.video += v._count._all;
      if (isBilled) cur.cost += v._count._all * COSTS.perVideo6s();
      videoCostMap.set(v.userId, cur);
    }

    const decorated = users.map((u) => {
      const tier = u.subscription?.tier || 'FREE';
      const subRevenueUsd =
        u.subscription?.status === 'ACTIVE' ? SUB_PRICE_USD[tier] || 0 : 0;
      const tipNet = tipsMap.get(u.id)?.net || 0;
      const tipGross = tipsMap.get(u.id)?.gross || 0;
      const m = musicCostMap.get(u.id) || { music: 0, cost: 0 };
      const v = videoCostMap.get(u.id) || { video: 0, cost: 0 };

      return {
        ...u,
        tier,
        stats: {
          songsGenerated: m.music,
          videosGenerated: v.video,
          totalGenerations: m.music + v.video,
          estCostUsd: Number((m.cost + v.cost).toFixed(2)),
          tipsReceivedUsd: Number(tipGross.toFixed(2)),
          tipsReceivedNetUsd: Number(tipNet.toFixed(2)),
          monthlyRevenueUsd: subRevenueUsd,
        },
      };
    });

    res.json({ users: decorated, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('Admin list users error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list users' });
  }
};

export const getUserDetail = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        connectAccount: true,
        agents: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true,
            status: true,
            totalPlays: true,
            followerCount: true,
            createdAt: true,
            _count: { select: { tracks: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            playlists: true,
            likes: true,
            follows: true,
            plays: true,
            tipsReceived: true,
            tipsSent: true,
          },
        },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [music, video, tipReceived, tipSent, syncReceived, channelSubsAsCreator] =
      await Promise.all([
        prisma.musicGeneration.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            title: true,
            status: true,
            providerModel: true,
            durationSec: true,
            createdAt: true,
            audioUrl: true,
            errorMessage: true,
            track: { select: { id: true, slug: true, title: true } },
          },
        }),
        prisma.videoGeneration.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            title: true,
            status: true,
            resolution: true,
            durationSec: true,
            createdAt: true,
            videoUrl: true,
          },
        }),
        prisma.tip.aggregate({
          where: { toUserId: id, status: 'SUCCEEDED' },
          _sum: { amountCents: true, netCents: true, platformFeeCents: true },
          _count: { _all: true },
        }),
        prisma.tip.aggregate({
          where: { fromUserId: id, status: 'SUCCEEDED' },
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
        prisma.syncLicense.aggregate({
          where: { track: { agent: { ownerId: id } }, status: 'PAID' },
          _sum: { amountCents: true, netCents: true },
          _count: { _all: true },
        }),
        prisma.channelSubscription.aggregate({
          where: { creatorUserId: id, status: 'ACTIVE' },
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
      ]);

    const musicCount = await prisma.musicGeneration.groupBy({
      by: ['status'],
      where: { userId: id },
      _count: { _all: true },
    });
    const videoCount = await prisma.videoGeneration.groupBy({
      by: ['status'],
      where: { userId: id },
      _count: { _all: true },
    });

    const billableMusic = musicCount
      .filter((r) => r.status === 'COMPLETED' || r.status === 'FAILED')
      .reduce((acc, r) => acc + r._count._all, 0);
    const billableVideo = videoCount
      .filter((r) => r.status === 'COMPLETED' || r.status === 'FAILED')
      .reduce((acc, r) => acc + r._count._all, 0);

    const totalMusic = musicCount.reduce((acc, r) => acc + r._count._all, 0);
    const totalVideo = videoCount.reduce((acc, r) => acc + r._count._all, 0);

    const estCostUsd =
      billableMusic * COSTS.perMusic() + billableVideo * COSTS.perVideo6s();

    const tier = user.subscription?.tier || 'FREE';
    const monthlyRevenueUsd =
      user.subscription?.status === 'ACTIVE' ? SUB_PRICE_USD[tier] || 0 : 0;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        subscription: user.subscription,
        connectAccount: user.connectAccount,
        agents: user.agents,
        counts: user._count,
      },
      stats: {
        tier,
        monthlyRevenueUsd,
        estCostUsd: Number(estCostUsd.toFixed(2)),
        music: {
          total: totalMusic,
          byStatus: Object.fromEntries(musicCount.map((r) => [r.status, r._count._all])),
        },
        video: {
          total: totalVideo,
          byStatus: Object.fromEntries(videoCount.map((r) => [r.status, r._count._all])),
        },
        tipsReceived: {
          count: tipReceived._count._all,
          grossUsd: (tipReceived._sum.amountCents || 0) / 100,
          netUsd: (tipReceived._sum.netCents || 0) / 100,
          platformFeeUsd: (tipReceived._sum.platformFeeCents || 0) / 100,
        },
        tipsSent: {
          count: tipSent._count._all,
          grossUsd: (tipSent._sum.amountCents || 0) / 100,
        },
        syncSold: {
          count: syncReceived._count._all,
          grossUsd: (syncReceived._sum.amountCents || 0) / 100,
          netUsd: (syncReceived._sum.netCents || 0) / 100,
        },
        channelSubscribers: {
          count: channelSubsAsCreator._count._all,
          monthlyGrossUsd: (channelSubsAsCreator._sum.amountCents || 0) / 100,
        },
      },
      recentMusic: music,
      recentVideo: video,
    });
  } catch (error) {
    logger.error('Admin user detail error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load user' });
  }
};

export const updateUserRole = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['LISTENER', 'AGENT_OWNER', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, username: true, role: true },
    });

    res.json({ user });
  } catch (error) {
    logger.error('Update user role error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const manageAgent = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const agent = await prisma.aiAgent.update({
      where: { id },
      data: { status },
      include: { owner: { select: { id: true, username: true } } },
    });

    res.json({ agent });
  } catch (error) {
    logger.error('Manage agent error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to manage agent' });
  }
};

export const manageTrack = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['ACTIVE', 'REMOVED', 'FLAGGED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const track = await prisma.track.update({ where: { id }, data: { status } });
    res.json({ track });
  } catch (error) {
    logger.error('Manage track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to manage track' });
  }
};

export const getReports = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status && ['PENDING', 'RESOLVED', 'DISMISSED'].includes(status)) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          track: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({ reports, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('Get reports error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get reports' });
  }
};

export const resolveReport = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;

    const report = await prisma.report.update({
      where: { id },
      data: { status, notes },
    });

    res.json({ report });
  } catch (error) {
    logger.error('Resolve report error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

// ─── Generations feed ────────────────────────────────────

export const listGenerations = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 25), 100);
    const status = req.query.status as string | undefined;
    const kind = (req.query.kind as string) || 'music';

    const where: any = {};
    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      where.status = status;
    }

    if (kind === 'video') {
      const [items, total] = await Promise.all([
        prisma.videoGeneration.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: { id: true, username: true, email: true, displayName: true, avatar: true },
            },
          },
        }),
        prisma.videoGeneration.count({ where }),
      ]);
      const decorated = items.map((g) => ({
        ...g,
        estCostUsd: Number(estimateVideoCost(g).toFixed(3)),
      }));
      res.json({ kind: 'video', items: decorated, total, page, totalPages: Math.ceil(total / limit) });
      return;
    }

    const [items, total] = await Promise.all([
      prisma.musicGeneration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, username: true, email: true, displayName: true, avatar: true },
          },
          agent: { select: { id: true, name: true, slug: true, avatar: true } },
          track: { select: { id: true, slug: true, title: true } },
        },
      }),
      prisma.musicGeneration.count({ where }),
    ]);
    const decorated = items.map((g) => ({
      ...g,
      estCostUsd: Number(estimateMusicCost(g).toFixed(3)),
    }));
    res.json({ kind: 'music', items: decorated, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('Admin list generations error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list generations' });
  }
};

// ─── Revenue / subscription detail ───────────────────────

export const getRevenue = async (_req: RequestWithUser, res: Response) => {
  try {
    const [subs, recentTips, recentSync, recentSubs] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, username: true, email: true, avatar: true } },
        },
      }),
      prisma.tip.findMany({
        where: { status: 'SUCCEEDED' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          fromUser: { select: { id: true, username: true } },
          toUser: { select: { id: true, username: true } },
        },
      }),
      prisma.syncLicense.findMany({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          buyer: { select: { id: true, username: true } },
          track: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.channelSubscription.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          subscriber: { select: { id: true, username: true } },
          creator: { select: { id: true, username: true } },
          playlist: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);

    const tierBreakdown: Record<'FREE' | 'CREATOR' | 'PREMIUM', { count: number; mrrUsd: number }> = {
      FREE: { count: 0, mrrUsd: 0 },
      CREATOR: { count: 0, mrrUsd: 0 },
      PREMIUM: { count: 0, mrrUsd: 0 },
    };
    for (const s of subs) {
      const bucket = tierBreakdown[s.tier];
      if (!bucket) continue;
      bucket.count += 1;
      bucket.mrrUsd += SUB_PRICE_USD[s.tier] || 0;
    }
    (Object.keys(tierBreakdown) as Array<keyof typeof tierBreakdown>).forEach((k) => {
      tierBreakdown[k].mrrUsd = Number(tierBreakdown[k].mrrUsd.toFixed(2));
    });

    res.json({
      pricing: SUB_PRICE_USD,
      tierBreakdown,
      activeSubscriptions: subs,
      recentTips,
      recentSync,
      recentChannelSubs: recentSubs,
    });
  } catch (error) {
    logger.error('Admin revenue error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load revenue' });
  }
};
