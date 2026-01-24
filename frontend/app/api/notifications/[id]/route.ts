import { NextRequest } from 'next/server';
import { getNotification, deleteNotification } from '@/lib/server/controllers/notificationController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const params = await context.params;
  return await getNotification(req, { params });
});

export const DELETE = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const params = await context.params;
  return await deleteNotification(req, { params });
});
