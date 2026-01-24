import { PrismaClient, Invoice, InvoiceItem } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllInvoices = async (): Promise<Invoice[]> => {
  return prisma.invoice.findMany({ include: { items: true } });
};

export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  return prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
};

type InvoiceCreateData = Omit<Invoice, 'id' | 'createdAt' | 'total'> & {
  items: Omit<InvoiceItem, 'id' | 'invoiceId' | 'createdAt' | 'total'>[];
};

export const createInvoice = async (data: InvoiceCreateData): Promise<Invoice> => {
  const { items, ...invoiceData } = data;

  const total = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  return prisma.invoice.create({
    data: {
      ...invoiceData,
      total,
      items: {
        create: items.map(item => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });
};

export const updateInvoice = async (id: string, data: Partial<Invoice>): Promise<Invoice | null> => {
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