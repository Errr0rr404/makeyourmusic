import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';
import { checkFeatureFlag } from '@/lib/server/utils/featureFlags';
import { Payroll, PayPeriod, Employee, User } from '@/generated/prisma';

type PayrollWithRelations = Payroll & {
  payPeriod: PayPeriod;
  employee: Employee & {
    user: User;
  };
};

export async function GET(request: NextRequest) {
  try {
    const authResult = authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Check if employee management is enabled
    const isEnabled = await checkFeatureFlag('posEmployeeManagementEnabled');
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Employee management is not enabled' },
        { status: 403 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const totalEmployees = await prisma.employee.count();

    const recentPayrolls = await prisma.payroll.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        payPeriod: true,
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const allPayrolls = await prisma.payroll.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const overview = {
      totalEmployees,
      totalPayrolls: allPayrolls.length,
      totalGrossPay: allPayrolls.reduce((sum, p) => sum + Number(p.grossPay), 0),
      totalNetPay: allPayrolls.reduce((sum, p) => sum + Number(p.netPay), 0),
      totalHours: allPayrolls.reduce((sum, p) => sum + Number(p.totalHours), 0),
      totalOvertimeHours: allPayrolls.reduce(
        (sum, p) => sum + Number(p.overtimeHours),
        0
      ),
      byStatus: allPayrolls.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentPayrolls: (recentPayrolls as (Payroll & { employee: Employee, payPeriod: PayPeriod })[]).map((p) => ({
        id: p.id,
        employee: {
          name: `${p.employee.firstName} ${p.employee.lastName}`,
          employeeId: p.employee.id,
        },
        payPeriod: p.payPeriod.name,
        netPay: Number(p.netPay),
        status: p.status,
        createdAt: p.createdAt,
      })),
    };

    return NextResponse.json(overview);
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to get overview') : 'Failed to get overview' },
      { status: 500 }
    );
  }
}
