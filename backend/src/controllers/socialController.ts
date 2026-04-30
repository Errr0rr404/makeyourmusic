import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { createNotification } from '../utils/notifications';
import { slugify, uniqueSuffix, createWithUniqueSlug } from '../utils/slugify';
import { moderateLyrics, moderationToError } from '../utils/moderation';

// ─── Likes ───────────────────────────────────────────────

export const toggleLike = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const trackId = req.params.trackId as string;
    const userId = req.user.userId;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { id: true, name: true, slug: true, ownerId: true } } },
    });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }

    // Atomic toggle: deleteMany returns count, so a concurrent request can't
    // make us double-delete or miss a delete. For the like branch, a P2002 from
    // a concurrent create is treated as idempotent (already liked).
    let liked: boolean;
    try {
      liked = await prisma.$transaction(async (tx) => {
        const deleted = await tx.like.deleteMany({ where: { userId, trackId } });
        if (deleted.count > 0) {
          await tx.track.update({ where: { id: trackId }, data: { likeCount: { decrement: 1 } } });
          await tx.aiAgent.update({ where: { id: track.agentId }, data: { totalLikes: { decrement: 1 } } });
          return false;
        }
        await tx.like.create({ data: { userId, trackId } });
        await tx.track.update({ where: { id: trackId }, data: { likeCount: { increment: 1 } } });
        await tx.aiAgent.update({ where: { id: track.agentId }, data: { totalLikes: { increment: 1 } } });
        return true;
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        res.json({ liked: true });
        return;
      }
      throw e;
    }

    if (liked && track.agent.ownerId !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, username: true },
      });
      const name = liker?.displayName || liker?.username || 'Someone';
      await createNotification({
        userId: track.agent.ownerId,
        type: 'TRACK_LIKED',
        title: 'New like',
        message: `${name} liked your track "${track.title}"`,
        data: { trackId: track.id, trackSlug: track.slug, agentSlug: track.agent.slug },
      });
    }

    res.json({ liked });
  } catch (error) {
    logger.error('Toggle like error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const getLikedTracks = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const userId = req.user.userId;

    // Include private tracks only if the user owns them (via their agent)
    const visibilityWhere = {
      OR: [
        { track: { isPublic: true } },
        { track: { agent: { ownerId: userId } } },
      ],
    };

    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { userId, ...visibilityWhere },
        include: {
          track: {
            include: {
              agent: { select: { id: true, name: true, slug: true, avatar: true } },
              genre: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.like.count({ where: { userId, ...visibilityWhere } }),
    ]);

    res.json({ tracks: likes.map(l => ({ ...l.track, likedAt: l.createdAt })), total, page });
  } catch (error) {
    logger.error('Get liked tracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get liked tracks' });
  }
};

// ─── Follow ──────────────────────────────────────────────

export const toggleFollow = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const agentId = req.params.agentId as string;
    const userId = req.user.userId;

    const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

    let following: boolean;
    try {
      following = await prisma.$transaction(async (tx) => {
        const deleted = await tx.follow.deleteMany({ where: { userId, agentId } });
        if (deleted.count > 0) {
          await tx.aiAgent.update({ where: { id: agentId }, data: { followerCount: { decrement: 1 } } });
          return false;
        }
        await tx.follow.create({ data: { userId, agentId } });
        await tx.aiAgent.update({ where: { id: agentId }, data: { followerCount: { increment: 1 } } });
        return true;
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        res.json({ following: true });
        return;
      }
      throw e;
    }

    if (following && agent.ownerId !== userId) {
      const follower = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, username: true },
      });
      const name = follower?.displayName || follower?.username || 'Someone';
      await createNotification({
        userId: agent.ownerId,
        type: 'NEW_FOLLOWER',
        title: 'New follower',
        message: `${name} followed ${agent.name}`,
        data: { agentId: agent.id, agentSlug: agent.slug, followerId: userId },
      });
    }

    res.json({ following });
  } catch (error) {
    logger.error('Toggle follow error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
};

// ─── Comments ────────────────────────────────────────────

export const getComments = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;

    // Verify the track is public or owned by the requester before exposing comments
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { isPublic: true, agent: { select: { ownerId: true } } },
    });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (!track.isPublic) {
      const isOwner = req.user && track.agent.ownerId === req.user.userId;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const REPLIES_PER_COMMENT = 25;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { trackId, parentId: null },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true } },
          replies: {
            include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
            take: REPLIES_PER_COMMENT,
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where: { trackId, parentId: null } }),
    ]);

    res.json({
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get comments error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

export const createComment = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const trackId = req.params.trackId as string;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' }); return;
    }

    const trimmed = content.trim();
    if (trimmed.length > 2000) {
      res.status(400).json({ error: 'Comment must be 2000 characters or less' }); return;
    }

    // Run user-supplied comment text through the same moderation gate as
    // lyrics. Without this, the comment surface was a free channel for
    // slurs / threats / CSAM solicitations. BLOCK severity is rejected;
    // REVIEW-tier hits are allowed through (admin review can mop up).
    {
      const check = moderateLyrics(trimmed);
      if (!check.allowed && check.severity === 'BLOCK') {
        res.status(400).json({ error: moderationToError(check) || 'Comment violates content policy' });
        return;
      }
    }

    // Only permit comments on visible tracks (public, or owned by commenter, or admin)
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: {
        title: true,
        slug: true,
        isPublic: true,
        agent: { select: { ownerId: true, slug: true } },
      },
    });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (!track.isPublic && track.agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { trackId: true, parentId: true },
      });
      if (!parent || parent.trackId !== trackId) {
        res.status(400).json({ error: 'Parent comment does not belong to this track' });
        return;
      }
      if (parent.parentId) {
        res.status(400).json({ error: 'Replies can only be added to top-level comments' });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: { content: trimmed, userId: req.user.userId, trackId, parentId },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    if (track.agent.ownerId !== req.user.userId) {
      const commenter = comment.user.displayName || comment.user.username;
      await createNotification({
        userId: track.agent.ownerId,
        type: 'COMMENT',
        title: 'New comment',
        message: `${commenter} commented on "${track.title}"`,
        data: {
          trackId,
          trackSlug: track.slug,
          agentSlug: track.agent.slug,
          commentId: comment.id,
        },
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    logger.error('Create comment error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const updateComment = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }
    const trimmed = content.trim();
    if (trimmed.length > 2000) {
      res.status(400).json({ error: 'Comment must be 2000 characters or less' });
      return;
    }
    {
      const check = moderateLyrics(trimmed);
      if (!check.allowed && check.severity === 'BLOCK') {
        res.status(400).json({ error: moderationToError(check) || 'Comment violates content policy' });
        return;
      }
    }

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Comment not found' }); return; }
    if (existing.userId !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content: trimmed },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    res.json({ comment });
  } catch (error) {
    logger.error('Update comment error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

export const deleteComment = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) { res.status(404).json({ error: 'Comment not found' }); return; }
    if (comment.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.comment.delete({ where: { id } });
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    logger.error('Delete comment error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// ─── Playlists ───────────────────────────────────────────

export const createPlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { title, description, isPublic } = req.body;
    if (!title) { res.status(400).json({ error: 'Title is required' }); return; }

    const seedSlug = slugify(title) || `playlist-${uniqueSuffix()}`;

    const playlist = await createWithUniqueSlug(seedSlug, (slug) =>
      prisma.playlist.create({
        data: {
          title,
          slug,
          description,
          isPublic: isPublic !== false,
          accessTier: isPublic === false ? 'PRIVATE' : 'PUBLIC',
          userId: req.user!.userId,
        },
      })
    );

    res.status(201).json({ playlist });
  } catch (error) {
    logger.error('Create playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create playlist' });
  }
};

export const getPlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;
    const playlist = await prisma.playlist.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        tracks: {
          include: {
            track: {
              include: {
                agent: { select: { id: true, name: true, slug: true, avatar: true, ownerId: true } },
                genre: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }

    const viewerId = req.user?.userId;
    const isOwner = viewerId && playlist.userId === viewerId;
    const isPrivatePlaylist =
      playlist.accessTier === 'PRIVATE' ||
      (playlist.accessTier === 'PUBLIC' && playlist.isPublic === false);

    // Access control by tier:
    //  PUBLIC  → anyone (also surface tracks to anyone)
    //  PRIVATE → owner only
    //  PAID    → owner OR active ChannelSubscription. Non-subscribers see metadata
    //            but no tracks, so the UI can render a paywall.
    if (isPrivatePlaylist && !isOwner) {
      res.status(403).json({ error: 'This playlist is private' });
      return;
    }

    let isPaidSubscriber = false;
    if (playlist.accessTier === 'PAID' && !isOwner) {
      if (!viewerId) {
        // Hide track contents but return playlist meta so the UI can show the
        // paywall + price.
        res.json({
          playlist: {
            ...playlist,
            tracks: [],
            locked: true,
          },
        });
        return;
      }
      const sub = await prisma.channelSubscription.findUnique({
        where: { subscriberUserId_playlistId: { subscriberUserId: viewerId, playlistId: playlist.id } },
      });
      isPaidSubscriber = Boolean(
        sub && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE')
      );
      if (!isPaidSubscriber) {
        res.json({
          playlist: {
            ...playlist,
            tracks: [],
            locked: true,
          },
        });
        return;
      }
    }

    // Filter individual tracks by their own visibility (private tracks only
    // visible to their agent owner).
    const visibleTracks = playlist.tracks.filter((pt) => {
      if (pt.track.isPublic) return true;
      return viewerId && pt.track.agent.ownerId === viewerId;
    });

    res.json({
      playlist: {
        ...playlist,
        tracks: visibleTracks,
        locked: false,
        subscribed: isPaidSubscriber,
      },
    });
  } catch (error) {
    logger.error('Get playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get playlist' });
  }
};

export const getMyPlaylists = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const playlists = await prisma.playlist.findMany({
      where: { userId: req.user.userId },
      include: { _count: { select: { tracks: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ playlists });
  } catch (error) {
    logger.error('Get my playlists error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get playlists' });
  }
};

export const addToPlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const playlistId = req.params.playlistId as string;
    const { trackId } = req.body;
    if (!trackId || typeof trackId !== 'string') {
      res.status(400).json({ error: 'trackId is required' }); return;
    }

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.userId !== req.user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: {
        id: true,
        isPublic: true,
        status: true,
        takedownStatus: true,
        agent: { select: { ownerId: true } },
      },
    });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (!track.isPublic && track.agent.ownerId !== req.user.userId) {
      res.status(404).json({ error: 'Track not found' }); return;
    }
    // Reject non-ACTIVE or taken-down tracks. Without this, a taken-down or
    // PROCESSING/REMOVED track can be added to a paid playlist where it
    // surfaces to subscribers as a broken row.
    if (track.status !== 'ACTIVE' || track.takedownStatus) {
      res.status(409).json({ error: 'Only active, non-takedown tracks can be added' });
      return;
    }

    // Cap playlist size — without this a single playlist row can grow
    // unboundedly large; getPlaylist returns all tracks via Prisma include
    // with no `take` limit, so a 100k-track playlist would crash the API.
    const MAX_TRACKS_PER_PLAYLIST = 500;
    const currentCount = await prisma.playlistTrack.count({ where: { playlistId } });
    if (currentCount >= MAX_TRACKS_PER_PLAYLIST) {
      res.status(409).json({ error: `Playlist is full (max ${MAX_TRACKS_PER_PLAYLIST} tracks)` });
      return;
    }

    try {
      const playlistTrack = await prisma.$transaction(async (tx) => {
        const maxPosition = await tx.playlistTrack.aggregate({
          where: { playlistId },
          _max: { position: true },
        });
        return tx.playlistTrack.create({
          data: { playlistId, trackId, position: (maxPosition._max.position || 0) + 1 },
        });
      });
      res.status(201).json({ playlistTrack });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Track is already in this playlist' });
        return;
      }
      throw e;
    }
  } catch (error) {
    logger.error('Add to playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to add to playlist' });
  }
};

export const removeFromPlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const playlistId = req.params.playlistId as string;
    const trackId = req.params.trackId as string;
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.userId !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
    res.json({ message: 'Track removed from playlist' });
  } catch (error) {
    logger.error('Remove from playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to remove from playlist' });
  }
};

export const updatePlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.userId !== req.user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    const { title, description, isPublic } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (isPublic !== undefined) {
      data.isPublic = isPublic;
      if (playlist.accessTier !== 'PAID') {
        data.accessTier = isPublic ? 'PUBLIC' : 'PRIVATE';
      }
    }

    const updated = await prisma.playlist.update({ where: { id }, data });
    res.json({ playlist: updated });
  } catch (error) {
    logger.error('Update playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update playlist' });
  }
};

export const deletePlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.playlist.delete({ where: { id } });
    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    logger.error('Delete playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
};

// ─── Share ───────────────────────────────────────────────

const VALID_SHARE_PLATFORMS = ['copy', 'twitter', 'facebook', 'whatsapp', 'telegram', 'email', 'other'];

// In-process per-(track,viewer) cooldown so the share counter can't be
// pumped by a script in a tight loop. shareCount feeds the trending score
// directly (numerator includes shareCount * 2), so this is a real abuse
// vector. 1 minute is a stricter window than likes/plays since shares
// are inherently low-frequency.
const SHARE_DEDUP_WINDOW_MS = 60_000;
const recentShares = new Map<string, number>();
function shouldDedupShare(key: string): boolean {
  const now = Date.now();
  const last = recentShares.get(key);
  if (last && now - last < SHARE_DEDUP_WINDOW_MS) return true;
  recentShares.set(key, now);
  if (recentShares.size > 5000) {
    for (const [k, t] of recentShares.entries()) {
      if (now - t > SHARE_DEDUP_WINDOW_MS) recentShares.delete(k);
    }
  }
  return false;
}

export const shareTrack = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const { platform } = req.body || {};

    const normalizedPlatform =
      typeof platform === 'string' && VALID_SHARE_PLATFORMS.includes(platform) ? platform : null;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: {
        id: true,
        isPublic: true,
        status: true,
        takedownStatus: true,
        agent: { select: { ownerId: true } },
      },
    });
    if (!track || track.status !== 'ACTIVE' || track.takedownStatus) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (!track.isPublic) {
      if (!req.user || track.agent.ownerId !== req.user.userId) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
    }

    // Self-shares from the agent owner shouldn't pump trending. Dedup keys
    // off userId when authenticated; otherwise IP.
    const isSelfShare = req.user?.userId === track.agent.ownerId;
    const dedupId = req.user?.userId || req.ip || 'anon';
    const isDuplicate = shouldDedupShare(`${trackId}:${dedupId}`);
    const shouldCount = !isSelfShare && !isDuplicate;

    const ops: any[] = [
      prisma.share.create({ data: { trackId, userId: req.user?.userId, platform: normalizedPlatform } }),
    ];
    if (shouldCount) {
      ops.push(
        prisma.track.update({ where: { id: trackId }, data: { shareCount: { increment: 1 } } })
      );
    }
    await prisma.$transaction(ops);

    res.json({ message: 'Share recorded', counted: shouldCount });
  } catch (error) {
    logger.error('Share track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to share track' });
  }
};
