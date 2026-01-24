import { NextRequest } from 'next/server';
import { getMe, updateProfile } from '@/lib/server/controllers/authController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(async (req: NextRequest) => {
  return await getMe(req);
});

export const PUT = createRouteHandler(async (req: NextRequest) => {
  return await updateProfile(req);
});
