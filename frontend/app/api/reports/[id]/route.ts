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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const report = await prisma.report.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to get report') : 'Failed to get report' },
      { status: 500 }
    );
  }
}
