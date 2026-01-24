import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type SearchResult = {
  id: string;
  type: 'Lead' | 'Invoice';
  title: string;
  url: string;
};

export const searchAcrossModules = async (query: string): Promise<SearchResult[]> => {
  if (!query) {
    return [];
  }

  const [leads, invoices] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query, mode: 'insensitive' } },
          { customerId: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
    }),
  ]);

  const leadResults: SearchResult[] = leads.map(lead => ({
    id: lead.id,
    type: 'Lead',
    title: lead.name,
    url: `/erp/crm/leads`, // In a real app, you might go to a lead detail page
  }));

  const invoiceResults: SearchResult[] = invoices.map(invoice => ({
    id: invoice.id,
    type: 'Invoice',
    title: `Invoice #${invoice.invoiceNumber}`,
    url: `/erp/accounting/invoices/${invoice.id}`,
  }));

  return [...leadResults, ...invoiceResults];
};