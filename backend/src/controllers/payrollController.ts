import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import {
  generatePayroll,
  generatePayrollForEmployees,
  getPayrollSettings,
  calculateHours,
} from '../services/payrollService';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';

/**
 * Get payroll settings
 */
export const getSettings = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const settings = await getPayrollSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Update payroll settings
 */
export const updateSettings = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403);
    }

    const {
      overtimeThreshold,
      overtimeMultiplier,
      defaultPayPeriodType,
      taxRateFederal,
      taxRateState,
      taxRateLocal,
      autoCalculateTaxes,
    } = req.body;

    const prismaClient = prisma as any;
    const settings = await prismaClient.payrollSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const updateData: any = {};
    if (overtimeThreshold !== undefined) updateData.overtimeThreshold = overtimeThreshold;
    if (overtimeMultiplier !== undefined) updateData.overtimeMultiplier = overtimeMultiplier;
    if (defaultPayPeriodType !== undefined) updateData.defaultPayPeriodType = defaultPayPeriodType;
    if (taxRateFederal !== undefined) updateData.taxRateFederal = taxRateFederal;
    if (taxRateState !== undefined) updateData.taxRateState = taxRateState;
    if (taxRateLocal !== undefined) updateData.taxRateLocal = taxRateLocal;
    if (autoCalculateTaxes !== undefined) updateData.autoCalculateTaxes = autoCalculateTaxes;

    const updated = settings
      ? await prismaClient.payrollSettings.update({
          where: { id: settings.id },
          data: updateData,
        })
      : await prismaClient.payrollSettings.create({
          data: {
            ...updateData,
            overtimeThreshold: overtimeThreshold || 40,
            overtimeMultiplier: overtimeMultiplier || 1.5,
            defaultPayPeriodType: defaultPayPeriodType || 'WEEKLY',
          },
        });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a pay period
 */
export const createPayPeriod = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

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
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

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
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

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

    // If no employee IDs provided, generate for all active employees
    let targetEmployeeIds = employeeIds;
    if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
      const employees = await prismaClient.posEmployee.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e: any) => e.id);
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
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { payPeriodId, employeeId, status } = req.query;

    const prismaClient = prisma as any;
    const where: any = {};
    if (payPeriodId) where.payPeriodId = payPeriodId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const payrolls = await prismaClient.payroll.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payPeriod: true,
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
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
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { id } = req.params;

    const prismaClient = prisma as any;
    const payroll = await prismaClient.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
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
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { id } = req.params;
    const { status, notes, bonuses, deductions } = req.body;

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

    // If marking as paid, set paidAt and paidBy
    if (status === 'PAID') {
      updateData.paidAt = new Date();
      updateData.paidBy = req.user?.userId;
    }

    // If updating bonuses or deductions, recalculate
    if (bonuses !== undefined || deductions !== undefined) {
      const newBonuses = bonuses !== undefined ? bonuses : Number(payroll.bonuses);
      const newDeductions = deductions !== undefined ? deductions : Number(payroll.deductions);

      const grossPay = Number(payroll.grossPay) + (newBonuses - Number(payroll.bonuses));
      const netPay = grossPay - newDeductions - Number(payroll.taxes);

      updateData.bonuses = newBonuses;
      updateData.deductions = newDeductions;
      updateData.grossPay = grossPay;
      updateData.netPay = Math.max(0, netPay);
    }

    const updated = await prismaClient.payroll.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
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
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId || !startDate || !endDate) {
      throw new AppError('Employee ID, start date, and end date are required', 400);
    }

    const prismaClient = prisma as any;
    const employee = await prismaClient.posEmployee.findUnique({
      where: { id: employeeId as string },
      include: {
        user: true,
      },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.hourlyRate) {
      throw new AppError('Employee hourly rate not set', 400);
    }

    const settings = await getPayrollSettings();
    const hours = await calculateHours(
      employeeId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      Number(settings.overtimeThreshold)
    );

    const { calculatePay } = await import('../services/payrollService');
    const pay = await calculatePay(
      hours,
      Number(employee.hourlyRate),
      Number(settings.overtimeMultiplier)
    );

    res.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.user.name,
      },
      hours,
      pay,
      settings: {
        hourlyRate: Number(employee.hourlyRate),
        overtimeMultiplier: Number(settings.overtimeMultiplier),
        overtimeThreshold: Number(settings.overtimeThreshold),
      },
    });
  } catch (error) {
    next(error);
  }
};
