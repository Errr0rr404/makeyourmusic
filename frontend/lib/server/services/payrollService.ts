// Database interface for payroll service
interface PayrollDb {
  timeClock: { findMany: (args: unknown) => Promise<Array<{ punchTime: Date; punchType: string }>> };
  payPeriod: { findUnique: (args: unknown) => Promise<Record<string, unknown> | null> };
  posEmployee: { findUnique: (args: unknown) => Promise<Record<string, unknown> | null> };
  payrollSettings: { findFirst: (args: unknown) => Promise<Record<string, unknown> | null> };
  payroll: {
    findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
    create: (args: unknown) => Promise<Record<string, unknown>>;
    update: (args: unknown) => Promise<Record<string, unknown>>;
  };
}

/**
 * Calculate hours worked from time clock records
 */
export async function calculateHours(
  db: Pick<PayrollDb, 'timeClock'>,
  employeeId: string,
  startDate: Date,
  endDate: Date,
  overtimeThreshold: number = 40
) {
  const timeClocks = await db.timeClock.findMany({
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

  const totalHours = totalMinutes / 60;
  const breakHours = breakMinutes / 60;
  const workedHours = totalHours - breakHours;

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
  hours: { regularHours: number; overtimeHours: number },
  hourlyRate: number,
  overtimeMultiplier: number = 1.5,
  bonuses: number = 0,
  deductions: number = 0,
  taxRate: number = 0
) {
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
 * Generate payroll for multiple employees
 */
export async function generatePayrollForEmployees(
  db: PayrollDb,
  payPeriodId: string,
  employeeIds: string[],
  createdBy: string
) {
  const results = [];

  for (const employeeId of employeeIds) {
    try {
      // Get pay period
      const payPeriod = await db.payPeriod.findUnique({
        where: { id: payPeriodId },
      });

      if (!payPeriod) {
        results.push({
          success: false,
          employeeId,
          error: 'Pay period not found',
        });
        continue;
      }

      // Get employee
      const employee = await db.posEmployee.findUnique({
        where: { id: employeeId },
        include: { user: true },
      });

      if (!employee) {
        results.push({
          success: false,
          employeeId,
          error: 'Employee not found',
        });
        continue;
      }

      if (!employee.hourlyRate) {
        results.push({
          success: false,
          employeeId,
          error: 'Employee hourly rate not set',
        });
        continue;
      }

      // Get payroll settings
      const settings = await db.payrollSettings.findFirst({
        orderBy: { updatedAt: 'desc' },
      }) || {
        overtimeThreshold: 40,
        overtimeMultiplier: 1.5,
        autoCalculateTaxes: false,
        taxRateFederal: null,
      };

      // Calculate hours
      const hours = await calculateHours(
        db,
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
        0,
        0,
        settings.autoCalculateTaxes ? Number(settings.taxRateFederal || 0) : 0
      );

      // Create or update payroll
      const existingPayroll = await db.payroll.findFirst({
        where: { payPeriodId, employeeId },
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
        ? await db.payroll.update({
            where: { id: existingPayroll.id },
            data: payrollData,
          })
        : await db.payroll.create({
            data: {
              ...payrollData,
              status: 'DRAFT',
            },
          });

      results.push({ success: true, employeeId, payroll });
    } catch (error: unknown) {
      results.push({
        success: false,
        employeeId,
        error: error instanceof Error ? error.message : 'Failed to generate payroll',
      });
    }
  }

  return results;
}
