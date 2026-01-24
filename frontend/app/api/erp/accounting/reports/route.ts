import { NextRequest } from 'next/server';
import { getFinancialReports } from '@/lib/server/controllers/accountingController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getFinancialReports);
