import { getDocuments, createDocument } from '@/lib/server/controllers/documentController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getDocuments);
export const POST = createRouteHandler(createDocument);
