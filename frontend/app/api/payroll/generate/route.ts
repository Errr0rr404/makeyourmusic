import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';
import { generatePayrollForEmployees } from '@/lib/server/services/payrollService';

// Helper function to check feature flag
async function checkFeatureFlag(flagName: string): Promise<boolean> {
  const config = await prisma.storeConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (!config) return false;
  // Type-safe feature flag check
  return (config as any)[flagName] === true;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
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
      prisma,
      payPeriodId,
      employeeIds || [],
      user.userId
    );

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      successful: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
    });
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to generate payroll') : 'Failed to generate payroll' },
      { status: 500 }
    );
  }
}
