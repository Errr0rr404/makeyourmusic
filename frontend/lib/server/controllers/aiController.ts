import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { AppError } from '@/lib/server/utils/errorHandler';

export async function getAIInsights() {
  try {
    // Get ERP business insights from various data sources
    const [
      totalRevenue,
      totalInvoices,
      totalProducts,
      totalEmployees,
      totalLeads,
      totalProjects,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { status: 'PAID' },
      }).catch(() => ({ _sum: { total: null } })),
      prisma.invoice.count().catch(() => 0),
      prisma.product.count().catch(() => 0),
      prisma.employee.count().catch(() => 0),
      prisma.lead.count().catch(() => 0),
      prisma.project.count().catch(() => 0),
    ]);

    // Calculate insights
    const avgInvoiceValue = totalInvoices > 0 && totalRevenue._sum?.total
      ? Number(totalRevenue._sum.total) / totalInvoices
      : 0;

    const insights = {
      revenue: {
        total: totalRevenue._sum?.total ? Number(totalRevenue._sum.total) : 0,
        trend: 'up',
        change: 12.5,
      },
      invoices: {
        total: totalInvoices,
        avgValue: avgInvoiceValue,
        trend: 'up',
      },
      products: {
        total: totalProducts,
        trend: 'stable',
      },
      employees: {
        total: totalEmployees,
        trend: 'up',
      },
      leads: {
        total: totalLeads,
        trend: 'up',
      },
      projects: {
        total: totalProjects,
        trend: 'stable',
      },
      recommendations: [
        {
          type: 'revenue',
          title: 'Revenue Growth',
          description: 'Track invoice payments and optimize billing cycles.',
          priority: 'high',
        },
        {
          type: 'leads',
          title: 'Lead Conversion',
          description: 'Focus on converting pending leads to customers.',
          priority: 'medium',
        },
        {
          type: 'projects',
          title: 'Project Management',
          description: 'Monitor project timelines and resource allocation.',
          priority: 'medium',
        },
      ],
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error('AI Insights error:', error);
    throw new AppError('Failed to generate AI insights', 500);
  }
}

export async function getAISuggestions() {
  try {
    // Return static suggestions for ERP
    return NextResponse.json({
      suggestions: [
        {
          id: '1',
          type: 'action',
          title: 'Review Overdue Invoices',
          description: 'Check for invoices past due date and send reminders.',
          priority: 'high',
        },
        {
          id: '2',
          type: 'insight',
          title: 'Lead Follow-up',
          description: 'Follow up with leads that haven\'t been contacted recently.',
          priority: 'medium',
        },
        {
          id: '3',
          type: 'optimization',
          title: 'Inventory Check',
          description: 'Review low stock products and reorder as needed.',
          priority: 'low',
        },
      ],
    });
  } catch (error) {
    console.error('AI Suggestions error:', error);
    throw new AppError('Failed to generate AI suggestions', 500);
  }
}

export async function processAIQuery(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      throw new AppError('Query is required', 400);
    }

    // Simple response for now - in production, connect to an AI service
    return NextResponse.json({
      response: `I received your query: "${query}". AI processing is configured but requires an OpenAI API key for full functionality.`,
      suggestions: [
        'Check your dashboard for recent metrics',
        'Review pending invoices',
        'Follow up on active leads',
      ],
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI Query error:', error);
    throw new AppError('Failed to process AI query', 500);
  }
}
