import { PrismaClient, Prisma } from '@/generated/prisma';

/**
 * Generate payroll summary report
 */
async function generatePayrollSummaryReport(
  db: PrismaClient,
  startDate: Date,
  endDate: Date,
  filters: { status?: string }
) {
  const where: Prisma.PayrollWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.status) where.status = filters.status as string;

  const payrolls = await db.payroll.findMany({
    where,
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      payPeriod: true,
    },
  });

  interface PayrollRecord {
    id: string;
    employeeId: string;
    grossPay: string | number;
    deductions: string | number;
    taxes: string | number;
    netPay: string | number;
    totalHours: string | number;
    overtimeHours: string | number;
    regularHours: string | number;
    regularPay: string | number;
    overtimePay: string | number;
    status: string;
    createdAt: Date;
    employee: {
      id: string;
      employeeId: string;
      user: { id: string; firstName: string | null; lastName: string | null; email: string };
    };
    payPeriod: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
    };
  }

  return {
    totalPayrolls: payrolls.length,
    totalEmployees: new Set(payrolls.map((p: PayrollRecord) => p.employeeId)).size,
    totalGrossPay: payrolls.reduce((sum: number, p: PayrollRecord) => sum + Number(p.grossPay), 0),
    totalDeductions: payrolls.reduce((sum: number, p: PayrollRecord) => sum + Number(p.deductions), 0),
    totalTaxes: payrolls.reduce((sum: number, p: PayrollRecord) => sum + Number(p.taxes), 0),
    totalNetPay: payrolls.reduce((sum: number, p: PayrollRecord) => sum + Number(p.netPay), 0),
    totalHours: payrolls.reduce((sum: number, p: PayrollRecord) => sum + Number(p.totalHours), 0),
    totalOvertimeHours: payrolls.reduce((sum: number, p: PayrollRecord) => sum + Number(p.overtimeHours), 0),
    byStatus: payrolls.reduce((acc: Record<string, number>, p: PayrollRecord) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {}),
    payrolls: payrolls.map((p: PayrollRecord) => ({
      id: p.id,
      employee: {
        id: p.employee.id,
        employeeId: p.employee.employeeId,
        name: `${p.employee.user.firstName} ${p.employee.user.lastName}`,
      },
      payPeriod: {
        id: p.payPeriod.id,
        name: p.payPeriod.name,
        startDate: p.payPeriod.startDate,
        endDate: p.payPeriod.endDate,
      },
      hours: {
        regular: Number(p.regularHours),
        overtime: Number(p.overtimeHours),
        total: Number(p.totalHours),
      },
      pay: {
        regular: Number(p.regularPay),
        overtime: Number(p.overtimePay),
        gross: Number(p.grossPay),
        deductions: Number(p.deductions),
        taxes: Number(p.taxes),
        net: Number(p.netPay),
      },
      status: p.status,
      createdAt: p.createdAt,
    })),
  };
}

/**
 * Generate employee hours report
 */
async function generateEmployeeHoursReport(
  db: Pick<ReportsDb, 'timeClock'>,
  startDate: Date,
  endDate: Date,
  filters: Record<string, unknown> | null
) {
  const where: Record<string, unknown> = {
    punchTime: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.employeeId) where.employeeId = filters.employeeId as string;

  const timeClocks = await db.timeClock.findMany({
    where,
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      punchTime: 'asc',
    },
  });

  interface TimeClockRecord {
    employeeId: string;
    punchType: string;
    punchTime: Date;
    employee: {
      id: string;
      employeeId: string;
      user: { id: string; firstName: string | null; lastName: string | null; email: string };
    };
  }

  interface EmployeeHoursData {
    employee: {
      id: string;
      employeeId: string;
      name: string;
    };
    punches: Array<{ type: string; time: Date }>;
  }

  const employeeHours: Record<string, EmployeeHoursData> = {};
  for (const clock of timeClocks as TimeClockRecord[]) {
    const empId = clock.employeeId;
    if (!employeeHours[empId]) {
      employeeHours[empId] = {
        employee: {
          id: clock.employee.id,
          employeeId: clock.employee.employeeId,
          name: `${clock.employee.user.firstName} ${clock.employee.user.lastName}`,
        },
        punches: [],
      };
    }
    employeeHours[empId].punches.push({
      type: clock.punchType,
      time: clock.punchTime,
    });
  }

  const reportData = Object.values(employeeHours).map((emp: EmployeeHoursData) => {
    let clockIn: Date | null = null;
    let breakStart: Date | null = null;
    let totalMinutes = 0;
    let breakMinutes = 0;

    for (const punch of emp.punches) {
      const punchTime = new Date(punch.time);
      switch (punch.type) {
        case 'CLOCK_IN':
          clockIn = punchTime;
          break;
        case 'CLOCK_OUT':
          if (clockIn) {
            totalMinutes += Math.round((punchTime.getTime() - clockIn.getTime()) / (1000 * 60));
            clockIn = null;
          }
          break;
        case 'BREAK_START':
        case 'LUNCH_START':
          breakStart = punchTime;
          break;
        case 'BREAK_END':
        case 'LUNCH_END':
          if (breakStart) {
            breakMinutes += Math.round((punchTime.getTime() - breakStart.getTime()) / (1000 * 60));
            breakStart = null;
          }
          break;
      }
    }

    const totalHours = (totalMinutes - breakMinutes) / 60;

    return {
      ...emp,
      totalHours: Math.round(totalHours * 100) / 100,
      breakHours: Math.round(breakMinutes / 60 * 100) / 100,
    };
  });

  return {
    startDate,
    endDate,
    totalEmployees: reportData.length,
    employees: reportData,
  };
}

/**
 * Generate report based on type
 */
export async function generateReport(
  db: ReportsDb,
  reportType: string,
  title: string,
  description: string | null,
  startDate: Date,
  endDate: Date,
  filters: Record<string, unknown> | null,
  createdBy: string
) {
  let reportData: Record<string, unknown> = {};

  switch (reportType) {
    case 'PAYROLL_SUMMARY':
      reportData = await generatePayrollSummaryReport(db, startDate, endDate, filters);
      break;
    case 'EMPLOYEE_HOURS':
      reportData = await generateEmployeeHoursReport(db, startDate, endDate, filters);
      break;
    default:
      throw new Error('Invalid report type');
  }

  const report = await db.report.create({
    data: {
      reportType,
      title,
      description,
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      filters: filters || {},
      data: reportData,
      status: 'COMPLETED',
      createdBy,
    },
  });

  return report;
}
