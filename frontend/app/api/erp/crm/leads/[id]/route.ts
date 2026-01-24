import { NextRequest } from 'next/server';
import { updateLead } from '@/lib/server/controllers/crmController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const PUT = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  return await updateLead(req, context);
});
