import { prisma } from '@/lib/server/utils/db';

/**
 * Generate payroll summary report
 */
async function generatePayrollSummaryReport(
  db: any,
  startDate: Date,
  endDate: Date,
  filters: any
) {
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.status) where.status = filters.status;

  const payrolls = await db.payroll.findMany({
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
    },
  });

  return {
    totalPayrolls: payrolls.length,
    totalEmployees: new Set(payrolls.map((p: any) => p.employeeId)).size,
    totalGrossPay: payrolls.reduce((sum: number, p: any) => sum + Number(p.grossPay), 0),
    totalDeductions: payrolls.reduce((sum: number, p: any) => sum + Number(p.deductions), 0),
    totalTaxes: payrolls.reduce((sum: number, p: any) => sum + Number(p.taxes), 0),
    totalNetPay: payrolls.reduce((sum: number, p: any) => sum + Number(p.netPay), 0),
    totalHours: payrolls.reduce((sum: number, p: any) => sum + Number(p.totalHours), 0),
    totalOvertimeHours: payrolls.reduce((sum: number, p: any) => sum + Number(p.overtimeHours), 0),
    byStatus: payrolls.reduce((acc: any, p: any) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {}),
    payrolls: payrolls.map((p: any) => ({
      id: p.id,
      employee: {
        id: p.employee.id,
        employeeId: p.employee.employeeId,
        name: p.employee.user.name,
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
  db: any,
  startDate: Date,
  endDate: Date,
  filters: any
) {
  const where: any = {
    punchTime: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.employeeId) where.employeeId = filters.employeeId;

  const timeClocks = await db.timeClock.findMany({
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
    },
    orderBy: {
      punchTime: 'asc',
    },
  });

  const employeeHours: any = {};
  for (const clock of timeClocks) {
    const empId = clock.employeeId;
    if (!employeeHours[empId]) {
      employeeHours[empId] = {
        employee: {
          id: clock.employee.id,
          employeeId: clock.employee.employeeId,
          name: clock.employee.user.name,
        },
        punches: [],
      };
    }
    employeeHours[empId].punches.push({
      type: clock.punchType,
      time: clock.punchTime,
    });
  }

  const reportData = Object.values(employeeHours).map((emp: any) => {
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
  db: any,
  reportType: string,
  title: string,
  description: string | null,
  startDate: Date,
  endDate: Date,
  filters: any,
  createdBy: string
) {
  let reportData: any = {};

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
