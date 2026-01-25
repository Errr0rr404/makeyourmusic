import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllProducts = async () => {
  return prisma.product.findMany();
};

export const createProduct = async (data: {
  name: string;
  description?: string;
  price: number;
  sku: string;
  stock: number;
  quantity?: number; // Alias for stock for backward compatibility
}) => {
  // Remove quantity and use stock instead
  const { quantity, ...productData } = data;
  
  return prisma.product.create({ 
    data: {
      ...productData,
      stock: data.stock ?? quantity ?? 0,
    } 
  });
};

export const updateProduct = async (id: string, data: Partial<{
  name: string;
  description: string;
  price: number;
  sku: string;
  stock: number;
  quantity?: number; // Alias for stock
}>) => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    return null;
  }
  
  // Convert quantity to stock if provided
  const updateData: any = { ...data };
  if (data.quantity !== undefined && data.stock === undefined) {
    updateData.stock = data.quantity;
    delete updateData.quantity;
  } else if (data.quantity !== undefined) {
    delete updateData.quantity;
  }
  
  return prisma.product.update({
    where: { id },
    data: updateData,
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
