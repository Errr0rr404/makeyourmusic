import { NextRequest } from 'next/server';
import { logout } from '@/lib/server/controllers/authController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const POST = createRouteHandler(async (req: NextRequest) => {
  return await logout(req);
});
