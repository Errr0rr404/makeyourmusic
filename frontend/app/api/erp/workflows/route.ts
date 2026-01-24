import { getWorkflows, createWorkflow } from '@/lib/server/controllers/workflowController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getWorkflows);
export const POST = createRouteHandler(createWorkflow);
