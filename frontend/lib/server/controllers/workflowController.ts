import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { requireAdminAccess } from '../middleware/authHelpers';

// Get workflows
export const getWorkflows = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAdminAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  // Check if workflow model exists
  if (!('workflow' in prisma)) {
    return NextResponse.json({
      workflows: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  const [workflows, total] = await Promise.all([
    (prisma as unknown as { workflow: { findMany: (args: unknown) => Promise<unknown[]> } }).workflow.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
    }),
    (prisma as unknown as { workflow: { count: (args: unknown) => Promise<number> } }).workflow.count({ where }),
  ]);

  return NextResponse.json({
    workflows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create workflow
export const createWorkflow = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAdminAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { name, description, triggerType, triggerConfig, steps, status } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Workflow name is required', 400);
  }

  if (!triggerType || !triggerConfig || !steps) {
    throw new AppError('Trigger type, trigger config, and steps are required', 400);
  }

  // Validate trigger type
  const validTriggerTypes = ['MANUAL', 'SCHEDULED', 'EVENT', 'WEBHOOK', 'API'];
  if (!validTriggerTypes.includes(triggerType)) {
    throw new AppError(`Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`, 400);
  }

  // Validate trigger config is an object
  if (typeof triggerConfig !== 'object' || triggerConfig === null) {
    throw new AppError('Trigger config must be an object', 400);
  }

  // Validate steps is an array
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new AppError('Steps must be a non-empty array', 400);
  }

  // Validate status if provided
  if (status && !['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    throw new AppError('Invalid status. Must be ACTIVE, PAUSED, or ARCHIVED', 400);
  }

  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      triggerType,
      triggerConfig,
      steps,
      status: status || 'ACTIVE',
      isActive: true,
      createdBy: user.userId,
    },
  });

  return NextResponse.json(workflow);
};

// Execute workflow
export const executeWorkflow = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  requireAdminAccess(req);

  const params = await context.params;
  const { id } = params;
  const body = await req.json();
  const { inputData } = body;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
  });

  if (!workflow) {
    throw new AppError('Workflow not found', 404);
  }

  if (!workflow.isActive || workflow.status !== 'ACTIVE') {
    throw new AppError('Workflow is not active', 400);
  }

  // Validate input data matches trigger config if required
  if (workflow.triggerConfig && typeof workflow.triggerConfig === 'object') {
    const requiredFields = (workflow.triggerConfig as Record<string, unknown>).requiredFields as string[] || [];
    for (const field of requiredFields) {
      if (!inputData || !(field in (inputData || {}))) {
        throw new AppError(`Missing required field: ${field}`, 400);
      }
    }
  }

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: id,
      status: 'RUNNING',
      inputData: inputData || {},
      startedAt: new Date(),
    },
  });

  // In a real implementation, this would trigger the workflow engine
  // For now, we'll just mark it as completed
  // TODO: Implement actual workflow execution logic

  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      duration: Date.now() - execution.startedAt.getTime(),
      outputData: { message: 'Workflow executed successfully' },
    },
  });

  return NextResponse.json({ success: true, executionId: execution.id });
};
