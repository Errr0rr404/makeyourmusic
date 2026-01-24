import { NextRequest } from 'next/server';
import { getChartOfAccounts, createChartOfAccount } from '@/lib/server/controllers/accountingController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getChartOfAccounts);
export const POST = createRouteHandler(createChartOfAccount);
