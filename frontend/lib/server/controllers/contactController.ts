import { NextRequest, NextResponse } from 'next/server';
import { ContactStatus } from '@/generated/prisma/client';
import { prisma } from '../utils/db';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';
import { requireAdminAccess } from '../middleware/authHelpers';

export const getContactMessages = async (req: NextRequest): Promise<NextResponse> => {
  requireAdminAccess(req);

  const pageParam = Number(req.nextUrl.searchParams.get('page') || '1');
  const limitParam = Number(req.nextUrl.searchParams.get('limit') || '50');
  const statusParam = req.nextUrl.searchParams.get('status');
  const { page, limit, skip } = getPaginationParams(pageParam, limitParam, 50, 100);

  const where: { status?: ContactStatus } = {};
  if (statusParam && (Object.values(ContactStatus) as string[]).includes(statusParam)) {
    where.status = statusParam as ContactStatus;
  }

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contactMessage.count({ where }),
  ]);

  const response = formatPaginationResponse(messages, total, page, limit);
  return NextResponse.json({
    messages: response.data,
    pagination: response.pagination,
  });
};
