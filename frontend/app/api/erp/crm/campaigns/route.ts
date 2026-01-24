import { NextRequest } from 'next/server';
import { getCampaigns, createCampaign } from '@/lib/server/controllers/crmController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getCampaigns);
export const POST = createRouteHandler(createCampaign);
