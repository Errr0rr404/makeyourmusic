import { NextRequest } from 'next/server';
import { getJournalEntries, createJournalEntry } from '@/lib/server/controllers/accountingController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const GET = createRouteHandler(getJournalEntries);
export const POST = createRouteHandler(createJournalEntry);
