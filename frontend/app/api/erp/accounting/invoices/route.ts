import { NextRequest } from 'next/server';
import { getInvoices, createInvoice } from '@/lib/server/controllers/accountingController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getInvoices);
export const POST = createRouteHandler(createInvoice);
