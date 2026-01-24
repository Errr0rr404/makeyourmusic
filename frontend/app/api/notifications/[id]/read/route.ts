import { NextRequest } from 'next/server';
import { markAsRead } from '@/lib/server/controllers/notificationController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const PUT = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const params = await context.params;
  return await markAsRead(req, { params });
});
