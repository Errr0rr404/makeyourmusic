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

  const where: any = {};
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
  const { firstName, lastName, email, phone, company, title, source, notes, assignedTo } = body;

  if (!email && !phone) {
    throw new AppError('Email or phone is required', 400);
  }

  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      company,
      title,
      source: source || 'WEBSITE',
      status: 'NEW',
      notes,
      assignedTo: assignedTo || user.userId,
      createdBy: user.userId,
      updatedAt: new Date(),
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
  if (body.status && !['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(body.status)) {
    throw new AppError('Invalid status', 400);
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: body,
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

  const where: any = {};
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
  const { leadId, customerId, name, stage, probability, amount, expectedCloseDate, description, notes, assignedTo } = body;

  if (!name || amount === undefined || amount === null) {
    throw new AppError('Name and amount are required', 400);
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    throw new AppError('Amount must be a valid positive number', 400);
  }

  const probNum = probability !== undefined ? Number(probability) : 0;
  if (isNaN(probNum) || probNum < 0 || probNum > 100) {
    throw new AppError('Probability must be between 0 and 100', 400);
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
      customerId: customerId || null,
      name,
      stage: finalStage,
      probability: probNum,
      amount: amountNum,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      description,
      notes,
      assignedTo: assignedTo || user.userId,
      createdBy: user.userId,
      updatedAt: new Date(),
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

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      ...body,
      updatedBy: user.userId,
    },
  });

  return NextResponse.json(opportunity);
};

// Get campaigns
export const getCampaigns = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: 'desc' },
    }),
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({
    campaigns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create campaign
export const createCampaign = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireCRMAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { name, type, startDate, endDate, budget, description, targetAudience } = body;

  if (!name || !type) {
    throw new AppError('Name and type are required', 400);
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      type,
      status: 'PLANNED',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? Number(budget) : null,
      spent: 0,
      description,
      targetAudience: targetAudience || {},
      createdBy: user.userId,
    },
  });

  return NextResponse.json(campaign);
};
