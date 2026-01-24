import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';

/**
 * Generate payroll for an employee for a pay period
 */
export async function generatePayroll(
  payPeriodId: string,
  employeeId: string,
  createdBy?: string
) {
  const prismaClient = prisma as any;

  // Get pay period
  const payPeriod = await prismaClient.payPeriod.findUnique({
    where: { id: payPeriodId },
  });

  if (!payPeriod) {
    throw new AppError('Pay period not found', 404);
  }

  // In a real ERP, you would fetch employee details, hourly rates, etc.
  // For this simplified version, we'll use dummy data.
  const hourlyRate = 25; // Dummy hourly rate
  const regularHours = 40; // Dummy hours
  const overtimeHours = 5; // Dummy hours

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * 1.5;
  const grossPay = regularPay + overtimePay;
  const taxes = grossPay * 0.15; // Dummy tax rate
  const netPay = grossPay - taxes;

  // Check if payroll already exists
  const existingPayroll = await prismaClient.payroll.findFirst({
    where: {
      payPeriodId,
      employeeId,
    },
  });

  const payrollData = {
    payPeriodId,
    employeeId,
    regularHours,
    overtimeHours,
    totalHours: regularHours + overtimeHours,
    hourlyRate,
    grossPay,
    deductions: 0,
    taxes,
    netPay,
    createdBy,
  };

  const payroll = existingPayroll
    ? await prismaClient.payroll.update({
        where: { id: existingPayroll.id },
        data: {
          ...payrollData,
          updatedAt: new Date(),
        },
      })
    : await prismaClient.payroll.create({
        data: {
          ...payrollData,
          status: 'DRAFT',
        },
      });

  // Create payroll items
  await prismaClient.payrollItem.deleteMany({
    where: { payrollId: payroll.id },
  });

  if (regularHours > 0) {
    await prismaClient.payrollItem.create({
      data: {
        payrollId: payroll.id,
        itemType: 'REGULAR_HOURS',
        description: 'Regular hours worked',
        amount: regularPay,
      },
    });
  }

  if (overtimeHours > 0) {
    await prismaClient.payrollItem.create({
      data: {
        payrollId: payroll.id,
        itemType: 'OVERTIME_HOURS',
        description: 'Overtime hours worked',
        amount: overtimePay,
      },
    });
  }

  return await prismaClient.payroll.findUnique({
    where: { id: payroll.id },
    include: {
      payPeriod: true,
      items: true,
    },
  });
}

/**
 * Generate payroll for multiple employees
 */
export async function generatePayrollForEmployees(
  payPeriodId: string,
  employeeIds: string[],
  createdBy?: string
) {
  const results = [];

  for (const employeeId of employeeIds) {
    try {
      const payroll = await generatePayroll(payPeriodId, employeeId, createdBy);
      results.push({ success: true, employeeId, payroll });
    } catch (error: any) {
      results.push({
        success: false,
        employeeId,
        error: error.message || 'Failed to generate payroll',
      });
    }
  }

  return results;
}
