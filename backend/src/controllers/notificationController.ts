import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

export const listNotifications = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const unreadOnly = req.query.unread === 'true';

    const where = {
      userId: req.user.userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.userId, read: false } }),
    ]);

    res.json({ notifications, total, unreadCount, page });
  } catch (error) {
    logger.error('List notifications error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

export const getUnreadCount = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const count = await prisma.notification.count({
      where: { userId: req.user.userId, read: false },
    });

    res.json({ count });
  } catch (error) {
    logger.error('Unread count error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

export const markAsRead = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.userId },
      data: { read: true },
    });

    if (result.count === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    logger.error('Mark as read error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

export const markAllAsRead = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true },
    });

    res.json({ message: 'All marked as read' });
  } catch (error) {
    logger.error('Mark all as read error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// ─── Push token registration ──────────────────────────────

const VALID_PLATFORMS = ['ios', 'android', 'web'] as const;

export const registerPushToken = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { token, platform } = req.body || {};
    if (!token || typeof token !== 'string' || token.length > 500) {
      res.status(400).json({ error: 'token is required' });
      return;
    }
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      res.status(400).json({
        error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
      return;
    }

    // Upsert — if token exists, update the owner (handles user switching devices)
    await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId: req.user.userId,
        platform,
        lastUsedAt: new Date(),
      },
      create: {
        userId: req.user.userId,
        token,
        platform,
      },
    });

    res.json({ message: 'Push token registered' });
  } catch (error) {
    logger.error('Register push token error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to register push token' });
  }
};

export const unregisterPushToken = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'token is required' });
      return;
    }
    // Only delete if the token belongs to the calling user
    await prisma.pushToken.deleteMany({
      where: { token, userId: req.user.userId },
    });
    res.json({ message: 'Push token removed' });
  } catch (error) {
    logger.error('Unregister push token error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
};

export const deleteNotification = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const result = await prisma.notification.deleteMany({
      where: { id, userId: req.user.userId },
    });

    if (result.count === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
