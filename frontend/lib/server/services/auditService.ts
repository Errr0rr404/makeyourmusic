/**
 * Comprehensive Audit Service
 * Tracks all changes across ERP modules for compliance and security
 */


export interface AuditEntry {
  module: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'POST' | 'APPROVE' | 'REJECT';
  entityType: string;
  entityId: string;
  userId: string;
  userName?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit entry
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    // Store in database (assuming we have an AuditLog table)
    // For now, we'll log to structured output and could extend to database
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
      }, null, 2));
    }

    // TODO: When AuditLog model is added to schema, uncomment:
    /*
    await prisma.auditLog.create({
      data: {
        module: entry.module,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId,
        userName: entry.userName,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
    */
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - we don't want audit logging to break the main operation
  }
}

/**
 * Calculate changes between old and new objects
 */
export function calculateChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Check for changed or new fields
  for (const key in newData) {
    if (newData[key] !== oldData[key]) {
      // Skip sensitive fields
      if (key === 'password' || key === 'passwordHash' || key === 'token') {
        continue;
      }
      changes[key] = { old: oldData[key], new: newData[key] };
    }
  }

  // Check for removed fields
  for (const key in oldData) {
    if (!(key in newData) && oldData[key] !== undefined) {
      changes[key] = { old: oldData[key], new: undefined };
    }
  }

  return changes;
}

/**
 * Audit middleware for tracking changes
 */
export function auditMiddleware(module: string, entityType: string) {
  return {
    async onCreate(entityId: string, data: unknown, userId: string, metadata?: Record<string, unknown>) {
      await logAudit({
        module,
        action: 'CREATE',
        entityType,
        entityId,
        userId,
        metadata: { ...metadata, data },
      });
    },

    async onUpdate(
      entityId: string,
      oldData: Record<string, unknown>,
      newData: Record<string, unknown>,
      userId: string,
      metadata?: Record<string, unknown>
    ) {
      const changes = calculateChanges(oldData, newData);
      if (Object.keys(changes).length > 0) {
        await logAudit({
          module,
          action: 'UPDATE',
          entityType,
          entityId,
          userId,
          changes,
          metadata,
        });
      }
    },

    async onDelete(entityId: string, data: unknown, userId: string, metadata?: Record<string, unknown>) {
      await logAudit({
        module,
        action: 'DELETE',
        entityType,
        entityId,
        userId,
        metadata: { ...metadata, deletedData: data },
      });
    },

    async onView(entityId: string, userId: string, metadata?: Record<string, unknown>) {
      // Only log sensitive views
      if (metadata?.sensitive) {
        await logAudit({
          module,
          action: 'VIEW',
          entityType,
          entityId,
          userId,
          metadata,
        });
      }
    },

    async onExport(userId: string, filters: unknown, count: number, metadata?: Record<string, unknown>) {
      await logAudit({
        module,
        action: 'EXPORT',
        entityType,
        entityId: 'bulk',
        userId,
        metadata: { ...metadata, filters, recordCount: count },
      });
    },
  };
}

/**
 * Accounting-specific audit helpers
 */
export const accountingAudit = auditMiddleware('ACCOUNTING', 'financial');

/**
 * CRM-specific audit helpers
 */
export const crmAudit = auditMiddleware('CRM', 'customer');

/**
 * Project-specific audit helpers
 */
export const projectAudit = auditMiddleware('PROJECTS', 'project');

/**
 * HR-specific audit helpers
 */
export const hrAudit = auditMiddleware('HR', 'employee');

/**
 * Inventory-specific audit helpers
 */
export const inventoryAudit = auditMiddleware('INVENTORY', 'product');

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(params: {
  module?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<unknown[]> {
  // TODO: Implement when AuditLog model exists
  // For now, return empty array
  console.log('Getting audit trail with params:', params);
  return [];

  /*
  const where: any = {};
  if (params.module) where.module = params.module;
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    take: params.limit || 100,
    orderBy: { createdAt: 'desc' },
  });

  return logs;
  */
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(params: {
  startDate: Date;
  endDate: Date;
  modules?: string[];
}): Promise<unknown> {
  // TODO: Implement when AuditLog model exists
  const { startDate, endDate } = params;
  void params.modules; // Suppress unused variable warning until implementation

  return {
    period: { startDate, endDate },
    summary: {
      totalActions: 0,
      byModule: {},
      byAction: {},
      byUser: {},
    },
    criticalActions: [],
    suspiciousActivities: [],
  };
}

export const auditService = {
  logAudit,
  calculateChanges,
  auditMiddleware,
  accountingAudit,
  crmAudit,
  projectAudit,
  hrAudit,
  inventoryAudit,
  getAuditTrail,
  generateComplianceReport,
};
