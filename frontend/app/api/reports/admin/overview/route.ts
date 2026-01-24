import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';

// Helper function to check feature flag
async function checkFeatureFlag(flagName: string): Promise<boolean> {
  const config = await prisma.storeConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (!config) return false;
  // Type-safe feature flag check
  return (config as any)[flagName] === true;
}

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

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const totalEmployees = await prisma.posEmployee.count({
      where: { isActive: true },
    });

    const recentPayrolls = await prisma.payroll.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        employee: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        payPeriod: true,
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

    return NextResponse.json(overview);
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to get overview') : 'Failed to get overview' },
      { status: 500 }
    );
  }
}
