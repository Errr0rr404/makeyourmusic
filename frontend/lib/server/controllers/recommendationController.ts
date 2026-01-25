import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { getNumberQuery } from '../utils/request';

// Get related products - uses product relations first, then same category, then featured
export const getRelatedProducts = async (req: NextRequest, context: { params: { productId: string } }): Promise<NextResponse> => {
  const productId = context.params.productId;
  const limit = getNumberQuery(req, 'limit', 4) || 4;
  
  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }

  try {
    const prismaClient = prisma as unknown as Record<string, {
      findMany: (args: unknown) => Promise<unknown[]>;
    }>;
    let relatedProducts: Record<string, unknown>[] = [];

    // First, try to get products from product_relations
    try {
      const relations = await prismaClient.productRelation?.findMany({
        where: { productId },
        include: {
          related: {
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
        take: limit,
      }) as Array<{ related: Record<string, unknown> }> || [];

      relatedProducts = relations.map(r => r.related).filter(Boolean);
    } catch {
      // ProductRelation model might not exist, continue with fallback
      relatedProducts = [];
    }

    // If not enough related products, get products from same category
    if (relatedProducts.length < limit) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { categoryId: true },
      });

      if (product?.categoryId) {
        const categoryProducts = await prisma.product.findMany({
          where: {
            categoryId: product.categoryId,
            id: { not: productId },
            active: true,
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          take: limit - relatedProducts.length,
        });

        // Filter out duplicates
        const existingIds = new Set(relatedProducts.map(p => p.id));
        const newProducts = (categoryProducts as unknown as Record<string, unknown>[]).filter((p) => !existingIds.has(p.id));
        relatedProducts = [...relatedProducts, ...newProducts];
      }
    }

    // If still not enough, get featured products
    if (relatedProducts.length < limit) {
      const featuredProducts = await prisma.product.findMany({
        where: {
          id: { notIn: [productId, ...relatedProducts.map(p => p.id as string)] },
          active: true,
          featured: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: limit - relatedProducts.length,
      });

      relatedProducts = [...relatedProducts, ...featuredProducts];
    }

    return NextResponse.json({ products: relatedProducts.slice(0, limit) });
  } catch (error) {
    console.error('Error fetching related products:', error);
    // Return empty array on error rather than failing
    return NextResponse.json({ products: [] });
  }
};
