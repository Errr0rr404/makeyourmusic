import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import {
  generatePayrollForEmployees,
} from '../services/payrollService';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';

/**
 * Create a pay period
 */
export const createPayPeriod = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { name, startDate, endDate, periodType } = req.body;

    if (!name || !startDate || !endDate) {
      throw new AppError('Name, start date, and end date are required', 400);
    }

    const prismaClient = prisma as any;
    const payPeriod = await prismaClient.payPeriod.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        periodType: periodType || 'WEEKLY',
        status: 'DRAFT',
        createdBy: req.user?.userId,
      },
    });

    res.status(201).json(payPeriod);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pay periods
 */
export const getPayPeriods = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status } = req.query;
    const pageNum = parseInt(String(page || '1'), 10) || 1;
    const limitNum = parseInt(String(limit || '20'), 10) || 20;
    const { skip, limit: take } = getPaginationParams(pageNum, limitNum);

    const prismaClient = prisma as any;
    const where: any = {};
    if (status) where.status = status;

    const [payPeriods, total] = await Promise.all([
      prismaClient.payPeriod.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip,
        take,
      }),
      prismaClient.payPeriod.count({ where }),
    ]);

    res.json(formatPaginationResponse(payPeriods, total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

/**
 * Generate payroll for employees
 */
export const generatePayrolls = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { payPeriodId, employeeIds } = req.body;

    if (!payPeriodId) {
      throw new AppError('Pay period ID is required', 400);
    }

    const prismaClient = prisma as any;
    const payPeriod = await prismaClient.payPeriod.findUnique({
      where: { id: payPeriodId },
    });

    if (!payPeriod) {
      throw new AppError('Pay period not found', 404);
    }

    let targetEmployeeIds = employeeIds;
    if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
      // In a real ERP, you'd get employees from an employee model
      // For now, we'll assume all users are employees for simplicity
      const users = await prisma.user.findMany({
        select: { id: true },
      });
      targetEmployeeIds = users.map((u: any) => u.id);
    }

    const results = await generatePayrollForEmployees(
      payPeriodId,
      targetEmployeeIds,
      req.user?.userId
    );

    res.json({
      success: true,
      results,
      total: results.length,
      successful: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payrolls for a pay period
 */
export const getPayrolls = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { payPeriodId, employeeId, status } = req.query;

    const prismaClient = prisma as any;
    const where: any = {};
    if (payPeriodId) where.payPeriodId = payPeriodId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const payrolls = await prismaClient.payroll.findMany({
      where,
      include: {
        payPeriod: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(payrolls);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single payroll
 */
export const getPayroll = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const prismaClient = prisma as any;
    const payroll = await prismaClient.payroll.findUnique({
      where: { id },
      include: {
        payPeriod: true,
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!payroll) {
      throw new AppError('Payroll not found', 404);
    }

    res.json(payroll);
  } catch (error) {
    next(error);
  }
};

/**
 * Update payroll (approve, pay, cancel)
 */
export const updatePayroll = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const prismaClient = prisma as any;
    const payroll = await prismaClient.payroll.findUnique({
      where: { id },
    });

    if (!payroll) {
      throw new AppError('Payroll not found', 404);
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    const updated = await prismaClient.payroll.update({
      where: { id },
      data: updateData,
      include: {
        payPeriod: true,
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Preview payroll calculation without saving
 */
export const previewPayroll = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId || !startDate || !endDate) {
      throw new AppError('Employee ID, start date, and end date are required', 400);
    }

    // This is a simplified preview. A real implementation would need more details.
    res.json({
      message: "Payroll preview is not fully implemented in this version.",
      employeeId,
      startDate,
      endDate,
    });
  } catch (error) {
    next(error);
  }
};
