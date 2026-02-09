import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export const createTrack = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { title, agentId, audioUrl, coverArt, duration, genreId, mood, tags, bpm, key, aiModel, aiPrompt, videoUrl, videoThumbnail } = req.body;

    if (!title || !agentId || !audioUrl || !duration) {
      res.status(400).json({ error: 'Title, agentId, audioUrl, and duration are required' });
      return;
    }

    // Verify agent ownership
    const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    if (agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    let slug = slugify(title);
    const existingSlug = await prisma.track.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

    const track = await prisma.track.create({
      data: {
        title,
        slug,
        audioUrl,
        coverArt,
        duration: parseInt(duration),
        mood,
        tags: tags || [],
        bpm: bpm ? parseInt(bpm) : null,
        key,
        aiModel,
        aiPrompt,
        status: 'ACTIVE',
        agentId,
        genreId: genreId || null,
        ...(videoUrl && {
          video: { create: { videoUrl, thumbnail: videoThumbnail } },
        }),
      },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
        video: true,
      },
    });

    res.status(201).json({ track });
  } catch (error) {
    logger.error('Create track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create track' });
  }
};

export const getTrack = async (req: RequestWithUser, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;

    const track = await prisma.track.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'ACTIVE' },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
        video: true,
        _count: { select: { likes: true, comments: true, plays: true } },
      },
    });

    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }

    let isLiked = false;
    if (req.user) {
      const like = await prisma.like.findUnique({
        where: { userId_trackId: { userId: req.user.userId, trackId: track.id } },
      });
      isLiked = !!like;
    }

    res.json({ track: { ...track, isLiked } });
  } catch (error) {
    logger.error('Get track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get track' });
  }
};

export const listTracks = async (req: RequestWithUser, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const sort = (req.query.sort as string) || 'newest';
    const genreSlug = req.query.genre as string | undefined;
    const agentId = req.query.agentId as string | undefined;
    const mood = req.query.mood as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = { status: 'ACTIVE' };
    if (genreSlug) where.genre = { slug: genreSlug };
    if (agentId) where.agentId = agentId;
    if (mood) where.mood = { equals: mood, mode: 'insensitive' };
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const orderBy: any = sort === 'popular' ? { playCount: 'desc' }
      : sort === 'liked' ? { likeCount: 'desc' }
      : { createdAt: 'desc' };

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, slug: true, avatar: true } },
          genre: true,
          video: { select: { id: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.track.count({ where }),
    ]);

    res.json({ tracks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('List tracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list tracks' });
  }
};

export const recordPlay = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const { durationPlayed, completed } = req.body;

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }

    await prisma.$transaction([
      prisma.play.create({
        data: {
          trackId,
          userId: req.user?.userId || null,
          durationPlayed: durationPlayed || 0,
          completed: completed || false,
        },
      }),
      prisma.track.update({
        where: { id: trackId },
        data: { playCount: { increment: 1 } },
      }),
      prisma.aiAgent.update({
        where: { id: track.agentId },
        data: { totalPlays: { increment: 1 } },
      }),
    ]);

    res.json({ message: 'Play recorded' });
  } catch (error) {
    logger.error('Record play error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to record play' });
  }
};

export const deleteTrack = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const track = await prisma.track.findUnique({ where: { id }, include: { agent: true } });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (track.agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.track.delete({ where: { id } });
    res.json({ message: 'Track deleted' });
  } catch (error) {
    logger.error('Delete track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete track' });
  }
};

export const getTrending = async (_req: RequestWithUser, res: Response) => {
  try {
    // Trending = most plays in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await prisma.track.findMany({
      where: { status: 'ACTIVE', plays: { some: { createdAt: { gte: sevenDaysAgo } } } },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
        _count: { select: { plays: { where: { createdAt: { gte: sevenDaysAgo } } } } },
      },
      orderBy: { playCount: 'desc' },
      take: 20,
    });

    res.json({ tracks: trending });
  } catch (error) {
    logger.error('Get trending error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get trending' });
  }
};
