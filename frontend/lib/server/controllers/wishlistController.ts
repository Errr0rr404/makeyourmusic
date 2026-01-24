import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { authenticate } from '../middleware/auth';
import { getStringParam } from '../utils/request';

// Helper to check if wishlist is enabled
const isWishlistEnabled = async (): Promise<boolean> => {
  const config = await prisma.storeConfig.findFirst({
    select: { wishlistEnabled: true },
  });
  return config?.wishlistEnabled !== false;
};

export const getWishlist = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check if wishlist is enabled
  const wishlistEnabled = await isWishlistEnabled();
  if (!wishlistEnabled) {
    throw new AppError('Wishlist is not enabled for this store', 403);
  }

  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { userId: user.userId },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({ items: wishlistItems });
};

export const addToWishlist = async (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> | Record<string, string> }
): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check if wishlist is enabled
  const wishlistEnabled = await isWishlistEnabled();
  if (!wishlistEnabled) {
    throw new AppError('Wishlist is not enabled for this store', 403);
  }

  const params = context?.params ? await Promise.resolve(context.params) : {};
  let productId = getStringParam(params, 'productId');
  let sharedWithCompany = false;
  
  // Read body once (if available)
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body might be empty or invalid, that's okay
  }
  
  // If productId is not in params, try to get it from body
  if (!productId) {
    productId = body.productId;
  }
  
  sharedWithCompany = body.sharedWithCompany === true || body.sharedWithCompany === 'true';

  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if already in wishlist
  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId: user.userId,
        productId,
      },
    },
  });

  if (existing) {
    // Update sharedWithCompany if different
    if (existing.sharedWithCompany !== sharedWithCompany) {
      const updated = await prisma.wishlistItem.update({
        where: {
          userId_productId: {
            userId: user.userId,
            productId,
          },
        },
        data: {
          sharedWithCompany,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
      return NextResponse.json({ message: 'Wishlist updated', item: updated });
    }
    return NextResponse.json({ message: 'Already in wishlist', item: existing });
  }

  const wishlistItem = await prisma.wishlistItem.create({
    data: {
      userId: user.userId,
      productId,
      sharedWithCompany,
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  });

  return NextResponse.json({ item: wishlistItem }, { status: 201 });
};

export const removeFromWishlist = async (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> | Record<string, string> }
): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check if wishlist is enabled
  const wishlistEnabled = await isWishlistEnabled();
  if (!wishlistEnabled) {
    throw new AppError('Wishlist is not enabled for this store', 403);
  }

  const params = context?.params ? await Promise.resolve(context.params) : {};
  const productId = getStringParam(params, 'productId');

  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }

  await prisma.wishlistItem.delete({
    where: {
      userId_productId: {
        userId: user.userId,
        productId,
      },
    },
  });

  return NextResponse.json({ message: 'Removed from wishlist' });
};

export const isInWishlist = async (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> | Record<string, string> }
): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check if wishlist is enabled
  const wishlistEnabled = await isWishlistEnabled();
  if (!wishlistEnabled) {
    throw new AppError('Wishlist is not enabled for this store', 403);
  }

  const params = context?.params ? await Promise.resolve(context.params) : {};
  const productId = getStringParam(params, 'productId');

  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }

  const item = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId: user.userId,
        productId,
      },
    },
  });

  return NextResponse.json({ inWishlist: !!item });
};
