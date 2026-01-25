import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';
import { checkFeatureFlag } from '@/lib/server/utils/featureFlags';

export async function GET(request: NextRequest) {
  try {
    const authResult = authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    if (!user || (user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if employee management is enabled
    const isEnabled = await checkFeatureFlag('posEmployeeManagementEnabled');
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Employee management is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const payPeriodId = searchParams.get('payPeriodId');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where: any = {};
    if (payPeriodId) where.payPeriodId = payPeriodId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        payPeriod: true,
        items: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payrolls });
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to get payrolls') : 'Failed to get payrolls' },
      { status: 500 }
    );
  }
}
