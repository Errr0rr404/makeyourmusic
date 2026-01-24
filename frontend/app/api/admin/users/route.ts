import { NextRequest } from 'next/server';
import { getAdminUsers } from '@/lib/server/controllers/adminController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(async (req: NextRequest) => {
  return await getAdminUsers(req);
});
