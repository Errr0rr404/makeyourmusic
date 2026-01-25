import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { authenticate } from '@/lib/server/middleware/auth';
import { generateReport } from '@/lib/server/services/reportsService';
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
    const { reportType, title, description, dateRangeStart, dateRangeEnd, filters } = body;

    const report = await generateReport(
      prisma,
      reportType,
      title || `${reportType} Report`,
      description,
      new Date(dateRangeStart),
      new Date(dateRangeEnd),
      filters || {},
      user.userId
    );

    return NextResponse.json(report);
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to generate report') : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
