import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from './errorHandler';

export type RouteHandler = (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> | Record<string, string> }
) => Promise<NextResponse> | NextResponse;

export const createRouteHandler = <T extends ((req: NextRequest, context?: any) => any)>(handler: T): T => {
  return (async (req: NextRequest, context?: { params?: Promise<Record<string, string>> | Record<string, string> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error, req);
    }
  }) as T;
};
