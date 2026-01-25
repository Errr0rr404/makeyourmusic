import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { requireCRMAccess } from '../middleware/authHelpers';

// Get leads
export const getLeads = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assignedTo');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        opportunities: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create lead
export const createLead = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { firstName, lastName, name, email, phone, source } = body;

  // Construct name from firstName/lastName if name not provided
  const leadName = name || [firstName, lastName].filter(Boolean).join(' ');

  if (!leadName) {
    throw new AppError('Name is required (provide name or firstName/lastName)', 400);
  }

  if (!email && !phone) {
    throw new AppError('Email or phone is required', 400);
  }

  const lead = await prisma.lead.create({
    data: {
      name: leadName,
      email,
      phone,
      source: source || 'WEBSITE',
      status: 'NEW',
      createdBy: user.userId,
    },
  });

  return NextResponse.json(lead);
};

// Update lead
export const updateLead = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const params = await context.params;
  const { id } = params;
  const body = await req.json();

  // Check if lead exists
  const existingLead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!existingLead) {
    throw new AppError('Lead not found', 404);
  }

  // Validate status if provided
  if (body.status && !['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST'].includes(body.status)) {
    throw new AppError('Invalid status', 400);
  }

  // Only allow updating valid Lead fields
  const { name, email, phone, source, status } = body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (source !== undefined) updateData.source = source;
  if (status !== undefined) updateData.status = status;

  const lead = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(lead);
};

// Get opportunities
export const getOpportunities = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const stage = searchParams.get('stage');
  const assignedTo = searchParams.get('assignedTo');

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;
  if (assignedTo) where.assignedTo = assignedTo;

  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: true,
      },
    }),
    prisma.opportunity.count({ where }),
  ]);

  return NextResponse.json({
    opportunities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create opportunity
export const createOpportunity = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { leadId, name, stage, amount, expectedCloseDate } = body;

  if (!name || amount === undefined || amount === null) {
    throw new AppError('Name and amount are required', 400);
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    throw new AppError('Amount must be a valid positive number', 400);
  }

  // Validate stage
  const validStages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  const finalStage = stage || 'PROSPECTING';
  if (!validStages.includes(finalStage)) {
    throw new AppError(`Invalid stage. Must be one of: ${validStages.join(', ')}`, 400);
  }

  // Validate lead exists if provided
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      leadId: leadId || null,
      name,
      stage: finalStage,
      amount: amountNum,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      createdBy: user.userId,
    },
    include: {
      lead: true,
    },
  });

  return NextResponse.json(opportunity);
};

// Update opportunity
export const updateOpportunity = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const params = await context.params;
  const { id } = params;
  const body = await req.json();

  // Check if opportunity exists
  const existingOpportunity = await prisma.opportunity.findUnique({
    where: { id },
  });

  if (!existingOpportunity) {
    throw new AppError('Opportunity not found', 404);
  }

  // Validate stage if provided
  if (body.stage && !['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'].includes(body.stage)) {
    throw new AppError('Invalid stage', 400);
  }

  // Only allow updating valid Opportunity fields
  const { name, stage, amount, expectedCloseDate, leadId } = body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (stage !== undefined) updateData.stage = stage;
  if (amount !== undefined) updateData.amount = Number(amount);
  if (expectedCloseDate !== undefined) updateData.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
  if (leadId !== undefined) updateData.leadId = leadId;

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(opportunity);
};

// Get campaigns (Campaign model not yet implemented in schema)
export const getCampaigns = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  // Return empty result since Campaign model is not yet available
  return NextResponse.json({
    campaigns: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
    message: 'Campaign feature coming soon',
  });
};

// Create campaign (Campaign model not yet implemented in schema)
export const createCampaign = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  throw new AppError('Campaign feature is not yet available', 501);
};
