import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { authenticate } from '../middleware/auth';
import { getStringParam } from '../utils/request';

export const getCart = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: user.userId },
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Filter out items with deleted products and calculate total
  // Infer type from query result
  type CartItemWithProduct = typeof cartItems[number];
  const validCartItems = cartItems.filter((item: CartItemWithProduct) => item.product !== null);
  const total = validCartItems.reduce((sum: number, item: CartItemWithProduct) => {
    if (!item.product) return sum;
    return sum + Number(item.product.price) * item.quantity;
  }, 0);

  // Remove invalid cart items (products that no longer exist)
  if (validCartItems.length < cartItems.length) {
    const invalidItemIds = cartItems
      .filter((item: CartItemWithProduct) => !item.product)
      .map((item: CartItemWithProduct) => item.id);
    
    if (invalidItemIds.length > 0) {
      await prisma.cartItem.deleteMany({
        where: {
          id: { in: invalidItemIds },
        },
      });
    }
  }

  // Format items to match frontend expectations
  const formattedItems = validCartItems.map((item: CartItemWithProduct) => ({
    id: item.id,
    quantity: item.quantity,
    product: {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price.toString(),
      imageUrls: item.product.imageUrls || [],
      stock: item.product.stock,
    },
  }));

  return NextResponse.json({
    items: formattedItems,
    total: total.toFixed(2),
  });
};

export const addToCart = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const body = await req.json();
  const { productId, quantity = 1, variantId } = body;

  if (!productId || typeof productId !== 'string') {
    throw new AppError('Product ID is required', 400);
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError('Quantity must be a positive integer', 400);
  }

  // Use transaction to prevent race conditions
  const cartItem = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    // Check product exists and is available
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (!product.active) {
      throw new AppError('Product is not available', 400);
    }

    // Check existing cart item using findFirst since we need to match userId, productId, and variantId
    const existingCartItem = await tx.cartItem.findFirst({
      where: {
        userId: user.userId,
        productId,
        variantId: variantId || null,
      },
    });

    const newQuantity = existingCartItem
      ? existingCartItem.quantity + quantity
      : quantity;

    // Validate quantity
    if (newQuantity <= 0) {
      throw new AppError('Invalid quantity', 400);
    }

    // Check stock availability (re-check in transaction)
    if (product.stock < newQuantity) {
      throw new AppError(
        `Insufficient stock. Available: ${product.stock}, Requested: ${newQuantity}`,
        400
      );
    }

    // Create or update cart item
    if (existingCartItem) {
      return await tx.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: true,
        },
      });
    } else {
      return await tx.cartItem.create({
        data: {
          userId: user.userId,
          productId,
          variantId: variantId || null,
          quantity,
        },
        include: {
          product: true,
        },
      });
    }
  });

  return NextResponse.json({ cartItem }, { status: 201 });
};

export const updateCartItem = async (
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

  const params = context?.params ? (context.params instanceof Promise ? await context.params : context.params) : {};
  const itemId = getStringParam(params, 'itemId');
  
  if (!itemId) {
    throw new AppError('Item ID is required', 400);
  }
  
  const body = await req.json();
  const { quantity } = body;

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError('Quantity must be a positive integer', 400);
  }

  // Use transaction to prevent race conditions
  const updatedCartItem = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const cartItem = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        userId: user.userId,
      },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      throw new AppError('Cart item not found', 404);
    }

    // Re-check product availability
    const product = await tx.product.findUnique({
      where: { id: cartItem.productId },
    });

    if (!product || !product.active) {
      throw new AppError('Product is no longer available', 400);
    }

    if (product.stock < quantity) {
      throw new AppError('Insufficient stock', 400);
    }

    return await tx.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: true,
      },
    });
  });

  return NextResponse.json({ cartItem: updatedCartItem });
};

export const removeFromCart = async (
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

  const params = context?.params ? (context.params instanceof Promise ? await context.params : context.params) : {};
  const itemId = getStringParam(params, 'itemId');
  
  if (!itemId) {
    throw new AppError('Item ID is required', 400);
  }

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      userId: user.userId,
    },
  });

  if (!cartItem) {
    throw new AppError('Cart item not found', 404);
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  return NextResponse.json({ message: 'Cart item removed successfully' });
};

export const clearCart = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  await prisma.cartItem.deleteMany({
    where: { userId: user.userId },
  });

  return NextResponse.json({ message: 'Cart cleared successfully' });
};
