import { NextRequest } from 'next/server';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';
import { getAdminOrders } from '@/lib/server/controllers/orderController';

export const GET = createRouteHandler(async (req: NextRequest) => {
  return await getAdminOrders(req);
});
