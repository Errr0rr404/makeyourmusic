import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/server/middleware/auth';
import { checkFeatureFlag } from '@/lib/server/utils/featureFlags';

// Default payroll settings (stored in memory since payrollSettings model doesn't exist)
// In production, you may want to add a PayrollSettings model to the schema
const defaultSettings = {
  id: 'default',
  overtimeThreshold: 40,
  overtimeMultiplier: 1.5,
  defaultPayPeriodType: 'WEEKLY',
  autoCalculateTaxes: false,
  taxRate: 0.2,
  updatedAt: new Date().toISOString(),
};

// In-memory settings store (resets on server restart)
let currentSettings = { ...defaultSettings };

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

    return NextResponse.json(currentSettings);
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

    // Update in-memory settings
    currentSettings = {
      ...currentSettings,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(currentSettings);
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
