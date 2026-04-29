import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

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

export const listUsers = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true, role: true,
          avatar: true, createdAt: true,
          subscription: { select: { tier: true, status: true } },
          _count: { select: { agents: true, likes: true, playlists: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('Admin list users error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list users' });
  }
};

export const updateUserRole = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['LISTENER', 'AGENT_OWNER', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' }); return;
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
      res.status(400).json({ error: 'Invalid status' }); return;
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
      res.status(400).json({ error: 'Invalid status' }); return;
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
