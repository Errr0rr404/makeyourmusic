import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { getStringQuery, getNumberQuery } from '../utils/request';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

// Admin login (separate from regular user login)
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Prevent timing attacks by always performing bcrypt comparison
    // Use a dummy hash if user doesn't exist or is not admin
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
    const hashToCompare = (user && user.role === 'ADMIN') ? user.passwordHash : dummyHash;
    
    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    // Don't reveal if user exists or is admin (prevent user enumeration)
    if (!user || user.role !== 'ADMIN' || !isValidPassword) {
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

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Dashboard statistics
export const getDashboardStats = async (_req: RequestWithUser, res: Response, next: NextFunction) => {
  try {

    const [
      totalUsers,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true, lastName: true,
          role: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    res.json({
      stats: {
        totalUsers,
      },
      recentUsers,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin view)
export const getAllUsers = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      getNumberQuery(req, 'page', 1),
      getNumberQuery(req, 'limit', 50),
      50,
      100
    );
    const search = getStringQuery(req, 'search');

    const where: any = {};
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { last_name: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const prismaClient = prisma as any;

    const [users, total] = await Promise.all([
      prismaClient.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true, lastName: true,
          role: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prismaClient.user.count({ where }),
    ]);

    const response = formatPaginationResponse(users, total, page, limit);
    
    res.json({
      users: response.data,
      pagination: response.pagination,
    });
  } catch (error) {
    next(error);
  }
};
