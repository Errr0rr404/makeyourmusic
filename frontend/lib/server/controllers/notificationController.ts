import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';
import { getStringQuery, getNumberQuery } from '../utils/request';
import { authenticate, requireAdmin } from '../middleware/auth';
import validator from 'validator';

// Type workaround for Prisma client with Notification model
const prismaClient = prisma as any;

// Get single notification
export const getNotification = async (req: NextRequest, context: { params: { id: string } }): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const id = context.params.id;
  if (!id) {
    throw new AppError('Notification ID is required', 400);
  }

  const notification = await prismaClient.notification.findFirst({
    where: {
      id,
      userId: user.userId,
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

  return NextResponse.json(notification);
};

// Mark notification as read
export const markAsRead = async (req: NextRequest, context: { params: { id: string } }): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const id = context.params.id;
  if (!id) {
    throw new AppError('Notification ID is required', 400);
  }

  const notification = await prismaClient.notification.findFirst({
    where: {
      id,
      userId: user.userId,
    },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  const updated = await prismaClient.notification.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json(updated);
};

// Delete notification
export const deleteNotification = async (req: NextRequest, context: { params: { id: string } }): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const id = context.params.id;
  if (!id) {
    throw new AppError('Notification ID is required', 400);
  }

  // Admin can delete any, users can only delete their own
  const notification = await prismaClient.notification.findFirst({
    where: user.role === 'ADMIN' 
      ? { id }
      : { id, userId: user.userId },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await prismaClient.notification.delete({
    where: { id },
  });

  return NextResponse.json({ message: 'Notification deleted successfully' });
};

// Get user's notifications
export const getNotifications = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check if notification model exists
  if (!prismaClient.notification) {
    return NextResponse.json({
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

  const where: { userId: string; read?: boolean } = { userId: user.userId };
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
    prismaClient.notification.count({ where: { userId: user.userId, read: false } }),
  ]);

  const response = formatPaginationResponse(notifications, total, page, limit);

  return NextResponse.json({
    notifications: response.data,
    unreadCount,
    pagination: response.pagination,
  });
};

// Mark all notifications as read
export const markAllAsRead = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  await prismaClient.notification.updateMany({
    where: {
      userId: user.userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return NextResponse.json({ message: 'All notifications marked as read' });
};

// Create notification (admin or system)
export const createNotification = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const adminCheck = requireAdmin(user);
  if (adminCheck) {
    return adminCheck;
  }

  const body = await req.json();
  const { userId, type, title, message, link } = body;

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

  // Validate link URL if provided
  let validatedLink: string | null = null;
  if (link) {
    if (typeof link !== 'string' || link.trim().length === 0) {
      validatedLink = null;
    } else {
      const trimmedLink = link.trim();
      // Validate URL format
      if (validator.isURL(trimmedLink, { require_protocol: false })) {
        // Ensure URL has protocol
        validatedLink = trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')
          ? trimmedLink
          : `https://${trimmedLink}`;
      } else {
        throw new AppError('Invalid link URL format', 400);
      }
    }
  }

  // Verify user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  const notification = await prismaClient.notification.create({
    data: {
      userId,
      type: type.trim(),
      title: title.trim(),
      message: message.trim(),
      link: validatedLink,
    },
  });

  return NextResponse.json(notification, { status: 201 });
};

// Get all notifications (admin)
export const getAllNotificationsAdmin = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const adminCheck = requireAdmin(user);
  if (adminCheck) {
    return adminCheck;
  }

  const { page, limit, skip } = getPaginationParams(
    getNumberQuery(req, 'page', 1),
    getNumberQuery(req, 'limit', 50),
    50,
    100
  );

  const [notifications, total] = await Promise.all([
    prismaClient.notification.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prismaClient.notification.count(),
  ]);

  const response = formatPaginationResponse(notifications, total, page, limit);

  return NextResponse.json({
    notifications: response.data,
    pagination: response.pagination,
  });
};
