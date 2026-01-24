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

    const settings = await prisma.payrollSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      // Create default settings
      const defaultSettings = await prisma.payrollSettings.create({
        data: {
          overtimeThreshold: 40,
          overtimeMultiplier: 1.5,
          defaultPayPeriodType: 'WEEKLY',
          autoCalculateTaxes: false,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Get payroll settings error:', error);
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: isDevelopment ? (error.message || 'Failed to get payroll settings') : 'Failed to get payroll settings'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();

    const settings = await prisma.payrollSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const updated = settings
      ? await prisma.payrollSettings.update({
          where: { id: settings.id },
          data: body,
        })
      : await prisma.payrollSettings.create({
          data: {
            ...body,
            overtimeThreshold: body.overtimeThreshold || 40,
            overtimeMultiplier: body.overtimeMultiplier || 1.5,
            defaultPayPeriodType: body.defaultPayPeriodType || 'WEEKLY',
          },
        });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update payroll settings error:', error);
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: isDevelopment ? (error.message || 'Failed to update payroll settings') : 'Failed to update payroll settings'
      },
      { status: 500 }
    );
  }
}
