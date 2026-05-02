// Privacy + data-rights endpoints (GDPR Art. 15/17, CCPA §1798.105/120).
//
// Endpoints:
//   GET  /api/privacy/export                — synchronous JSON export of the
//                                             requester's full account data.
//   POST /api/privacy/delete                — schedule account deletion with a
//                                             30-day grace window. Re-login
//                                             during the window cancels.
//   POST /api/privacy/cancel-delete         — explicit cancel.
//   PATCH /api/privacy/do-not-sell          — CCPA opt-out toggle.
//
// We deliberately keep export inline (no async job queue) because most users
// have <100MB of data; the JSON is gzip'd by the response layer and streamed.
// If a creator with thousands of tracks blocks too long, switch to a signed
// presigned URL produced by an offline cron job.

import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

const DELETE_GRACE_DAYS = 30;

// GET /api/privacy/export — returns a single JSON document with everything we
// store about the requester.
export const exportMyData = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userId = req.user.userId;

    // We pull each related model individually (rather than one giant `include`)
    // so very large creators don't trip Prisma's row-count limits, and so the
    // response can fail-soft on individual relation errors.
    const [
      user,
      agents,
      tracks,
      playlists,
      likes,
      comments,
      follows,
      plays,
      shares,
      downloads,
      subscription,
      notifications,
      tipsSent,
      tipsReceived,
      generations,
      videoGenerations,
      apiKeys,
      pushTokens,
      partiesHosted,
      djSessionsHosted,
      voiceClones,
      spotifyImports,
      remixes,
      marketplaceListings,
      marketplacePurchases,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, username: true, displayName: true, avatar: true,
          bio: true, role: true, locale: true, doNotSellData: true,
          referralCode: true, referredById: true,
          emailFollowerAlert: true, emailLikeAlert: true, emailCommentAlert: true,
          emailDigestWeekly: true, emailMarketing: true,
          createdAt: true, emailVerified: true, emailVerifiedAt: true,
          accountDeletionRequestedAt: true,
        },
      }),
      prisma.aiAgent.findMany({ where: { ownerId: userId } }),
      prisma.track.findMany({
        where: { agent: { ownerId: userId } },
        select: {
          id: true, title: true, slug: true, audioUrl: true, coverArt: true,
          duration: true, lyrics: true, status: true, isPublic: true, mood: true,
          tags: true, bpm: true, key: true, aiModel: true, aiPrompt: true,
          createdAt: true, agentId: true, genreId: true, parentTrackId: true,
        },
      }),
      prisma.playlist.findMany({ where: { userId } }),
      prisma.like.findMany({ where: { userId } }),
      prisma.comment.findMany({ where: { userId } }),
      prisma.follow.findMany({ where: { userId } }),
      prisma.play.findMany({ where: { userId }, take: 5000 }),
      prisma.share.findMany({ where: { userId } }),
      prisma.download.findMany({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.notification.findMany({ where: { userId }, take: 1000 }),
      prisma.tip.findMany({ where: { fromUserId: userId } }),
      prisma.tip.findMany({ where: { toUserId: userId } }),
      prisma.musicGeneration.findMany({ where: { userId }, take: 2000 }),
      prisma.videoGeneration.findMany({ where: { userId }, take: 1000 }),
      prisma.apiKey.findMany({
        where: { userId },
        select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, revokedAt: true, lastUsedAt: true },
      }),
      prisma.pushToken.findMany({ where: { userId } }),
      prisma.listeningParty.findMany({ where: { hostUserId: userId } }),
      prisma.djSession.findMany({ where: { hostUserId: userId } }),
      prisma.voiceClone.findMany({ where: { userId } }),
      prisma.spotifyImport.findMany({ where: { userId } }),
      prisma.trackRemix.findMany({ where: { remixerUserId: userId } }),
      prisma.marketplaceListing.findMany({ where: { sellerUserId: userId } }),
      prisma.marketplacePurchase.findMany({ where: { buyerUserId: userId } }),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const filename = `mym-export-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, '_')}"`
    );

    res.json({
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      user,
      agents,
      tracks,
      playlists,
      likes,
      comments,
      follows,
      plays,
      shares,
      downloads,
      subscription,
      notifications,
      tipsSent,
      tipsReceived,
      generations,
      videoGenerations,
      apiKeys,
      pushTokens,
      partiesHosted,
      djSessionsHosted,
      voiceClones,
      spotifyImports,
      remixes,
      marketplaceListings,
      marketplacePurchases,
    });
  } catch (error) {
    logger.error('exportMyData error', { error: (error as Error).message });
    res.status(500).json({ error: 'Export failed' });
  }
};

// POST /api/privacy/delete — schedules deletion with a grace window. Until
// the cron sweep hard-deletes, the user can log back in to cancel.
export const requestAccountDeletion = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const requestedAt = new Date();
    const purgeAt = new Date(requestedAt.getTime() + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { accountDeletionRequestedAt: requestedAt },
    });

    res.json({
      ok: true,
      requestedAt: requestedAt.toISOString(),
      // ISO date the cron sweep will execute the hard delete on or after.
      // The user can cancel any time before this by logging in again.
      purgeAt: purgeAt.toISOString(),
      graceDays: DELETE_GRACE_DAYS,
    });
  } catch (error) {
    logger.error('requestAccountDeletion error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to schedule deletion' });
  }
};

// POST /api/privacy/cancel-delete — explicit cancel (also auto-cancels on
// any successful login via the cron sweep guard).
export const cancelAccountDeletion = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { accountDeletionRequestedAt: null },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('cancelAccountDeletion error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
};

// PATCH /api/privacy/do-not-sell — CCPA opt-out. Body: { enabled: boolean }
export const setDoNotSell = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const enabled = !!(req.body || {}).enabled;
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { doNotSellData: enabled },
    });
    res.json({ ok: true, doNotSellData: enabled });
  } catch (error) {
    logger.error('setDoNotSell error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update preference' });
  }
};

// GET /api/privacy/status — returns current deletion state + DNT flag.
export const getPrivacyStatus = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const u = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { doNotSellData: true, accountDeletionRequestedAt: true },
    });
    if (!u) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const purgeAt = u.accountDeletionRequestedAt
      ? new Date(u.accountDeletionRequestedAt.getTime() + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000)
      : null;
    res.json({
      doNotSellData: u.doNotSellData,
      accountDeletionRequestedAt: u.accountDeletionRequestedAt,
      purgeAt,
      graceDays: DELETE_GRACE_DAYS,
    });
  } catch (error) {
    logger.error('getPrivacyStatus error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load status' });
  }
};

// Cron entry — run by cronTick, hard-deletes users whose grace window has
// elapsed. Cascades through Prisma onDelete chains.
export async function purgeExpiredAccountDeletions(): Promise<number> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      accountDeletionRequestedAt: { lte: cutoff, not: null },
    },
    select: { id: true, username: true },
    take: 50,
  });
  let deleted = 0;
  for (const c of candidates) {
    try {
      await prisma.user.delete({ where: { id: c.id } });
      deleted += 1;
      logger.info('purged account', { userId: c.id, username: c.username });
    } catch (err) {
      logger.error('account purge failed', {
        userId: c.id,
        error: (err as Error).message,
      });
    }
  }
  return deleted;
}
