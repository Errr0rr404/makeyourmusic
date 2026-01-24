import { getOpportunities, createOpportunity } from '@/lib/server/controllers/crmController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getOpportunities);
export const POST = createRouteHandler(createOpportunity);
