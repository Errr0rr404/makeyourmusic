import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { requireProjectAccess } from '../middleware/authHelpers';

// Get projects
export const getProjects = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireProjectAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'PROJECT_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const status = searchParams.get('status');
  const managerId = searchParams.get('managerId');

  const where: any = {};
  if (status) where.status = status;
  if (managerId) where.managerId = managerId;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: 'desc' },
      include: {
        tasks: true,
      },
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({
    projects,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create project
export const createProject = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireProjectAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'PROJECT_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { name, description, code, status, priority, startDate, endDate, budget, managerId, customerId, notes } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Project name is required', 400);
  }

  // Validate status
  const validStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
  const finalStatus = status || 'PLANNING';
  if (!validStatuses.includes(finalStatus)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  // Validate priority
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const finalPriority = priority || 'MEDIUM';
  if (!validPriorities.includes(finalPriority)) {
    throw new AppError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`, 400);
  }

  // Validate dates
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format', 400);
    }
    if (end < start) {
      throw new AppError('End date must be after start date', 400);
    }
  }

  // Validate budget
  if (budget !== undefined && budget !== null) {
    const budgetNum = Number(budget);
    if (isNaN(budgetNum) || budgetNum < 0) {
      throw new AppError('Budget must be a valid positive number', 400);
    }
  }

  // Validate code uniqueness if provided
  // Code validation removed - field doesn't exist in schema

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description,
      status: finalStatus,
      priority: finalPriority,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget !== undefined && budget !== null ? Number(budget) : null,
      actualCost: 0,
      progress: 0,
      managerId: managerId || user.userId,
      customerId: customerId || null,
      notes,
      createdBy: user.userId,
    },
  });

  return NextResponse.json(project);
};

// Get project tasks
export const getProjectTasks = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  const user = requireProjectAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'PROJECT_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const params = await context.params;
  const { id } = params;

  const tasks = await prisma.projectTask.findMany({
    where: { projectId: id },
    orderBy: [{ createdAt: 'asc' }],
  });

  return NextResponse.json({ tasks });
};

// Create project task
export const createProjectTask = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  const user = requireProjectAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'PROJECT_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const params = await context.params;
  const { id } = params;
  const body = await req.json();
  const { name, description, status, priority, assignedTo, startDate, dueDate, estimatedHours, parentTaskId, dependencies, notes } = body;

  if (!name) {
    throw new AppError('Task name is required', 400);
  }

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Validate parent task exists if provided
  if (parentTaskId) {
    const parentTask = await prisma.projectTask.findUnique({
      where: { id: parentTaskId },
    });
    if (!parentTask || parentTask.projectId !== id) {
      throw new AppError('Parent task not found or belongs to different project', 404);
    }
  }

  // Validate dependencies exist
  if (dependencies && Array.isArray(dependencies) && dependencies.length > 0) {
    const dependencyTasks = await prisma.projectTask.findMany({
      where: {
        id: { in: dependencies },
        projectId: id,
      },
    });
    if (dependencyTasks.length !== dependencies.length) {
      throw new AppError('One or more dependency tasks not found', 400);
    }
  }

  const task = await prisma.projectTask.create({
    data: {
      projectId: id,
      name,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      actualHours: 0,
      progress: 0,
      parentTaskId: parentTaskId || null,
      dependencies: dependencies || [],
      notes,
      createdBy: user.userId,
    },
  });

  return NextResponse.json(task);
};
