import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';

export const getCategories = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null, // Only top-level categories
      },
      include: {
        children: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    throw new AppError('Failed to fetch categories', 500);
  }
};

export const getCategory = async (req: NextRequest, params: { slug: string }): Promise<NextResponse> => {
  try {
    const { slug } = params;
    
    if (!slug) {
      throw new AppError('Category slug is required', 400);
    }

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch category', 500);
  }
};
