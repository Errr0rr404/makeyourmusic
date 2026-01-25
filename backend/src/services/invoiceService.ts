import { PrismaClient, InvoiceStatus } from '@prisma/client';

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
  status?: InvoiceStatus | string;
  items: InvoiceItemInput[];
};

export const createInvoice = async (data: InvoiceCreateData & { createdBy?: string }) => {
  const { items, createdBy, status, ...invoiceData } = data;

  const total = items.reduce((acc, item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    return acc + (qty * price);
  }, 0);

  // Convert string status to enum if needed
  const invoiceStatus = typeof status === 'string' && status in InvoiceStatus 
    ? (status as InvoiceStatus) 
    : (status as InvoiceStatus) || InvoiceStatus.DRAFT;

  return prisma.invoice.create({
    data: {
      ...invoiceData,
      total,
      status: invoiceStatus,
      createdBy: createdBy || 'system',
      items: {
        create: items.map(item => {
          const qty = Number(item.quantity);
          const price = Number(item.unitPrice);
          return {
            description: item.description,
            quantity: qty,
            unitPrice: price,
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
  status: InvoiceStatus | string;
  total: number;
}>) => {
  const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
  if (!existingInvoice) {
    return null;
  }
  
  // Convert string status to enum if needed
  const updateData: any = { ...data };
  if (data.status && typeof data.status === 'string' && data.status in InvoiceStatus) {
    updateData.status = data.status as InvoiceStatus;
  }
  
  // Handle customerId separately if provided
  if (data.customerId !== undefined) {
    updateData.customerId = data.customerId;
  }
  
  return prisma.invoice.update({
    where: { id },
    data: updateData,
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