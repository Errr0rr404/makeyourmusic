import { NextRequest } from 'next/server';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';
import { getAllNotificationsAdmin } from '@/lib/server/controllers/notificationController';

export const GET = createRouteHandler(async (req: NextRequest) => {
  return await getAllNotificationsAdmin(req);
});
