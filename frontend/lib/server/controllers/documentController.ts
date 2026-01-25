import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { requireERPAccess } from '../middleware/authHelpers';

// Get documents
export const getDocuments = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireERPAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'HR_MANAGER', 'SALES_MANAGER', 'PROJECT_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const category = searchParams.get('category');
  const folderId = searchParams.get('folderId');

  const where: Record<string, unknown> = {
    OR: [
      { isPublic: true },
      { accessLevel: 'INTERNAL' },
      { createdBy: user.userId },
    ],
  };
  if (category) where.category = category;
  if (folderId) where.folderId = folderId;

  // Check if document model exists
  const prismaAny = prisma as unknown as Record<string, { 
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>,
    count: (args: Record<string, unknown>) => Promise<number>,
    create: (args: Record<string, unknown>) => Promise<unknown>
  } | undefined>;

  if (!prismaAny.document) {
    return NextResponse.json({
      documents: [],
      pagination: { page, limit, total: 0, pages: 0 },
    });
  }

  const documentModel = prismaAny.document;
  const [documents, total] = await Promise.all([
    documentModel.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    }),
    documentModel.count({ where }),
  ]);

  return NextResponse.json({
    documents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create document (metadata only - file upload handled separately)
export const createDocument = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireERPAccess(req);
  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'HR_MANAGER', 'SALES_MANAGER', 'PROJECT_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { name, fileName, fileUrl, fileType, fileSize, category, tags, description, folderId, accessLevel, metadata } = body;

  if (!name || !fileName || !fileUrl) {
    throw new AppError('Name, file name, and file URL are required', 400);
  }

  // Validate access level
  if (accessLevel && !['PRIVATE', 'INTERNAL', 'PUBLIC'].includes(accessLevel)) {
    throw new AppError('Invalid access level. Must be PRIVATE, INTERNAL, or PUBLIC', 400);
  }

  // Validate file size if provided
  if (fileSize && fileSize < 0) {
    throw new AppError('File size must be non-negative', 400);
  }

  // Validate folder exists if provided
  if (folderId) {
    // Note: Folder functionality would need to be implemented
    // For now, we'll just validate the format
    if (typeof folderId !== 'string' || folderId.length === 0) {
      throw new AppError('Invalid folder ID', 400);
    }
  }

  // Check if document model exists
  const prismaAny = prisma as unknown as Record<string, { 
    create: (args: Record<string, unknown>) => Promise<unknown>
  } | undefined>;

  if (!prismaAny.document) {
    throw new AppError('Document management is not available', 501);
  }

  const documentModel = prismaAny.document;
  const document = await documentModel.create({
    data: {
      name,
      fileName,
      fileUrl,
      fileType: fileType || 'application/octet-stream',
      fileSize: fileSize || 0,
      category: category || null,
      tags: tags || [],
      description,
      folderId: folderId || null,
      isPublic: accessLevel === 'PUBLIC',
      accessLevel: accessLevel || 'PRIVATE',
      version: 1,
      metadata: metadata || {},
      createdBy: user.userId,
    },
  });

  return NextResponse.json(document);
};
