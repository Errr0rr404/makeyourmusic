import { NextRequest, NextResponse } from 'next/server';
import { runAllIntegrations } from '@/lib/server/services/erpIntegrationService';
import { authenticate } from '@/lib/server/middleware/auth';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';
import { AppError } from '@/lib/server/utils/errorHandler';

export const POST = createRouteHandler(async (req: NextRequest) => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  const hasAccess = ['ADMIN', 'MASTERMIND'].includes(user.role);
  
  if (!hasAccess) {
    throw new AppError('Access denied. Admin or Mastermind role required.', 403);
  }

  try {
    const result = await runAllIntegrations();
    
    return NextResponse.json({
      success: true,
      message: 'Integration completed successfully',
      results: result.results,
    });
  } catch (error: any) {
    console.error('Integration error:', error);
    throw new AppError(`Integration failed: ${error.message || 'Unknown error'}`, 500);
  }
});
