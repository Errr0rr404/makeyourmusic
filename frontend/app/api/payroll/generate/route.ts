import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';
import { generatePayrollForEmployees } from '@/lib/server/services/payrollService';
import { checkFeatureFlag } from '@/lib/server/utils/featureFlags';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { payPeriodId, employeeIds } = body;

    if (!payPeriodId) {
      return NextResponse.json({ error: 'Pay period ID required' }, { status: 400 });
    }

    const results = await generatePayrollForEmployees(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      payPeriodId,
      employeeIds || [],
      user.userId
    );

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successful: results.filter((r: any) => r.success).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      failed: results.filter((r: any) => !r.success).length,
    });
  } catch (error: unknown) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate payroll';
    return NextResponse.json(
      { error: isDevelopment ? errorMessage : 'Failed to generate payroll' },
      { status: 500 }
    );
  }
}
