import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/utils/db';
import { requireAuth } from '@/lib/server/middleware/authHelpers';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

/**
 * Audit Log API
 * Tracks all system changes for compliance and security
 */

export const GET = createRouteHandler(async (req: NextRequest) => {
  const user = requireAuth(req, ['ADMIN', 'MASTERMIND']);

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  const entityType = searchParams.get('entityType');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: any = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  try {
    const prismaClient = prisma as any;

    // Check if auditLog model exists
    if (!prismaClient.auditLog) {
      return NextResponse.json({
        logs: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
        message: 'Audit logging not yet configured',
      });
    }

    const [logs, total] = await Promise.all([
      prismaClient.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prismaClient.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // Audit log table might not exist
    return NextResponse.json({
      logs: [],
      pagination: { page: 1, limit, total: 0, pages: 0 },
      message: 'Audit logging not yet configured',
    });
  }
});

/**
 * Create audit log entry
 * This is typically called internally, not via API
 */
export async function createAuditLog(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    const prismaClient = prisma as any;

    // Check if auditLog model exists
    if (!prismaClient.auditLog) {
      return null;
    }

    return await prismaClient.auditLog.create({
      data: {
        ...data,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  } catch (error) {
    // Silently fail if audit log table doesn't exist
    console.error('Audit log creation failed:', error);
    return null;
  }
}

// Helper function to log common actions
export const AuditLogger = {
  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return createAuditLog({
      userId,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  },

  async logLogout(userId: string) {
    return createAuditLog({
      userId,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId,
    });
  },

  async logCreate(userId: string, entityType: string, entityId: string, data: any) {
    return createAuditLog({
      userId,
      action: 'CREATE',
      entityType,
      entityId,
      changes: { new: data },
    });
  },

  async logUpdate(userId: string, entityType: string, entityId: string, oldData: any, newData: any) {
    return createAuditLog({
      userId,
      action: 'UPDATE',
      entityType,
      entityId,
      changes: { old: oldData, new: newData },
    });
  },

  async logDelete(userId: string, entityType: string, entityId: string, data: any) {
    return createAuditLog({
      userId,
      action: 'DELETE',
      entityType,
      entityId,
      changes: { deleted: data },
    });
  },

  async logConfigChange(userId: string, setting: string, oldValue: any, newValue: any) {
    return createAuditLog({
      userId,
      action: 'CONFIG_CHANGE',
      entityType: 'Configuration',
      entityId: setting,
      changes: { old: oldValue, new: newValue },
    });
  },

  async logSecurityEvent(userId: string, event: string, metadata?: any) {
    return createAuditLog({
      userId,
      action: 'SECURITY_EVENT',
      entityType: 'Security',
      metadata: { event, ...metadata },
    });
  },
};
