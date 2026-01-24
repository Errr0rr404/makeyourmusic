import { getAIInsights } from '@/lib/server/controllers/aiController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getAIInsights);
