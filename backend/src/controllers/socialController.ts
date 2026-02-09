import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// ─── Likes ───────────────────────────────────────────────

export const toggleLike = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const trackId = req.params.trackId as string;
    const existing = await prisma.like.findUnique({
      where: { userId_trackId: { userId: req.user.userId, trackId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.track.update({ where: { id: trackId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      res.json({ liked: false });
    } else {
      const track = await prisma.track.findUnique({ where: { id: trackId } });
      if (!track) { res.status(404).json({ error: 'Track not found' }); return; }

      await prisma.$transaction([
        prisma.like.create({ data: { userId: req.user.userId, trackId } }),
        prisma.track.update({ where: { id: trackId }, data: { likeCount: { increment: 1 } } }),
        prisma.aiAgent.update({ where: { id: track.agentId }, data: { totalLikes: { increment: 1 } } }),
      ]);
      res.json({ liked: true });
    }
  } catch (error) {
    logger.error('Toggle like error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const getLikedTracks = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { userId: req.user.userId },
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
      prisma.like.count({ where: { userId: req.user.userId } }),
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
    const existing = await prisma.follow.findUnique({
      where: { userId_agentId: { userId: req.user.userId, agentId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.follow.delete({ where: { id: existing.id } }),
        prisma.aiAgent.update({ where: { id: agentId }, data: { followerCount: { decrement: 1 } } }),
      ]);
      res.json({ following: false });
    } else {
      await prisma.$transaction([
        prisma.follow.create({ data: { userId: req.user.userId, agentId } }),
        prisma.aiAgent.update({ where: { id: agentId }, data: { followerCount: { increment: 1 } } }),
      ]);
      res.json({ following: true });
    }
  } catch (error) {
    logger.error('Toggle follow error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
};

// ─── Comments ────────────────────────────────────────────

export const getComments = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const comments = await prisma.comment.findMany({
      where: { trackId, parentId: null },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        replies: {
          include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ comments });
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

    const comment = await prisma.comment.create({
      data: { content: content.trim(), userId: req.user.userId, trackId, parentId },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    res.status(201).json({ comment });
  } catch (error) {
    logger.error('Create comment error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create comment' });
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

    let slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const existingSlug = await prisma.playlist.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

    const playlist = await prisma.playlist.create({
      data: {
        title,
        slug,
        description,
        isPublic: isPublic !== false,
        userId: req.user.userId,
      },
    });

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
                agent: { select: { id: true, name: true, slug: true, avatar: true } },
                genre: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (!playlist.isPublic && playlist.userId !== req.user?.userId) {
      res.status(403).json({ error: 'This playlist is private' }); return;
    }

    res.json({ playlist });
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

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.userId !== req.user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    const maxPosition = await prisma.playlistTrack.aggregate({
      where: { playlistId },
      _max: { position: true },
    });

    const playlistTrack = await prisma.playlistTrack.create({
      data: { playlistId, trackId, position: (maxPosition._max.position || 0) + 1 },
    });

    res.status(201).json({ playlistTrack });
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
    if (!playlist || playlist.userId !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
    res.json({ message: 'Track removed from playlist' });
  } catch (error) {
    logger.error('Remove from playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to remove from playlist' });
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

export const shareTrack = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const { platform } = req.body;

    await prisma.$transaction([
      prisma.share.create({ data: { trackId, userId: req.user?.userId, platform } }),
      prisma.track.update({ where: { id: trackId }, data: { shareCount: { increment: 1 } } }),
    ]);

    res.json({ message: 'Share recorded' });
  } catch (error) {
    logger.error('Share track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to share track' });
  }
};
