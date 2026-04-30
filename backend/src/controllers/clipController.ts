import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { createNotification } from '../utils/notifications';
import {
  buildClipUrl,
  buildClipThumbnailUrl,
  publicIdFromCloudinaryUrl,
  deleteResource,
} from '../utils/cloudinary';
import { ClipVisibility } from '@prisma/client';

// Hard launch cap. Enforced server-side regardless of client.
const MAX_CLIP_DURATION_MS = 60_000;
const MIN_CLIP_DURATION_MS = 1_000;

const VALID_SHARE_PLATFORMS = ['copy', 'twitter', 'facebook', 'whatsapp', 'telegram', 'email', 'tiktok', 'instagram', 'reddit', 'other'];

const VALID_VISIBILITIES = new Set<ClipVisibility>(['PRIVATE', 'PUBLIC', 'UNLISTED']);

// ─── Create ──────────────────────────────────────────────

export const createClip = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const {
      trackId,
      rawVideoUrl,
      rawPublicId,
      trimStartMs,
      trimEndMs,
      audioStartMs = 0,
      visibility = 'PRIVATE',
      caption,
      hashtags,
    } = req.body || {};

    // Validate required fields
    if (typeof trackId !== 'string' || !trackId) {
      res.status(400).json({ error: 'trackId is required' });
      return;
    }
    if (typeof rawVideoUrl !== 'string' || !rawVideoUrl.startsWith('http')) {
      res.status(400).json({ error: 'rawVideoUrl must be a Cloudinary URL' });
      return;
    }
    if (typeof rawPublicId !== 'string' || !rawPublicId) {
      res.status(400).json({ error: 'rawPublicId is required' });
      return;
    }
    const start = Number(trimStartMs);
    const end = Number(trimEndMs);
    const audioOffset = Number(audioStartMs);
    if (!Number.isFinite(start) || start < 0) {
      res.status(400).json({ error: 'trimStartMs must be ≥ 0' });
      return;
    }
    if (!Number.isFinite(end) || end <= start) {
      res.status(400).json({ error: 'trimEndMs must be greater than trimStartMs' });
      return;
    }
    const duration = end - start;
    if (duration < MIN_CLIP_DURATION_MS) {
      res.status(400).json({ error: 'Clip must be at least 1 second' });
      return;
    }
    if (duration > MAX_CLIP_DURATION_MS) {
      res.status(400).json({ error: 'Clip cannot exceed 60 seconds' });
      return;
    }
    if (!Number.isFinite(audioOffset) || audioOffset < 0) {
      res.status(400).json({ error: 'audioStartMs must be ≥ 0' });
      return;
    }
    if (!VALID_VISIBILITIES.has(visibility)) {
      res.status(400).json({ error: 'visibility must be PRIVATE, PUBLIC, or UNLISTED' });
      return;
    }
    const trimmedCaption = typeof caption === 'string' ? caption.trim().slice(0, 500) : null;
    const cleanHashtags: string[] = Array.isArray(hashtags)
      ? hashtags
          .filter((h): h is string => typeof h === 'string')
          .map((h) => h.trim().replace(/^#/, '').slice(0, 32))
          .filter((h) => h.length > 0)
          .slice(0, 10)
      : [];

    // Verify the track exists and is reachable by this user
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: {
        id: true,
        isPublic: true,
        status: true,
        takedownStatus: true,
        audioUrl: true,
        title: true,
        slug: true,
        agent: { select: { ownerId: true, slug: true, name: true } },
      },
    });
    if (!track || track.status !== 'ACTIVE' || track.takedownStatus) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    const isOwnTrack = track.agent.ownerId === req.user.userId;
    if (!track.isPublic && !isOwnTrack) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    // Derive the audio public_id from the track's audioUrl. If the track
    // audio isn't on Cloudinary (e.g. falling back to a provider URL),
    // we can't mux — refuse rather than write a broken clip.
    const audioPublicId = publicIdFromCloudinaryUrl(track.audioUrl);
    if (!audioPublicId) {
      res.status(400).json({
        error: 'This track is not yet available for clipping. Please try again later.',
      });
      return;
    }

    // Build the muxed delivery URL + thumbnail. Cloudinary materializes on
    // first hit. Watermark is decided at download time (not stored on the
    // canonical videoUrl).
    const videoUrl = buildClipUrl({
      rawVideoPublicId: rawPublicId,
      audioPublicId,
      trimStartMs: start,
      trimEndMs: end,
      audioStartMs: audioOffset,
      watermark: false,
    });
    const thumbnail = buildClipThumbnailUrl(rawPublicId, start);

    const clip = await prisma.clip.create({
      data: {
        userId: req.user.userId,
        trackId,
        rawVideoUrl,
        rawPublicId,
        videoUrl,
        thumbnail,
        durationMs: duration,
        trimStartMs: start,
        trimEndMs: end,
        audioStartMs: audioOffset,
        visibility,
        caption: trimmedCaption,
        hashtags: cleanHashtags,
        status: 'READY',
      },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverArt: true,
            duration: true,
            agent: { select: { id: true, name: true, slug: true, avatar: true } },
          },
        },
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    res.status(201).json({ clip });
  } catch (error) {
    logger.error('Create clip error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create clip' });
  }
};

// ─── List + feed ─────────────────────────────────────────

export const listClips = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const trackId = typeof req.query.trackId === 'string' ? req.query.trackId : undefined;
    const feed = req.query.feed as string | undefined;
    const viewerId = req.user?.userId;

    // Visibility filter:
    //  - viewing your own profile → all your clips (any visibility)
    //  - admin → all
    //  - everyone else → PUBLIC only (UNLISTED is link-only, never listed)
    let where: any;
    if (userId && (viewerId === userId || req.user?.role === 'ADMIN')) {
      where = { userId, status: 'READY' };
    } else if (userId) {
      where = { userId, status: 'READY', visibility: 'PUBLIC' };
    } else {
      where = { status: 'READY', visibility: 'PUBLIC' };
    }
    if (trackId) where.trackId = trackId;

    const orderBy =
      feed === 'trending'
        ? [{ trendingScore: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const [clips, total] = await Promise.all([
      prisma.clip.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          track: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverArt: true,
              duration: true,
              agent: { select: { id: true, name: true, slug: true, avatar: true } },
            },
          },
          user: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
      prisma.clip.count({ where }),
    ]);

    res.json({
      clips,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List clips error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list clips' });
  }
};

// ─── Get one ─────────────────────────────────────────────

export const getClip = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const viewerId = req.user?.userId;

    const clip = await prisma.clip.findUnique({
      where: { id },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverArt: true,
            audioUrl: true,
            duration: true,
            agent: { select: { id: true, name: true, slug: true, avatar: true } },
          },
        },
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    if (!clip || clip.status === 'REMOVED') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    // Visibility:
    //  - PUBLIC and UNLISTED are accessible to anyone with the URL.
    //  - PRIVATE only to owner / admin.
    if (clip.visibility === 'PRIVATE') {
      const isOwner = viewerId === clip.userId;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
    }

    // Hide flagged clips from non-owners
    if (clip.status === 'FLAGGED' && clip.userId !== viewerId && req.user?.role !== 'ADMIN') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    let liked = false;
    if (viewerId) {
      const l = await prisma.clipLike.findUnique({
        where: { userId_clipId: { userId: viewerId, clipId: clip.id } },
      });
      liked = Boolean(l);
    }

    res.json({ clip, liked });
  } catch (error) {
    logger.error('Get clip error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get clip' });
  }
};

// ─── Update ──────────────────────────────────────────────

export const updateClip = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const id = req.params.id as string;
    const existing = await prisma.clip.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Clip not found' }); return; }
    if (existing.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { caption, visibility, hashtags } = req.body || {};
    const data: any = {};
    if (typeof caption === 'string' || caption === null) {
      data.caption = caption ? caption.trim().slice(0, 500) : null;
    }
    if (visibility) {
      if (!VALID_VISIBILITIES.has(visibility)) {
        res.status(400).json({ error: 'Invalid visibility' });
        return;
      }
      data.visibility = visibility;
    }
    if (Array.isArray(hashtags)) {
      data.hashtags = hashtags
        .filter((h): h is string => typeof h === 'string')
        .map((h) => h.trim().replace(/^#/, '').slice(0, 32))
        .filter((h) => h.length > 0)
        .slice(0, 10);
    }

    const clip = await prisma.clip.update({ where: { id }, data });
    res.json({ clip });
  } catch (error) {
    logger.error('Update clip error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update clip' });
  }
};

// ─── Delete (hard delete + best-effort Cloudinary cleanup) ───────────────

export const deleteClip = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const id = req.params.id as string;
    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip) { res.status(404).json({ error: 'Clip not found' }); return; }
    if (clip.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.clip.delete({ where: { id } });

    // Best-effort cleanup of the raw upload. Failures are logged but not
    // surfaced — the row is gone and the URL is no longer reachable from
    // our app.
    if (clip.rawPublicId) {
      try {
        await deleteResource(clip.rawPublicId, 'video');
      } catch (e) {
        logger.warn('Cloudinary delete failed for clip raw', {
          clipId: clip.id,
          error: (e as Error).message,
        });
      }
    }

    res.json({ message: 'Clip deleted' });
  } catch (error) {
    logger.error('Delete clip error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete clip' });
  }
};

// ─── View tracking ───────────────────────────────────────

const VIEW_DEDUP_WINDOW_MS = 30_000;
const MAX_VIEW_ENTRIES = 5000;
const recentViews = new Map<string, number>();
let viewCleanupScheduled = false;

function cleanupStaleViews(now: number): void {
  if (recentViews.size === 0) return;
  for (const [k, t] of recentViews.entries()) {
    if (now - t > VIEW_DEDUP_WINDOW_MS) recentViews.delete(k);
  }
}

function shouldCountView(key: string): boolean {
  const now = Date.now();
  const last = recentViews.get(key);
  if (last && now - last < VIEW_DEDUP_WINDOW_MS) return false;
  recentViews.set(key, now);
  if (recentViews.size > MAX_VIEW_ENTRIES && !viewCleanupScheduled) {
    viewCleanupScheduled = true;
    setImmediate(() => {
      cleanupStaleViews(Date.now());
      viewCleanupScheduled = false;
    });
  }
  return true;
}

export const incrementClipView = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const clip = await prisma.clip.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, visibility: true },
    });
    if (!clip || clip.status !== 'READY' || clip.visibility === 'PRIVATE') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    const viewerKey = req.user?.userId || req.ip || 'anon';
    if (clip.userId === req.user?.userId) {
      // Don't pump view counts on your own clip
      res.json({ counted: false });
      return;
    }
    const counted = shouldCountView(`${clip.id}:${viewerKey}`);
    if (counted) {
      await prisma.clip.update({
        where: { id: clip.id },
        data: { viewCount: { increment: 1 } },
      });
    }
    res.json({ counted });
  } catch (error) {
    logger.error('Clip view error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to record view' });
  }
};

// ─── Likes ───────────────────────────────────────────────

export const toggleClipLike = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const clipId = req.params.id as string;
    const userId = req.user.userId;

    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      select: { id: true, userId: true, visibility: true, status: true, caption: true },
    });
    if (!clip || clip.status !== 'READY' || clip.visibility === 'PRIVATE') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    let liked: boolean;
    try {
      liked = await prisma.$transaction(async (tx) => {
        const deleted = await tx.clipLike.deleteMany({ where: { userId, clipId } });
        if (deleted.count > 0) {
          await tx.clip.update({ where: { id: clipId }, data: { likeCount: { decrement: 1 } } });
          return false;
        }
        await tx.clipLike.create({ data: { userId, clipId } });
        await tx.clip.update({ where: { id: clipId }, data: { likeCount: { increment: 1 } } });
        return true;
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        res.json({ liked: true });
        return;
      }
      throw e;
    }

    if (liked && clip.userId !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, username: true },
      });
      const name = liker?.displayName || liker?.username || 'Someone';
      await createNotification({
        userId: clip.userId,
        type: 'TRACK_LIKED',
        title: 'New like',
        message: `${name} liked your clip${clip.caption ? `: ${clip.caption.slice(0, 40)}` : ''}`,
        data: { clipId: clip.id },
      });
    }

    res.json({ liked });
  } catch (error) {
    logger.error('Toggle clip like error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// ─── Comments ────────────────────────────────────────────

export const listClipComments = async (req: RequestWithUser, res: Response) => {
  try {
    const clipId = req.params.id as string;
    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      select: { id: true, userId: true, visibility: true, status: true },
    });
    if (!clip || clip.status !== 'READY') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    if (clip.visibility === 'PRIVATE') {
      const isOwner = req.user?.userId === clip.userId;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const [comments, total] = await Promise.all([
      prisma.clipComment.findMany({
        where: { clipId, parentId: null },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true } },
          replies: {
            include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
            take: 25,
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.clipComment.count({ where: { clipId, parentId: null } }),
    ]);

    res.json({
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List clip comments error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list comments' });
  }
};

export const createClipComment = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const clipId = req.params.id as string;
    const { content, parentId } = req.body || {};

    if (typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }
    const trimmed = content.trim();
    if (trimmed.length > 2000) {
      res.status(400).json({ error: 'Comment must be 2000 characters or less' });
      return;
    }

    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      select: { id: true, userId: true, visibility: true, status: true, caption: true },
    });
    if (!clip || clip.status !== 'READY' || clip.visibility === 'PRIVATE') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    if (parentId) {
      const parent = await prisma.clipComment.findUnique({
        where: { id: parentId },
        select: { clipId: true, parentId: true },
      });
      if (!parent || parent.clipId !== clipId) {
        res.status(400).json({ error: 'Parent comment does not belong to this clip' });
        return;
      }
      if (parent.parentId) {
        res.status(400).json({ error: 'Replies can only be added to top-level comments' });
        return;
      }
    }

    const comment = await prisma.clipComment.create({
      data: { content: trimmed, userId: req.user.userId, clipId, parentId: parentId || null },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
    await prisma.clip.update({
      where: { id: clipId },
      data: { commentCount: { increment: 1 } },
    });

    if (clip.userId !== req.user.userId) {
      await createNotification({
        userId: clip.userId,
        type: 'COMMENT',
        title: 'New comment',
        message: `${comment.user.displayName || comment.user.username} commented on your clip`,
        data: { clipId, commentId: comment.id },
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    logger.error('Create clip comment error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const deleteClipComment = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const id = req.params.id as string;
    const comment = await prisma.clipComment.findUnique({
      where: { id },
      select: { id: true, userId: true, clipId: true, parentId: true, _count: { select: { replies: true } } },
    });
    if (!comment) { res.status(404).json({ error: 'Comment not found' }); return; }
    if (comment.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (!comment.parentId && comment._count.replies > 0) {
      await prisma.clipComment.update({ where: { id }, data: { content: '[deleted]' } });
    } else {
      await prisma.clipComment.delete({ where: { id } });
      await prisma.clip.update({
        where: { id: comment.clipId },
        data: { commentCount: { decrement: 1 } },
      });
    }
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    logger.error('Delete clip comment error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// ─── Share ───────────────────────────────────────────────

const SHARE_DEDUP_WINDOW_MS = 60_000;
const MAX_SHARE_ENTRIES = 5000;
const recentShares = new Map<string, number>();
let shareCleanupScheduled = false;

function cleanupStaleShares(now: number): void {
  if (recentShares.size === 0) return;
  for (const [k, t] of recentShares.entries()) {
    if (now - t > SHARE_DEDUP_WINDOW_MS) recentShares.delete(k);
  }
}

function shouldCountShare(key: string): boolean {
  const now = Date.now();
  const last = recentShares.get(key);
  if (last && now - last < SHARE_DEDUP_WINDOW_MS) return false;
  recentShares.set(key, now);
  if (recentShares.size > MAX_SHARE_ENTRIES && !shareCleanupScheduled) {
    shareCleanupScheduled = true;
    setImmediate(() => {
      cleanupStaleShares(Date.now());
      shareCleanupScheduled = false;
    });
  }
  return true;
}

export const shareClip = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { platform } = req.body || {};
    const normalized = typeof platform === 'string' && VALID_SHARE_PLATFORMS.includes(platform) ? platform : null;

    const clip = await prisma.clip.findUnique({
      where: { id },
      select: { id: true, userId: true, visibility: true, status: true },
    });
    if (!clip || clip.status !== 'READY' || clip.visibility === 'PRIVATE') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    const isSelf = req.user?.userId === clip.userId;
    const dedupId = req.user?.userId || req.ip || 'anon';
    const counted = !isSelf && shouldCountShare(`${id}:${dedupId}`);

    const ops: any[] = [
      prisma.clipShare.create({
        data: { clipId: id, userId: req.user?.userId, platform: normalized },
      }),
    ];
    if (counted) {
      ops.push(prisma.clip.update({ where: { id }, data: { shareCount: { increment: 1 } } }));
    }
    await prisma.$transaction(ops);
    res.json({ message: 'Share recorded', counted });
  } catch (error) {
    logger.error('Share clip error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to share' });
  }
};

// ─── Download URL ────────────────────────────────────────

export const getClipDownloadUrl = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const clip = await prisma.clip.findUnique({
      where: { id },
      include: {
        track: { select: { audioUrl: true } },
      },
    });
    if (!clip || clip.status !== 'READY') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    if (clip.visibility === 'PRIVATE' && clip.userId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    // Watermark policy: free tier = watermark, CREATOR/PREMIUM = clean.
    let watermark = true;
    if (req.user) {
      const sub = await prisma.subscription.findUnique({ where: { userId: req.user.userId } });
      if (sub && sub.status === 'ACTIVE' && (sub.tier === 'CREATOR' || sub.tier === 'PREMIUM')) {
        watermark = false;
      }
      // Owner of the clip never gets a watermark on their own download
      if (clip.userId === req.user.userId) watermark = false;
    }

    const audioPublicId = publicIdFromCloudinaryUrl(clip.track.audioUrl);
    const url = audioPublicId
      ? buildClipUrl({
          rawVideoPublicId: clip.rawPublicId,
          audioPublicId,
          trimStartMs: clip.trimStartMs,
          trimEndMs: clip.trimEndMs,
          audioStartMs: clip.audioStartMs,
          watermark,
        })
      : clip.videoUrl;

    res.json({ url, watermark });
  } catch (error) {
    logger.error('Clip download error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to build download URL' });
  }
};
