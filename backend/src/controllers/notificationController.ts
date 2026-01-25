import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { getStringParam, getStringQuery, getNumberQuery } from '../utils/request';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';

// Type workaround for Prisma client with Notification and ContactMessage models
const prismaClient = prisma as any;

// Get user's notifications
export const getNotifications = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    
    // Check if notification model exists
    if (!prismaClient.notification) {
      return res.json({
        notifications: [],
        unreadCount: 0,
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });
    }
    
    const { page, limit, skip } = getPaginationParams(
      getNumberQuery(req, 'page', 1),
      getNumberQuery(req, 'limit', 50),
      50,
      100
    );
    const unreadOnly = getStringQuery(req, 'unread') === 'true';

    const where: { userId: string; read?: boolean } = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prismaClient.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prismaClient.notification.count({ where }),
      prismaClient.notification.count({ where: { userId, read: false } }),
    ]);

    const response = formatPaginationResponse(notifications, total, page, limit);
    
    res.json({
      notifications: response.data,
      unreadCount,
      pagination: response.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// Get single notification
export const getNotification = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');
    const userId = req.user!.userId;

    if (!id) {
      throw new AppError('Notification ID is required', 400);
    }

    const notification = await prismaClient.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    // Mark as read when viewing
    if (!notification.read) {
      await prismaClient.notification.update({
        where: { id },
        data: { read: true },
      });
      notification.read = true;
    }

    res.json(notification);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Notification not found', 404));
    }
    return next(error);
  }
};

// Mark notification as read
export const markAsRead = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');
    const userId = req.user!.userId;

    if (!id) {
      throw new AppError('Notification ID is required', 400);
    }

    const notification = await prismaClient.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    const updated = await prismaClient.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Notification not found', 404));
    }
    return next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    await prismaClient.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
};

// Get all notifications (admin - all users)
export const getAllNotifications = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const page = getNumberQuery(req, 'page', 1) || 1;
    const limit = getNumberQuery(req, 'limit', 50) || 50;
    const skip = (page - 1) * limit;
    const unreadOnly = getStringQuery(req, 'unread') === 'true';

    const where: any = {};
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      prismaClient.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prismaClient.notification.count({ where }),
    ]);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Create notification (admin or system)
export const createNotification = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { userId, type, title, message, link } = req.body;

    if (!userId || typeof userId !== 'string') {
      throw new AppError('User ID is required', 400);
    }
    if (!type || typeof type !== 'string') {
      throw new AppError('Type is required', 400);
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError('Title is required', 400);
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('Message is required', 400);
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const notification = await prismaClient.notification.create({
      data: {
        userId,
        type: type.trim(),
        title: title.trim(),
        message: message.trim(),
        link: link || null,
      },
    });

    res.status(201).json(notification);
  } catch (error) {
    return next(error);
  }
};

// Delete notification
export const deleteNotification = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');
    const userId = req.user!.userId;

    if (!id) {
      throw new AppError('Notification ID is required', 400);
    }

    // Admin can delete any, users can only delete their own
    const notification = await prismaClient.notification.findFirst({
      where: req.user!.role === 'ADMIN' 
        ? { id }
        : { id, userId },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await prismaClient.notification.delete({
      where: { id },
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Notification not found', 404));
    }
    return next(error);
  }
};
