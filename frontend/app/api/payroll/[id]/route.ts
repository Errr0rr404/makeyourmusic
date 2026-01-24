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

    const payroll = await prisma.payroll.findUnique({
      where: { id: params.id },
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    return NextResponse.json(payroll);
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to get payroll') : 'Failed to get payroll' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status, notes, bonuses, deductions } = body;

    const payroll = await prisma.payroll.findUnique({
      where: { id: params.id },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'PAID') {
      updateData.paidAt = new Date();
      updateData.paidBy = user.userId;
    }

    if (bonuses !== undefined || deductions !== undefined) {
      const newBonuses = bonuses !== undefined ? bonuses : Number(payroll.bonuses);
      const newDeductions =
        deductions !== undefined ? deductions : Number(payroll.deductions);

      const grossPay = Number(payroll.grossPay) + (newBonuses - Number(payroll.bonuses));
      const netPay = grossPay - newDeductions - Number(payroll.taxes);

      updateData.bonuses = newBonuses;
      updateData.deductions = newDeductions;
      updateData.grossPay = grossPay;
      updateData.netPay = Math.max(0, netPay);
    }

    const updated = await prisma.payroll.update({
      where: { id: params.id },
      data: updateData,
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDevelopment ? (error.message || 'Failed to get payroll') : 'Failed to get payroll' },
      { status: 500 }
    );
  }
}
