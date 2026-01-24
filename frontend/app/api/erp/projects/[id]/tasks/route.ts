import { NextRequest } from 'next/server';
import { getProjectTasks, createProjectTask } from '@/lib/server/controllers/projectController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  return await getProjectTasks(req, context);
});

export const POST = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  return await createProjectTask(req, context);
});
