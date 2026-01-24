import { NextRequest } from 'next/server';
import { markAllAsRead } from '@/lib/server/controllers/notificationController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const PUT = createRouteHandler(async (req: NextRequest) => {
  return await markAllAsRead(req);
});
