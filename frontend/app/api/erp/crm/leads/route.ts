import { NextRequest } from 'next/server';
import { getLeads, createLead } from '@/lib/server/controllers/crmController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getLeads);
export const POST = createRouteHandler(createLead);
