import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllProducts = async () => {
  return prisma.product.findMany();
};

export const createProduct = async (data: {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  quantity?: number;
}) => {
  return prisma.product.create({ data });
};

export const updateProduct = async (id: string, data: Partial<{
  name: string;
  description: string;
  price: number;
  sku: string;
  quantity: number;
}>) => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    return null;
  }
  return prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    return false;
  }
  await prisma.product.delete({ where: { id } });
  return true;
};