import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export const createAgent = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { name, bio, avatar, coverImage, aiModel, genreIds } = req.body;

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Agent name must be at least 2 characters' });
      return;
    }

    let slug = slugify(name);
    const existing = await prisma.aiAgent.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    // Upgrade user to AGENT_OWNER if they're a LISTENER
    if (req.user.role === 'LISTENER') {
      await prisma.user.update({ where: { id: req.user.userId }, data: { role: 'AGENT_OWNER' } });
    }

    const agent = await prisma.aiAgent.create({
      data: {
        name,
        slug,
        bio,
        avatar,
        coverImage,
        aiModel,
        ownerId: req.user.userId,
        ...(genreIds?.length && {
          genres: { create: genreIds.map((gId: string) => ({ genreId: gId })) },
        }),
      },
      include: { genres: { include: { genre: true } }, owner: { select: { id: true, username: true } } },
    });

    res.status(201).json({ agent });
  } catch (error) {
    logger.error('Create agent error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create agent' });
  }
};

export const getAgent = async (req: RequestWithUser, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;

    const agent = await prisma.aiAgent.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'ACTIVE' },
      include: {
        genres: { include: { genre: true } },
        owner: { select: { id: true, username: true, displayName: true } },
        _count: { select: { followers: true } },
      },
    });

    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

    const isOwner = req.user?.userId === agent.ownerId;

    // Public track count should not leak private-track counts to outsiders
    const trackCount = await prisma.track.count({
      where: {
        agentId: agent.id,
        status: 'ACTIVE',
        ...(isOwner ? {} : { isPublic: true }),
      },
    });

    // Check if current user follows this agent
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { userId_agentId: { userId: req.user.userId, agentId: agent.id } },
      });
      isFollowing = !!follow;
    }

    res.json({
      agent: {
        ...agent,
        isFollowing,
        _count: { ...agent._count, tracks: trackCount },
      },
    });
  } catch (error) {
    logger.error('Get agent error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get agent' });
  }
};

export const listAgents = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const search = req.query.search as string | undefined;
    const genreSlug = req.query.genre as string | undefined;

    const where: any = { status: 'ACTIVE' };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (genreSlug) where.genres = { some: { genre: { slug: genreSlug } } };

    const [agents, total] = await Promise.all([
      prisma.aiAgent.findMany({
        where,
        include: {
          genres: { include: { genre: true } },
          _count: { select: { tracks: true, followers: true } },
        },
        orderBy: { followerCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aiAgent.count({ where }),
    ]);

    res.json({ agents, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('List agents error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list agents' });
  }
};

export const updateAgent = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const agent = await prisma.aiAgent.findUnique({ where: { id } });

    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    if (agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const { name, bio, avatar, coverImage, aiModel, genreIds } = req.body;

    const updated = await prisma.aiAgent.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(coverImage !== undefined && { coverImage }),
        ...(aiModel !== undefined && { aiModel }),
        ...(genreIds && {
          genres: {
            deleteMany: {},
            create: genreIds.map((gId: string) => ({ genreId: gId })),
          },
        }),
      },
      include: { genres: { include: { genre: true } } },
    });

    res.json({ agent: updated });
  } catch (error) {
    logger.error('Update agent error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update agent' });
  }
};

export const getMyAgents = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const agents = await prisma.aiAgent.findMany({
      where: { ownerId: req.user.userId },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { tracks: true, followers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ agents });
  } catch (error) {
    logger.error('Get my agents error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get agents' });
  }
};

export const deleteAgent = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const agent = await prisma.aiAgent.findUnique({ where: { id } });

    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    if (agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.aiAgent.delete({ where: { id } });
    res.json({ message: 'Agent deleted' });
  } catch (error) {
    logger.error('Delete agent error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete agent' });
  }
};
