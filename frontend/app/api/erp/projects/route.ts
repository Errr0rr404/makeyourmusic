import { getProjects, createProject } from '@/lib/server/controllers/projectController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getProjects);
export const POST = createRouteHandler(createProject);
