import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { authenticate, requireManager } from '../middleware/auth';
import { getStringQuery, getNumberQuery } from '../utils/request';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';

// Local enum definitions for POS system (not part of ERP schema)
enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED'
}

enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// Type workaround for Prisma client with POS models
const prismaClient = prisma as any;

// Generate unique order number
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `POS-${timestamp}-${random}`;
};

// Create a new POS session
export const createSession = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posSession) {
    throw new AppError('POS system is not available', 503);
  }

  const body = await req.json();
  const { openingBalance = 0 } = body;

  // Check if there's an active session
  const activeSession = await prismaClient.posSession.findFirst({
    where: {
      managerId,
      status: 'ACTIVE',
    },
  });

  if (activeSession) {
    throw new AppError('You already have an active POS session', 400);
  }

  // Validate opening balance
  const openingBalanceNum = parseFloat(String(openingBalance));
  if (isNaN(openingBalanceNum) || openingBalanceNum < 0) {
    throw new AppError('Opening balance must be a valid non-negative number', 400);
  }

  const session = await prismaClient.posSession.create({
    data: {
      managerId,
      status: 'ACTIVE',
      openingBalance: openingBalanceNum,
    },
  });

  return NextResponse.json({ session }, { status: 201 });
};

// Get active session
export const getActiveSession = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posSession || !prismaClient.posTransaction) {
    return NextResponse.json({ session: null });
  }

  const session = await prismaClient.posSession.findFirst({
    where: {
      managerId,
      status: 'ACTIVE',
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ session: null });
  }

  // Calculate expected cash (opening balance + cash transactions)
  const cashTransactions = await prismaClient.posTransaction.aggregate({
    where: {
      sessionId: session.id,
      paymentMethod: { in: ['CASH', 'MIXED'] },
      transactionType: 'SALE',
    },
    _sum: {
      cashAmount: true,
    },
  });

  const expectedCash = Number(session.openingBalance) + (Number(cashTransactions._sum.cashAmount) || 0);

  return NextResponse.json({
    session: {
      ...session,
      expectedCash,
    },
  });
};

// Get held orders
export const getHeldOrders = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posSession) {
    return NextResponse.json({ heldOrders: [] });
  }

  // Get active session
  const session = await prismaClient.posSession.findFirst({
    where: {
      managerId,
      status: 'ACTIVE',
    },
  });

  if (!session) {
    return NextResponse.json({ heldOrders: [] });
  }

  let heldOrders: any[] = [];
  try {
    heldOrders = session.heldOrders ? JSON.parse(session.heldOrders) : [];
  } catch {
    heldOrders = [];
  }

  return NextResponse.json({ heldOrders });
};

// Search products for POS
export const searchProducts = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const search = getStringQuery(req, 'search');
  const limit = getNumberQuery(req, 'limit', 50);

  const where: any = {
    active: true,
  };

  if (search && search.trim().length > 0) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { sku: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      imageUrls: true,
      sku: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: limit,
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json({ products });
};

// Get session history
export const getSessionHistory = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posSession) {
    return NextResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  }

  const { page, limit, skip } = getPaginationParams(
    getNumberQuery(req, 'page', 1),
    getNumberQuery(req, 'limit', 20),
    20,
    100
  );

  const [sessions, total] = await Promise.all([
    prismaClient.posSession.findMany({
      where: {
        managerId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prismaClient.posSession.count({
      where: {
        managerId,
      },
    }),
  ]);

  const response = formatPaginationResponse(sessions, total, page, limit);
  return NextResponse.json(response);
};

// Process payment/checkout
export const processPayment = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posSession || !prismaClient.posTransaction) {
    throw new AppError('POS system is not available', 503);
  }

  const body = await req.json();
  const {
    items,
    paymentMethod,
    cashAmount,
    cardAmount,
    discount = 0,
    tax = 0,
    customerEmail,
    customerName,
    notes,
  } = body;

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items are required', 400);
  }

  // Validate payment method
  if (!['CASH', 'CARD', 'MIXED'].includes(paymentMethod)) {
    throw new AppError('Invalid payment method', 400);
  }

  // Get active session
  const session = await prismaClient.posSession.findFirst({
    where: {
      managerId,
      status: 'ACTIVE',
    },
  });

  if (!session) {
    throw new AppError('No active POS session. Please open a session first.', 400);
  }

  // Validate and calculate totals
  let subtotal = 0;
  const orderItems: any[] = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new AppError('Invalid item data', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product || !product.active) {
      throw new AppError(`Product ${item.productId} not found or inactive`, 404);
    }

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400);
    }

    const itemPrice = Number(product.price);
    const itemSubtotal = itemPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      priceAtPurchase: product.price,
      variantId: item.variantId || null,
    });
  }

  if (subtotal <= 0) {
    throw new AppError('Subtotal must be greater than zero', 400);
  }

  const discountAmount = Math.min(parseFloat(String(discount)) || 0, subtotal);
  const taxAmount = parseFloat(String(tax)) || 0;
  const total = subtotal - discountAmount + taxAmount;

  // Validate payment amounts
  if (paymentMethod === 'CASH') {
    if (!cashAmount || parseFloat(String(cashAmount)) < total) {
      throw new AppError('Cash amount must be greater than or equal to total', 400);
    }
  } else if (paymentMethod === 'CARD') {
    if (!cardAmount || Math.abs(parseFloat(String(cardAmount)) - total) > 0.01) {
      throw new AppError('Card amount must equal total', 400);
    }
  } else if (paymentMethod === 'MIXED') {
    const cash = parseFloat(String(cashAmount)) || 0;
    const card = parseFloat(String(cardAmount)) || 0;
    if (Math.abs(cash + card - total) > 0.01) {
      throw new AppError('Cash and card amounts must equal total', 400);
    }
    if (cash < 0 || card < 0) {
      throw new AppError('Payment amounts cannot be negative', 400);
    }
    if (cash === 0 && card === 0) {
      throw new AppError('At least one payment amount must be greater than zero', 400);
    }
  }

  // Create order and transaction in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Generate unique order number
    let orderNumber = generateOrderNumber();
    let exists = await tx.order.findUnique({ where: { orderNumber } as any });
    while (exists) {
      orderNumber = generateOrderNumber();
      exists = await tx.order.findUnique({ where: { orderNumber } as any });
    }

    // Create order
    const order = await tx.order.create({
      data: {
        userId: managerId, // Use manager as user for POS orders
        orderNumber: orderNumber as any,
        subtotal: subtotal as any,
        discount: discountAmount as any,
        shippingCost: 0 as any,
        totalAmount: total as any,
        status: OrderStatus.DELIVERED, // POS orders are immediately delivered
        deliveryMethod: 'PICKUP' as any,
        paymentTiming: 'PAY_NOW' as any,
        billingAddress: {
          name: customerName || 'Walk-in Customer',
          line1: 'In-Store Purchase',
          city: 'N/A',
          state: 'N/A',
          postal_code: 'N/A',
          country: 'N/A',
        } as any,
        source: 'POS' as any,
        posSessionId: session.id,
        orderItems: {
          create: orderItems,
        },
        statusHistory: {
          create: {
            status: OrderStatus.DELIVERED,
            note: 'POS transaction completed',
          },
        } as any,
      } as any,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Create POS transaction
    const posTransaction = await (tx as any).posTransaction.create({
      data: {
        sessionId: session.id,
        orderId: order.id,
        transactionType: 'SALE',
        paymentMethod: paymentMethod,
        subtotal: subtotal as any,
        tax: taxAmount as any,
        discount: discountAmount as any,
        total: total as any,
        cashAmount: paymentMethod === 'CASH' || paymentMethod === 'MIXED' ? (parseFloat(String(cashAmount)) || 0) as any : 0,
        cardAmount: paymentMethod === 'CARD' || paymentMethod === 'MIXED' ? (parseFloat(String(cardAmount)) || 0) as any : 0,
        customerEmail: customerEmail || null,
        customerName: customerName || null,
        notes: notes || null,
      },
    });

    // Update order with posTransactionId
    await tx.order.update({
      where: { id: order.id },
      data: {
        posTransactionId: posTransaction.id,
      } as any,
    });

    // Update product stock
    await Promise.all(
      orderItems.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      )
    );

    // Create payment record
    // For MIXED payments, use STRIPE as the primary method but store breakdown in gatewayResponse
    const paymentMethodForRecord = paymentMethod === 'CASH' ? 'CASH' : 'STRIPE';
    await (tx as any).payment.create({
      data: {
        orderId: order.id,
        paymentMethod: paymentMethodForRecord,
        amount: total as any,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        gatewayResponse: {
          posTransaction: true,
          posPaymentMethod: paymentMethod,
          cashAmount: paymentMethod === 'CASH' || paymentMethod === 'MIXED' ? parseFloat(String(cashAmount)) : null,
          cardAmount: paymentMethod === 'CARD' || paymentMethod === 'MIXED' ? parseFloat(String(cardAmount)) : null,
        } as any,
      },
    });

    return { order, posTransaction };
  });

  return NextResponse.json(
    {
      order: result.order,
      transaction: result.posTransaction,
      change: paymentMethod === 'CASH' ? parseFloat(String(cashAmount)) - total : 0,
    },
    { status: 201 }
  );
};

// Get dashboard statistics
export const getDashboardStats = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posTransaction) {
    return NextResponse.json({
      today: {
        sales: 0,
        transactions: 0,
        averageOrderValue: 0,
        salesGrowth: 0,
        transactionGrowth: 0,
      },
      yesterday: {
        sales: 0,
        transactions: 0,
        averageOrderValue: 0,
      },
      last30Days: {
        totalSales: 0,
        totalTransactions: 0,
        totalSuccessfulAmount: 0,
        successfulTransactions: 0,
      },
      paymentMethods: {
        CASH: 0,
        CARD: 0,
        MIXED: 0,
      },
      topProducts: [],
      lowStock: [],
      recentTransactions: [],
      charts: {
        last7Days: [],
        last24Hours: [],
        last12Months: [],
      },
    });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  const last30DaysStart = new Date(todayStart);
  last30DaysStart.setDate(last30DaysStart.getDate() - 30);

  // Today's stats
  const todayTransactions = await prismaClient.posTransaction.findMany({
    where: {
      session: {
        managerId,
      },
      transactionType: 'SALE',
      createdAt: { gte: todayStart },
    },
    include: {
      order: {
        include: {
          orderItems: true,
        },
      },
    },
  });

  const todaySales = todayTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0);
  const todayCount = todayTransactions.length;
  const todayAvgOrder = todayCount > 0 ? todaySales / todayCount : 0;

  // Yesterday's stats
  const yesterdayTransactions = await prismaClient.posTransaction.findMany({
    where: {
      session: {
        managerId,
      },
      transactionType: 'SALE',
      createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
    },
  });

  const yesterdaySales = yesterdayTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0);
  const yesterdayCount = yesterdayTransactions.length;
  const yesterdayAvgOrder = yesterdayCount > 0 ? yesterdaySales / yesterdayCount : 0;

  // Calculate growth
  const salesGrowth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
  const transactionGrowth = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0;

  // Last 30 days stats
  const last30DaysTransactions = await prismaClient.posTransaction.findMany({
    where: {
      session: {
        managerId,
      },
      transactionType: 'SALE',
      createdAt: { gte: last30DaysStart },
    },
  });

  const last30DaysSales = last30DaysTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0);
  const successfulTransactions = last30DaysTransactions.filter((t: any) => t.total > 0);
  const successfulAmount = successfulTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0);

  // Payment methods breakdown
  const paymentMethods = {
    CASH: last30DaysTransactions
      .filter((t: any) => t.paymentMethod === 'CASH')
      .reduce((sum: number, t: any) => sum + Number(t.cashAmount || t.total || 0), 0),
    CARD: last30DaysTransactions
      .filter((t: any) => t.paymentMethod === 'CARD')
      .reduce((sum: number, t: any) => sum + Number(t.cardAmount || t.total || 0), 0),
    MIXED: last30DaysTransactions
      .filter((t: any) => t.paymentMethod === 'MIXED')
      .reduce((sum: number, t: any) => sum + Number(t.total || 0), 0),
  };

  // Top products (last 30 days)
  // First, get all POS transactions for this manager in the last 30 days
  const relevantTransactions = await prismaClient.posTransaction.findMany({
    where: {
      session: {
        managerId,
      },
      createdAt: { gte: last30DaysStart },
      transactionType: 'SALE',
    },
    select: {
      orderId: true,
    },
  });

  const relevantOrderIds = relevantTransactions
    .map((t: any) => t.orderId)
    .filter((id: string | null) => id !== null);

  const orderItems = relevantOrderIds.length > 0
    ? await prisma.orderItem.findMany({
        where: {
          orderId: { in: relevantOrderIds },
        },
        include: {
          product: true,
        },
      })
    : [];

  const productMap = new Map<string, { quantity: number; revenue: number; name: string }>();
  orderItems.forEach((item: any) => {
    const productId = item.productId;
    const quantity = item.quantity;
    const price = Number(item.product.price);
    const revenue = quantity * price;

    if (productMap.has(productId)) {
      const existing = productMap.get(productId)!;
      existing.quantity += quantity;
      existing.revenue += revenue;
    } else {
      productMap.set(productId, {
        quantity,
        revenue,
        name: item.product.name,
      });
    }
  });

  const topProducts = Array.from(productMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      active: true,
      stock: { lte: 10 },
    },
    select: {
      id: true,
      name: true,
      stock: true,
    },
    orderBy: {
      stock: 'asc',
    },
    take: 10,
  });

  // Recent transactions
  const recentTransactions = await prismaClient.posTransaction.findMany({
    where: {
      session: {
        managerId,
      },
      transactionType: 'SALE',
    },
    include: {
      order: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  // Time-series data for charts
  // Last 7 days sales
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - (6 - i));
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    const dayTransactions = await prismaClient.posTransaction.findMany({
      where: {
        session: {
          managerId,
        },
        transactionType: 'SALE',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });
    
    const daySales = dayTransactions.reduce((sum: number, t: any) => sum + Number(t.total || 0), 0);
    last7Days.push({
      date: dayStart.toISOString().split('T')[0],
      sales: daySales,
      transactions: dayTransactions.length,
    });
  }

  // Last 24 hours (hourly)
  const last24Hours = [];
  const nowHour = now.getHours();
  for (let i = 23; i >= 0; i--) {
    const hour = (nowHour - i + 24) % 24;
    const date = new Date(now);
    date.setHours(hour, 0, 0, 0);
    const hourStart = new Date(date);
    const hourEnd = new Date(date);
    hourEnd.setHours(hourEnd.getHours() + 1, 0, 0, -1);
    
    const hourTransactions = await prismaClient.posTransaction.findMany({
      where: {
        session: {
          managerId,
        },
        transactionType: 'SALE',
        createdAt: { gte: hourStart, lte: hourEnd },
      },
    });
    
    const hourSales = hourTransactions.reduce((sum: number, t: any) => sum + Number(t.total || 0), 0);
    last24Hours.push({
      hour: hour,
      sales: hourSales,
      transactions: hourTransactions.length,
    });
  }

  // Last 12 months (monthly)
  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthTransactions = await prismaClient.posTransaction.findMany({
      where: {
        session: {
          managerId,
        },
        transactionType: 'SALE',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });
    
    const monthSales = monthTransactions.reduce((sum: number, t: any) => sum + Number(t.total || 0), 0);
    last12Months.push({
      month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
      sales: monthSales,
      transactions: monthTransactions.length,
    });
  }

  return NextResponse.json({
    today: {
      sales: todaySales,
      transactions: todayCount,
      averageOrderValue: todayAvgOrder,
      salesGrowth,
      transactionGrowth,
    },
    yesterday: {
      sales: yesterdaySales,
      transactions: yesterdayCount,
      averageOrderValue: yesterdayAvgOrder,
    },
    last30Days: {
      totalSales: last30DaysSales,
      totalTransactions: last30DaysTransactions.length,
      totalSuccessfulAmount: successfulAmount,
      successfulTransactions: successfulTransactions.length,
    },
    paymentMethods,
    topProducts,
    lowStock: lowStockProducts,
    recentTransactions: recentTransactions
      .filter((t: any) => t.order) // Filter out transactions without orders
      .map((t: any) => ({
        id: t.id,
        orderNumber: t.order.orderNumber,
        total: t.total,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
      })),
    charts: {
      last7Days,
      last24Hours,
      last12Months,
    },
  });
};

// Get transaction history
export const getTransactionHistory = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posTransaction) {
    return NextResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  }

  const { page, limit, skip } = getPaginationParams(
    getNumberQuery(req, 'page', 1),
    getNumberQuery(req, 'limit', 50),
    50,
    100
  );
  const sessionId = getStringQuery(req, 'sessionId');

  const where: any = {};
  if (sessionId) {
    where.sessionId = sessionId;
  } else {
    // Get all sessions for this manager
    const sessions = await prismaClient.posSession.findMany({
      where: { managerId },
      select: { id: true },
    });
    where.sessionId = { in: sessions.map((s: any) => s.id) };
  }

  const [transactions, total] = await Promise.all([
    prismaClient.posTransaction.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            openedAt: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrls: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prismaClient.posTransaction.count({ where }),
  ]);

  const response = formatPaginationResponse(transactions, total, page, limit);
  return NextResponse.json(response);
};

// Get customers who have made POS transactions
export const getCustomers = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const managerCheck = requireManager(user);
  if (managerCheck) {
    return managerCheck;
  }

  const managerId = user.userId;

  // Check if POS models exist (defensive programming)
  if (!prismaClient.posTransaction) {
    return NextResponse.json({ customers: [] });
  }

  // Get all transactions with customer info
  const transactions = await prismaClient.posTransaction.findMany({
    where: {
      session: {
        managerId,
      },
      transactionType: 'SALE',
      OR: [
        { customerEmail: { not: null } },
        { customerName: { not: null } },
      ],
    },
    include: {
      order: {
        include: {
          orderItems: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Group by customer email
  const customerMap = new Map<string, any>();
  
  transactions.forEach((t: any) => {
    const email = t.customerEmail || `guest-${t.id}`;
    const name = t.customerName || 'Guest Customer';
    
    if (!customerMap.has(email)) {
      customerMap.set(email, {
        id: email,
        name,
        email: email.startsWith('guest-') ? null : email,
        phone: null,
        createdAt: t.createdAt,
        _count: { orders: 0 },
        orders: [],
      });
    }
    
    const customer = customerMap.get(email)!;
    customer._count.orders += 1;
    customer.orders.push({
      id: t.order.id,
      orderNumber: t.order.orderNumber,
      totalAmount: t.total.toString(),
      createdAt: t.createdAt,
      status: 'COMPLETED',
    });
  });

  const customers = Array.from(customerMap.values());
  return NextResponse.json({ customers });
};
