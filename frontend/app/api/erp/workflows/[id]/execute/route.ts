import { NextRequest } from 'next/server';
import { executeWorkflow } from '@/lib/server/controllers/workflowController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const POST = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  return await executeWorkflow(req, context);
});
