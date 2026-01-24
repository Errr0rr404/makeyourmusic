import { NextRequest } from 'next/server';
import { getNotifications, createNotification } from '@/lib/server/controllers/notificationController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(async (req: NextRequest) => {
  return await getNotifications(req);
});

export const POST = createRouteHandler(async (req: NextRequest) => {
  return await createNotification(req);
});
