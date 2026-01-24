import { getModels, createPrediction } from '@/lib/server/controllers/aiController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getModels);
export const POST = createRouteHandler(createPrediction);
