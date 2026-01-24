import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { AppError } from '@/lib/server/utils/errorHandler';

export async function getAIInsights(req: NextRequest) {
  try {
    // Get business insights from various data sources
    const [
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.order.count(),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
    ]);

    // Calculate insights
    const avgOrderValue = totalOrders > 0
      ? (totalRevenue._sum.total || 0) / totalOrders
      : 0;

    // Get top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const insights = {
      revenue: {
        total: totalRevenue._sum.total || 0,
        trend: 'up', // You can calculate actual trends based on historical data
        change: 12.5, // Placeholder percentage
      },
      orders: {
        total: totalOrders,
        avgValue: avgOrderValue,
        trend: 'up',
      },
      products: {
        total: totalProducts,
        topSelling: topProducts.length,
      },
      customers: {
        total: totalCustomers,
        trend: 'up',
      },
      recentActivity: recentOrders.map(order => ({
        id: order.id,
        date: order.createdAt,
        total: order.total,
        itemCount: order.items.length,
      })),
      recommendations: [
        'Consider running a promotion on slow-moving inventory',
        'Customer retention rate is strong - focus on upselling',
        'Peak order times are between 2-4 PM - ensure adequate staffing',
      ],
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    throw new AppError('Failed to fetch AI insights', 500);
  }
}

export async function getAIModels(req: NextRequest) {
  try {
    // Return available AI models/features
    const models = [
      {
        id: 'sales-forecast',
        name: 'Sales Forecasting',
        description: 'Predict future sales trends',
        status: 'active',
      },
      {
        id: 'inventory-optimization',
        name: 'Inventory Optimization',
        description: 'Optimize stock levels',
        status: 'active',
      },
      {
        id: 'customer-segmentation',
        name: 'Customer Segmentation',
        description: 'Group customers by behavior',
        status: 'coming-soon',
      },
    ];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    throw new AppError('Failed to fetch AI models', 500);
  }
}

// Alias for compatibility
export const getModels = getAIModels;

export async function createPrediction(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelId, parameters } = body;

    // Placeholder for AI prediction logic
    const prediction = {
      id: `pred_${Date.now()}`,
      modelId,
      status: 'completed',
      result: {
        forecast: [100, 120, 130, 125, 140],
        confidence: 0.85,
        recommendations: [
          'Stock levels are adequate for the next 2 weeks',
          'Consider promotional activities to boost sales',
        ],
      },
      createdAt: new Date(),
    };

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error creating prediction:', error);
    throw new AppError('Failed to create prediction', 500);
  }
}

