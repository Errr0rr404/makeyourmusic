import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllInvoices = async () => {
  return prisma.invoice.findMany({ include: { items: true } });
};

export const getInvoiceById = async (id: string) => {
  return prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
};

type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceCreateData = {
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  status?: string;
  items: InvoiceItemInput[];
};

export const createInvoice = async (data: InvoiceCreateData) => {
  const { items, ...invoiceData } = data;

  const total = items.reduce((acc, item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    return acc + (qty * price);
  }, 0);

  return prisma.invoice.create({
    data: {
      ...invoiceData,
      total,
      items: {
        create: items.map(item => {
          const qty = Number(item.quantity);
          const price = Number(item.unitPrice);
          return {
            ...item,
            total: qty * price,
          };
        }),
      },
    },
    include: { items: true },
  });
};

export const updateInvoice = async (id: string, data: Partial<{
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  total: number;
}>) => {
  const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
  if (!existingInvoice) {
    return null;
  }
  return prisma.invoice.update({
    where: { id },
    data,
    include: { items: true },
  });
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
  if (!existingInvoice) {
    return false;
  }
  await prisma.invoice.delete({ where: { id } });
  return true;
};