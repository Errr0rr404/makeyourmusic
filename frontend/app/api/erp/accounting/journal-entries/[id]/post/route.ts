import { NextRequest } from 'next/server';
import { postJournalEntry } from '@/lib/server/controllers/accountingController';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

export const POST = createRouteHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  return await postJournalEntry(req, context);
});
