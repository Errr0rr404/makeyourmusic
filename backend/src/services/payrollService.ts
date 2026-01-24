import { prisma } from '../utils/db';
// Decimal type is handled by Prisma automatically
import { AppError } from '../middleware/errorHandler';

interface TimeClockRecord {
  id: string;
  punchType: string;
  punchTime: Date;
}

interface HoursCalculation {
  regularHours: number;
  overtimeHours: number;
  breakHours: number;
  totalHours: number;
}

interface PayCalculation {
  regularPay: number;
  overtimePay: number;
  bonuses: number;
  grossPay: number;
  deductions: number;
  taxes: number;
  netPay: number;
}

/**
 * Calculate hours worked from time clock records
 */
export async function calculateHours(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  overtimeThreshold: number = 40
): Promise<HoursCalculation> {
  // Get all time clock records for the employee in the date range
  const timeClocks = await (prisma as any).timeClock.findMany({
    where: {
      employeeId,
      punchTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      punchTime: 'asc',
    },
  });

  if (timeClocks.length === 0) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      breakHours: 0,
      totalHours: 0,
    };
  }

  let totalMinutes = 0;
  let breakMinutes = 0;
  let currentClockIn: Date | null = null;
  let currentBreakStart: Date | null = null;
  let currentLunchStart: Date | null = null;

  // Process time clock records chronologically
  for (const record of timeClocks) {
    const punchTime = new Date(record.punchTime);

    switch (record.punchType) {
      case 'CLOCK_IN':
        currentClockIn = punchTime;
        break;

      case 'CLOCK_OUT':
        if (currentClockIn) {
          const minutes = Math.round(
            (punchTime.getTime() - currentClockIn.getTime()) / (1000 * 60)
          );
          totalMinutes += minutes;
          currentClockIn = null;
        }
        break;

      case 'BREAK_START':
        currentBreakStart = punchTime;
        break;

      case 'BREAK_END':
        if (currentBreakStart) {
          const minutes = Math.round(
            (punchTime.getTime() - currentBreakStart.getTime()) / (1000 * 60)
          );
          breakMinutes += minutes;
          currentBreakStart = null;
        }
        break;

      case 'LUNCH_START':
        currentLunchStart = punchTime;
        break;

      case 'LUNCH_END':
        if (currentLunchStart) {
          const minutes = Math.round(
            (punchTime.getTime() - currentLunchStart.getTime()) / (1000 * 60)
          );
          breakMinutes += minutes;
          currentLunchStart = null;
        }
        break;
    }
  }

  // Convert minutes to hours
  const totalHours = totalMinutes / 60;
  const breakHours = breakMinutes / 60;
  const workedHours = totalHours - breakHours;

  // Calculate overtime (hours over threshold per week)
  const weeksInPeriod = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );
  const weeklyHours = workedHours / Math.max(weeksInPeriod, 1);
  const overtimeHours = Math.max(0, weeklyHours - overtimeThreshold) * weeksInPeriod;
  const regularHours = Math.max(0, workedHours - overtimeHours);

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    breakHours: Math.round(breakHours * 100) / 100,
    totalHours: Math.round(workedHours * 100) / 100,
  };
}

/**
 * Calculate pay based on hours and rates
 */
export async function calculatePay(
  hours: HoursCalculation,
  hourlyRate: number,
  overtimeMultiplier: number = 1.5,
  bonuses: number = 0,
  deductions: number = 0,
  taxRate: number = 0
): Promise<PayCalculation> {
  const regularPay = hours.regularHours * hourlyRate;
  const overtimePay = hours.overtimeHours * hourlyRate * overtimeMultiplier;
  const grossPay = regularPay + overtimePay + bonuses;
  const taxes = grossPay * taxRate;
  const netPay = grossPay - deductions - taxes;

  return {
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    bonuses: Math.round(bonuses * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    netPay: Math.max(0, Math.round(netPay * 100) / 100),
  };
}

/**
 * Get payroll settings
 */
export async function getPayrollSettings() {
  const settings = await (prisma as any).payrollSettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (!settings) {
    // Create default settings
    return await (prisma as any).payrollSettings.create({
      data: {
        overtimeThreshold: 40,
        overtimeMultiplier: 1.5,
        defaultPayPeriodType: 'WEEKLY',
        autoCalculateTaxes: false,
      },
    });
  }

  return settings;
}

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

  // Get employee
  const employee = await prismaClient.posEmployee.findUnique({
    where: { id: employeeId },
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

  // Get payroll settings
  const settings = await getPayrollSettings();

  // Calculate hours
  const hours = await calculateHours(
    employeeId,
    new Date(payPeriod.startDate),
    new Date(payPeriod.endDate),
    Number(settings.overtimeThreshold)
  );

  // Calculate pay
  const pay = await calculatePay(
    hours,
    Number(employee.hourlyRate),
    Number(settings.overtimeMultiplier),
    0, // bonuses
    0, // deductions
    settings.autoCalculateTaxes ? Number(settings.taxRateFederal || 0) : 0
  );

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
    regularHours: hours.regularHours,
    overtimeHours: hours.overtimeHours,
    breakHours: hours.breakHours,
    totalHours: hours.totalHours,
    hourlyRate: employee.hourlyRate,
    overtimeMultiplier: settings.overtimeMultiplier,
    regularPay: pay.regularPay,
    overtimePay: pay.overtimePay,
    bonuses: pay.bonuses,
    grossPay: pay.grossPay,
    deductions: pay.deductions,
    taxes: pay.taxes,
    netPay: pay.netPay,
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
  // Delete existing items first
  await prismaClient.payrollItem.deleteMany({
    where: { payrollId: payroll.id },
  });

  // Regular hours item
  if (hours.regularHours > 0) {
    await prismaClient.payrollItem.create({
      data: {
        payrollId: payroll.id,
        itemType: 'REGULAR_HOURS',
        description: 'Regular hours worked',
        quantity: hours.regularHours,
        rate: Number(employee.hourlyRate),
        amount: pay.regularPay,
      },
    });
  }

  // Overtime hours item
  if (hours.overtimeHours > 0) {
    await prismaClient.payrollItem.create({
      data: {
        payrollId: payroll.id,
        itemType: 'OVERTIME_HOURS',
        description: 'Overtime hours worked',
        quantity: hours.overtimeHours,
        rate: Number(employee.hourlyRate) * Number(settings.overtimeMultiplier),
        amount: pay.overtimePay,
      },
    });
  }

  // Break deduction item
  if (hours.breakHours > 0) {
    await prismaClient.payrollItem.create({
      data: {
        payrollId: payroll.id,
        itemType: 'BREAK_DEDUCTION',
        description: 'Break and lunch time',
        quantity: hours.breakHours,
        rate: 0,
        amount: 0,
      },
    });
  }

  // Tax items if auto-calculate is enabled
  if (settings.autoCalculateTaxes) {
    if (settings.taxRateFederal && pay.grossPay > 0) {
      const federalTax = pay.grossPay * Number(settings.taxRateFederal);
      await prismaClient.payrollItem.create({
        data: {
          payrollId: payroll.id,
          itemType: 'TAX_FEDERAL',
          description: 'Federal tax',
          quantity: 1,
          rate: Number(settings.taxRateFederal) * 100, // Store as percentage
          amount: federalTax,
        },
      });
    }

    if (settings.taxRateState && pay.grossPay > 0) {
      const stateTax = pay.grossPay * Number(settings.taxRateState);
      await prismaClient.payrollItem.create({
        data: {
          payrollId: payroll.id,
          itemType: 'TAX_STATE',
          description: 'State tax',
          quantity: 1,
          rate: Number(settings.taxRateState) * 100,
          amount: stateTax,
        },
      });
    }
  }

  // Fetch complete payroll with items
  return await prismaClient.payroll.findUnique({
    where: { id: payroll.id },
    include: {
      employee: {
        include: {
          user: true,
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
