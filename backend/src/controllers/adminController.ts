import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { getStringParam, getStringQuery, getNumberQuery } from '../utils/request';
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
        name: user.name,
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
export const getDashboardStats = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const prismaClient = prisma as any;
    
    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      onlineRevenue,
      posRevenue,
      recentOrders,
      pendingMessages,
      unreadNotifications,
      posSessionsToday,
    ] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.order.count().catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCEEDED',
        },
      }).catch(() => ({ _sum: { amount: null } })),
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
      }).catch(() => ({ _sum: { amount: null } })),
      // POS revenue
      prismaClient.posTransaction?.aggregate({
        _sum: {
          total: true,
        },
        where: {
          transactionType: 'SALE',
        },
      }).catch(() => ({ _sum: { total: null } })) || Promise.resolve({ _sum: { total: null } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }).catch(() => []),
      // Safely handle optional models
      (prismaClient.contactMessage?.count ? prismaClient.contactMessage.count({
        where: { status: 'PENDING' },
      }).catch(() => 0) : Promise.resolve(0)),
      (prismaClient.notification?.count ? prismaClient.notification.count({
        where: { read: false },
      }).catch(() => 0) : Promise.resolve(0)),
      // POS sessions today
      (prismaClient.posSession?.count ? prismaClient.posSession.count({
        where: {
          openedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }).catch(() => 0) : Promise.resolve(0)),
    ]);

    res.json({
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue._sum.amount || 0,
        onlineRevenue: onlineRevenue._sum.amount || 0,
        posRevenue: posRevenue._sum?.total || 0,
        pendingMessages,
        unreadNotifications,
        posSessionsToday: posSessionsToday || 0,
      },
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

// Get all products (admin view - includes inactive)
export const getAllProducts = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      getNumberQuery(req, 'page', 1),
      getNumberQuery(req, 'limit', 50),
      50,
      100
    );
    const search = getStringQuery(req, 'search');

    const where: {
      OR?: Array<{ name?: { contains: string; mode?: 'insensitive' }; description?: { contains: string; mode?: 'insensitive' }; sku?: { contains: string; mode?: 'insensitive' } }>;
    } = {};
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' as const } },
        { description: { contains: searchTerm, mode: 'insensitive' as const } },
        { sku: { contains: searchTerm, mode: 'insensitive' as const } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({ where }),
    ]);

    const response = formatPaginationResponse(products, total, page, limit);
    
    res.json({
      products: response.data,
      pagination: response.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Update product price
export const updateProductPrice = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');
    const { price, comparePrice } = req.body;

    if (!id) {
      throw new AppError('Product ID is required', 400);
    }

    if (price === undefined || price === null) {
      throw new AppError('Price is required', 400);
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      throw new AppError('Price must be a non-negative number', 400);
    }

    const updateData: any = { price: priceValue };

    if (comparePrice !== undefined) {
      if (comparePrice === null || comparePrice === '') {
        updateData.comparePrice = null;
      } else {
        const comparePriceValue = parseFloat(comparePrice);
        if (isNaN(comparePriceValue) || comparePriceValue < 0) {
          throw new AppError('Compare price must be a non-negative number', 400);
        }
        updateData.comparePrice = comparePriceValue;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json(product);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Product not found', 404));
    }
    next(error);
  }
};

// Delete product
export const deleteProduct = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');

    if (!id) {
      throw new AppError('Product ID is required', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Product not found', 404));
    }
    next(error);
  }
};

// Get all orders (admin view)
export const getAllOrders = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const page = getNumberQuery(req, 'page', 1) || 1;
    const limit = getNumberQuery(req, 'limit', 50) || 50;
    const skip = (page - 1) * limit;
    const status = getStringQuery(req, 'status');
    const source = getStringQuery(req, 'source'); // 'ONLINE' or 'POS'

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (source) {
      where.source = source;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  imageUrls: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const where: import('@prisma/client').Prisma.UserWhereInput = {
      role: { not: 'MASTERMIND' },
    };
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { name: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
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

// Update promotional discount settings (admin only, but feature must be enabled by mastermind)
export const updatePromotionalDiscount = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const prismaClient = prisma as any;
    
    // Check if feature is enabled
    let config = await prismaClient.storeConfig?.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      throw new AppError('Store configuration not found', 404);
    }

    if (!config.promotionalDiscountEnabled) {
      throw new AppError('Promotional discount feature is not enabled by mastermind user', 403);
    }

    const updateData: any = {};

    if (req.body.promotionalDiscountType !== undefined) {
      if (req.body.promotionalDiscountType !== 'percentage' && req.body.promotionalDiscountType !== 'fixed' && req.body.promotionalDiscountType !== null) {
        throw new AppError('promotionalDiscountType must be "percentage" or "fixed"', 400);
      }
      updateData.promotionalDiscountType = req.body.promotionalDiscountType === null || req.body.promotionalDiscountType === '' ? null : req.body.promotionalDiscountType;
    }
    if (req.body.promotionalDiscountValue !== undefined) {
      const value = parseFloat(String(req.body.promotionalDiscountValue));
      updateData.promotionalDiscountValue = isNaN(value) || value < 0 ? null : value;
    }
    if (req.body.promotionalDiscountValidFrom !== undefined) {
      updateData.promotionalDiscountValidFrom = req.body.promotionalDiscountValidFrom ? new Date(req.body.promotionalDiscountValidFrom) : null;
    }
    if (req.body.promotionalDiscountValidUntil !== undefined) {
      updateData.promotionalDiscountValidUntil = req.body.promotionalDiscountValidUntil ? new Date(req.body.promotionalDiscountValidUntil) : null;
    }
    if (req.body.promotionalDiscountActive !== undefined) {
      updateData.promotionalDiscountActive = Boolean(req.body.promotionalDiscountActive);
    }

    config = await prismaClient.storeConfig?.update({
      where: { id: config.id },
      data: updateData,
    });

    res.json(config);
  } catch (error) {
    next(error);
  }
};
