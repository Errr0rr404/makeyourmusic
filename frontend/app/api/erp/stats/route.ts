import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ERP access
    const hasERPAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'HR_MANAGER', 'SALES_MANAGER', 
                          'OPERATIONS_MANAGER', 'PROJECT_MANAGER', 'ANALYST'].includes(user.role);
    
    if (!hasERPAccess) {
      return NextResponse.json({ error: 'Forbidden - ERP access required' }, { status: 403 });
    }

    // Calculate ERP statistics
    const [
      totalRevenue,
      totalExpenses,
      activeProjects,
      openOpportunities,
      activeLeads,
      pendingInvoices,
      overdueInvoices,
      totalCustomers,
      totalEmployees,
    ] = await Promise.all([
      // Total Revenue (from payments and POS transactions)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCEEDED' },
      }).then(r => Number(r._sum.amount || 0))
        .catch(() => 0),
      
      // Total Expenses (from accounting transactions - expense accounts)
      prisma.accountingTransaction.aggregate({
        _sum: { debit: true },
        where: {
          account: {
            accountType: 'EXPENSE',
          },
        },
      }).then(r => Number(r._sum.debit || 0))
        .catch(() => 0),
      
      // Active Projects
      prisma.project.count({
        where: { status: 'IN_PROGRESS' },
      }).catch(() => 0),
      
      // Open Opportunities
      prisma.opportunity.count({
        where: {
          stage: {
            not: 'CLOSED_WON',
          },
        },
      }).catch(() => 0),
      
      // Active Leads
      prisma.lead.count({
        where: {
          status: {
            notIn: ['CLOSED_WON', 'CLOSED_LOST'],
          },
        },
      }).catch(() => 0),
      
      // Pending Invoices
      prisma.invoice.count({
        where: {
          status: {
            in: ['DRAFT', 'SENT'],
          },
        },
      }).catch(() => 0),
      
      // Overdue Invoices
      prisma.invoice.count({
        where: {
          status: {
            in: ['SENT', 'PARTIAL'],
          },
          dueDate: {
            lt: new Date(),
          },
        },
      }).catch(() => 0),
      
      // Total Customers
      prisma.user.count({
        where: { role: 'CUSTOMER' },
      }).catch(() => 0),
      
      // Total Employees
      prisma.posEmployee.count({
        where: { isActive: true },
      }).catch(() => 0),
    ]);

    const netProfit = Math.max(0, totalRevenue - totalExpenses);

    // AI Insights (simplified - would use actual ML models in production)
    const salesForecast = Math.max(0, totalRevenue * 1.15); // 15% growth forecast
    const churnRisk = Math.min(100, Math.max(0, Math.random() * 20)); // 0-20% churn risk
    
    // Get top opportunity
    const topOpportunity = await prisma.opportunity.findFirst({
      where: {
        stage: {
          not: 'CLOSED_WON',
        },
      },
      orderBy: {
        amount: 'desc',
      },
      select: {
        name: true,
      },
    }).catch(() => null);
    
    // Ensure all values are valid numbers
    const safeStats = {
      totalRevenue: Number(totalRevenue) || 0,
      totalExpenses: Number(totalExpenses) || 0,
      netProfit: Number(netProfit) || 0,
      activeProjects: Number(activeProjects) || 0,
      openOpportunities: Number(openOpportunities) || 0,
      activeLeads: Number(activeLeads) || 0,
      pendingInvoices: Number(pendingInvoices) || 0,
      overdueInvoices: Number(overdueInvoices) || 0,
      totalCustomers: Number(totalCustomers) || 0,
      totalEmployees: Number(totalEmployees) || 0,
      aiInsights: {
        salesForecast: Number(salesForecast) || 0,
        churnRisk: Math.round(Number(churnRisk) || 0),
        topOpportunity: topOpportunity?.name || 'No opportunities',
      },
    };

    return NextResponse.json(safeStats);
  } catch (error) {
    console.error('ERP stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ERP statistics' },
      { status: 500 }
    );
  }
}
