import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';

/**
 * Generate a report
 */
export const generateReport = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { reportType, title, description, dateRangeStart, dateRangeEnd, filters } = req.body;

    if (!reportType || !dateRangeStart || !dateRangeEnd) {
      throw new AppError('Report type, start date, and end date are required', 400);
    }

    const prismaClient = prisma as any;

    // Create report record
    const report = await prismaClient.report.create({
      data: {
        reportType,
        title: title || `${reportType} Report`,
        description,
        dateRangeStart: new Date(dateRangeStart),
        dateRangeEnd: new Date(dateRangeEnd),
        filters: filters || {},
        status: 'PROCESSING',
        createdBy: req.user?.userId,
      },
    });

    // Generate report data based on type
    let reportData: any = {};

    try {
      switch (reportType) {
        case 'PAYROLL_SUMMARY':
          reportData = await generatePayrollSummaryReport(
            new Date(dateRangeStart),
            new Date(dateRangeEnd),
            filters
          );
          break;

        case 'EMPLOYEE_HOURS':
          reportData = await generateEmployeeHoursReport(
            new Date(dateRangeStart),
            new Date(dateRangeEnd),
            filters
          );
          break;

        case 'ATTENDANCE':
          reportData = await generateAttendanceReport(
            new Date(dateRangeStart),
            new Date(dateRangeEnd),
            filters
          );
          break;

        case 'OVERTIME':
          reportData = await generateOvertimeReport(
            new Date(dateRangeStart),
            new Date(dateRangeEnd),
            filters
          );
          break;

        case 'PAYROLL_DETAIL':
          reportData = await generatePayrollDetailReport(
            new Date(dateRangeStart),
            new Date(dateRangeEnd),
            filters
          );
          break;

        case 'EMPLOYEE_PAYROLL_HISTORY':
          reportData = await generateEmployeePayrollHistoryReport(
            new Date(dateRangeStart),
            new Date(dateRangeEnd),
            filters
          );
          break;

        default:
          throw new AppError('Invalid report type', 400);
      }

      // Update report with data
      await prismaClient.report.update({
        where: { id: report.id },
        data: {
          data: reportData,
          status: 'COMPLETED',
        },
      });

      res.json({
        ...report,
        data: reportData,
        status: 'COMPLETED',
      });
    } catch (error: any) {
      // Update report status to failed
      await prismaClient.report.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
        },
      });
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Generate payroll summary report
 */
async function generatePayrollSummaryReport(startDate: Date, endDate: Date, filters: any) {
  const prismaClient = prisma as any;
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.status) where.status = filters.status;

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
    },
  });

  const summary = {
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

  return summary;
}

/**
 * Generate employee hours report
 */
async function generateEmployeeHoursReport(startDate: Date, endDate: Date, filters: any) {
  const prismaClient = prisma as any;
  const where: any = {
    punchTime: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.employeeId) where.employeeId = filters.employeeId;

  const timeClocks = await prismaClient.timeClock.findMany({
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

  // Group by employee and calculate hours
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
        totalMinutes: 0,
        breakMinutes: 0,
        punches: [],
      };
    }
    employeeHours[empId].punches.push({
      type: clock.punchType,
      time: clock.punchTime,
    });
  }

  // Calculate hours for each employee
  const reportData = Object.values(employeeHours).map((emp: any) => {
    let clockIn: Date | null = null;
    let breakStart: Date | null = null;
    let lunchStart: Date | null = null;
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
 * Generate attendance report
 */
async function generateAttendanceReport(startDate: Date, endDate: Date, filters: any) {
  const prismaClient = prisma as any;
  const where: any = {
    punchTime: {
      gte: startDate,
      lte: endDate,
    },
    punchType: 'CLOCK_IN',
  };

  if (filters?.employeeId) where.employeeId = filters.employeeId;

  const clockIns = await prismaClient.timeClock.findMany({
    where,
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      punchTime: 'asc',
    },
  });

  // Group by date and employee
  const attendance: any = {};
  for (const clock of clockIns) {
    const date = new Date(clock.punchTime).toISOString().split('T')[0];
    const empId = clock.employeeId;

    if (!attendance[date]) attendance[date] = {};
    if (!attendance[date][empId]) {
      attendance[date][empId] = {
        employee: {
          id: clock.employee.id,
          employeeId: clock.employee.employeeId,
          name: clock.employee.user.name,
        },
        clockIns: [],
      };
    }
    attendance[date][empId].clockIns.push(clock.punchTime);
  }

  return {
    startDate,
    endDate,
    attendance,
  };
}

/**
 * Generate overtime report
 */
async function generateOvertimeReport(startDate: Date, endDate: Date, filters: any) {
  const prismaClient = prisma as any;
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    overtimeHours: {
      gt: 0,
    },
  };

  if (filters?.employeeId) where.employeeId = filters.employeeId;

  const payrolls = await prismaClient.payroll.findMany({
    where,
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      payPeriod: true,
    },
    orderBy: {
      overtimeHours: 'desc',
    },
  });

  return {
    startDate,
    endDate,
    totalOvertimeHours: payrolls.reduce((sum: number, p: any) => sum + Number(p.overtimeHours), 0),
    totalOvertimePay: payrolls.reduce((sum: number, p: any) => sum + Number(p.overtimePay), 0),
    employees: payrolls.map((p: any) => ({
      employee: {
        id: p.employee.id,
        employeeId: p.employee.employeeId,
        name: p.employee.user.name,
      },
      payPeriod: {
        id: p.payPeriod.id,
        name: p.payPeriod.name,
      },
      overtimeHours: Number(p.overtimeHours),
      overtimePay: Number(p.overtimePay),
    })),
  };
}

/**
 * Generate payroll detail report
 */
async function generatePayrollDetailReport(startDate: Date, endDate: Date, filters: any) {
  const prismaClient = prisma as any;
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.status) where.status = filters.status;

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

  return {
    startDate,
    endDate,
    payrolls: payrolls.map((p: any) => ({
      id: p.id,
      employee: {
        id: p.employee.id,
        employeeId: p.employee.employeeId,
        name: p.employee.user.name,
        email: p.employee.user.email,
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
        break: Number(p.breakHours),
        total: Number(p.totalHours),
      },
      rates: {
        hourly: Number(p.hourlyRate),
        overtimeMultiplier: Number(p.overtimeMultiplier),
      },
      pay: {
        regular: Number(p.regularPay),
        overtime: Number(p.overtimePay),
        bonuses: Number(p.bonuses),
        gross: Number(p.grossPay),
        deductions: Number(p.deductions),
        taxes: Number(p.taxes),
        net: Number(p.netPay),
      },
      items: p.items.map((item: any) => ({
        type: item.itemType,
        description: item.description,
        quantity: item.quantity ? Number(item.quantity) : null,
        rate: item.rate ? Number(item.rate) : null,
        amount: Number(item.amount),
      })),
      status: p.status,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    })),
  };
}

/**
 * Generate employee payroll history report
 */
async function generateEmployeePayrollHistoryReport(
  startDate: Date,
  endDate: Date,
  filters: any
) {
  if (!filters?.employeeId) {
    throw new AppError('Employee ID is required for payroll history report', 400);
  }

  const prismaClient = prisma as any;
  const payrolls = await prismaClient.payroll.findMany({
    where: {
      employeeId: filters.employeeId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
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

  const employee = await prismaClient.posEmployee.findUnique({
    where: { id: filters.employeeId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.user.name,
      email: employee.user.email,
    },
    startDate,
    endDate,
    totalPayrolls: payrolls.length,
    totalGrossPay: payrolls.reduce((sum: number, p: any) => sum + Number(p.grossPay), 0),
    totalNetPay: payrolls.reduce((sum: number, p: any) => sum + Number(p.netPay), 0),
    payrolls: payrolls.map((p: any) => ({
      id: p.id,
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
        gross: Number(p.grossPay),
        net: Number(p.netPay),
      },
      status: p.status,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    })),
  };
}

/**
 * Get all reports
 */
export const getReports = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { page, limit, reportType, status } = req.query;
    const pageNum = parseInt(String(page || '1'), 10) || 1;
    const limitNum = parseInt(String(limit || '20'), 10) || 20;
    const { skip, limit: take } = getPaginationParams(pageNum, limitNum);

    const prismaClient = prisma as any;
    const where: any = {};
    if (reportType) where.reportType = reportType;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prismaClient.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prismaClient.report.count({ where }),
    ]);

    res.json(formatPaginationResponse(reports, total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single report
 */
export const getReport = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      throw new AppError('Access denied', 403);
    }

    const { id } = req.params;

    const prismaClient = prisma as any;
    const report = await prismaClient.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin overview dashboard data
 */
export const getAdminOverview = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403);
    }

    const prismaClient = prisma as any;

    // Get date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get total employees
    const totalEmployees = await prismaClient.posEmployee.count({
      where: { isActive: true },
    });

    // Get recent payrolls
    const recentPayrolls = await prismaClient.payroll.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        payPeriod: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Calculate totals
    const allPayrolls = await prismaClient.payroll.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const overview = {
      totalEmployees,
      totalPayrolls: allPayrolls.length,
      totalGrossPay: allPayrolls.reduce((sum: number, p: any) => sum + Number(p.grossPay), 0),
      totalNetPay: allPayrolls.reduce((sum: number, p: any) => sum + Number(p.netPay), 0),
      totalHours: allPayrolls.reduce((sum: number, p: any) => sum + Number(p.totalHours), 0),
      totalOvertimeHours: allPayrolls.reduce(
        (sum: number, p: any) => sum + Number(p.overtimeHours),
        0
      ),
      byStatus: allPayrolls.reduce((acc: any, p: any) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      recentPayrolls: recentPayrolls.map((p: any) => ({
        id: p.id,
        employee: {
          name: p.employee.user.name,
          employeeId: p.employee.employeeId,
        },
        payPeriod: p.payPeriod.name,
        netPay: Number(p.netPay),
        status: p.status,
        createdAt: p.createdAt,
      })),
    };

    res.json(overview);
  } catch (error) {
    next(error);
  }
};
