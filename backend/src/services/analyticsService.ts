import { PrismaClient, InvoiceStatus, LeadStatus } from '@prisma/client';
import { startOfMonth, subMonths } from 'date-fns';

const prisma = new PrismaClient();

export const getDashboardAnalytics = async () => {
  const today = new Date();
  const startOfThisMonth = startOfMonth(today);

  // 1. Total Revenue (from paid invoices)
  const totalRevenue = await prisma.invoice.aggregate({
    _sum: {
      total: true,
    },
    where: {
      status: InvoiceStatus.PAID,
    },
  });

  // 2. New Leads this month
  const newLeadsThisMonth = await prisma.lead.count({
    where: {
      createdAt: {
        gte: startOfThisMonth,
      },
    },
  });

  // 3. Lead Conversion Rate
  const qualifiedLeads = await prisma.lead.count({
    where: {
      status: LeadStatus.QUALIFIED,
    },
  });
  const totalLeads = await prisma.lead.count();
  const leadConversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

  // 4. Sales by month for the last 6 months
  const salesByMonth = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(today, i);
    const start = startOfMonth(date);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

    const monthlySales = await prisma.invoice.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: InvoiceStatus.PAID,
        issueDate: {
          gte: start,
          lte: end,
        },
      },
    });

    salesByMonth.push({
      name: start.toLocaleString('default', { month: 'short' }),
      total: monthlySales._sum.total || 0,
    });
  }
  
  // 5. Top selling products
  const topProducts = await prisma.invoiceItem.groupBy({
    by: ['description'],
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 5,
  });

  return {
    totalRevenue: totalRevenue._sum.total || 0,
    newLeadsThisMonth,
    leadConversionRate,
    salesByMonth,
    topProducts: topProducts.map(p => ({ name: p.description, quantity: p._sum.quantity })),
  };
};