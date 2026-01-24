import { NextRequest } from 'next/server';
import { login } from '@/lib/server/controllers/authController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';
import { authRateLimiter } from '@/lib/server/middleware/rateLimiter';

export const POST = createRouteHandler(async (req: NextRequest) => {
  // Apply rate limiting
  const rateLimitResult = await authRateLimiter(req);
  if (rateLimitResult) {
    return rateLimitResult;
  }
  
  return await login(req);
});
