import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/errorHandler';
import { UserRole } from '../types';
import { sanitizeEmail } from '../utils/validation';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';
import { requireAdminAccess } from '../middleware/authHelpers';

// Admin login (separate from regular user login)
export const adminLogin = async (req: NextRequest): Promise<NextResponse> => {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    throw new AppError('Invalid email format', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: sanitizedEmail },
  });

  // Prevent timing attacks by always performing bcrypt comparison
  // Use a dummy hash if user doesn't exist or is not admin
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
  const hashToCompare = (user && user.role === UserRole.ADMIN) ? user.passwordHash : dummyHash;
  
  const isValidPassword = await bcrypt.compare(password, hashToCompare);

  // Don't reveal if user exists or is admin (prevent user enumeration)
  if (!user || user.role !== UserRole.ADMIN || !isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });

  // Set refresh token cookie
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return response;
};

// Dashboard statistics
export const getDashboardStats = async (req: NextRequest): Promise<NextResponse> => {
  // Check authentication
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  
  // Check if user is admin or mastermind
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MASTERMIND')) {
    throw new AppError('Admin access required', 403);
  }

  try {
    const prismaClient = prisma as any;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      onlineRevenue,
      posRevenue,
      pendingMessages,
      unreadNotifications,
      posSessionsToday,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({
        where: {
          role: { not: 'MASTERMIND' }, // Exclude mastermind users
        },
      }),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCEEDED',
        },
      }),
      // Online revenue (exclude POS)
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCEEDED',
          order: {
            source: 'ONLINE',
          },
        },
      }),
      // POS revenue
      prismaClient.posTransaction?.aggregate({
        _sum: {
          total: true,
        },
        where: {
          transactionType: 'SALE',
        },
      }).catch(() => ({ _sum: { total: null } })) || Promise.resolve({ _sum: { total: null } }),
      // Safely handle optional models
      (prismaClient.contactMessage?.count ? prismaClient.contactMessage.count({
        where: { status: 'PENDING' },
      }).catch(() => 0) : Promise.resolve(0)),
      prisma.notification.count({
        where: { read: false },
      }).catch(() => 0),
      // POS sessions today
      (prismaClient.posSession?.count ? prismaClient.posSession.count({
        where: {
          openedAt: {
            gte: todayStart,
          },
        },
      }).catch(() => 0) : Promise.resolve(0)),
    ]);

    return NextResponse.json({
      stats: {
        totalProducts: totalProducts ?? 0,
        totalOrders: totalOrders ?? 0,
        totalUsers: totalUsers ?? 0,
        totalRevenue: totalRevenue._sum?.amount ? Number(totalRevenue._sum.amount) : 0,
        onlineRevenue: onlineRevenue._sum?.amount ? Number(onlineRevenue._sum.amount) : 0,
        posRevenue: posRevenue._sum?.total ? Number(posRevenue._sum.total) : 0,
        pendingMessages: pendingMessages ?? 0,
        unreadNotifications: unreadNotifications ?? 0,
        posSessionsToday: posSessionsToday ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Failed to fetch dashboard statistics: ${errorMessage}`, 500);
  }
};

// Get admin users (pagination)
export const getAdminUsers = async (req: NextRequest): Promise<NextResponse> => {
  requireAdminAccess(req);
  const pageParam = Number(req.nextUrl.searchParams.get('page') || '1');
  const limitParam = Number(req.nextUrl.searchParams.get('limit') || '50');
  const { page, limit, skip } = getPaginationParams(pageParam, limitParam, 50, 100);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { not: 'MASTERMIND' },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({
      where: { role: { not: 'MASTERMIND' } },
    }),
  ]);

  const response = formatPaginationResponse(users, total, page, limit);

  return NextResponse.json({
    users: response.data,
    pagination: response.pagination,
  });
};
