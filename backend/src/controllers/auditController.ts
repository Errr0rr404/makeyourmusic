import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'CANCEL'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'PRINT'
  | 'EMAIL'
  | 'DOWNLOAD'
  | 'PERMISSION_CHANGE'
  | 'CONFIG_CHANGE'
  | 'BULK_ACTION';

type AuditModule =
  | 'ACCOUNTING'
  | 'CRM'
  | 'HR'
  | 'INVENTORY'
  | 'PROJECTS'
  | 'WORKFLOWS'
  | 'DOCUMENTS'
  | 'ANALYTICS'
  | 'SYSTEM'
  | 'AUTH'
  | 'USER_MANAGEMENT';

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AuditLogEntry {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  module: AuditModule;
  severity: AuditSeverity;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

// In-memory audit log store (in production, use a dedicated audit database)
const auditLogs: Array<AuditLogEntry & { id: string; timestamp: Date }> = [];

// Generate unique ID
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Log audit entries (batch)
export const logAuditEntries = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new AppError('Entries array is required', 400);
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'];

    const loggedEntries = entries.map((entry: Partial<AuditLogEntry>) => {
      const logEntry = {
        id: generateId(),
        timestamp: new Date(),
        userId: entry.userId || req.user?.userId || 'system',
        userName: entry.userName || req.user?.email,
        userEmail: entry.userEmail || req.user?.email,
        userRole: entry.userRole || req.user?.role,
        action: entry.action || 'READ',
        module: entry.module || 'SYSTEM',
        severity: entry.severity || 'INFO',
        resourceType: entry.resourceType || 'unknown',
        resourceId: entry.resourceId,
        resourceName: entry.resourceName,
        description: entry.description || '',
        metadata: entry.metadata,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        ipAddress: String(ipAddress),
        userAgent,
        sessionId: entry.sessionId,
        correlationId: entry.correlationId,
        duration: entry.duration,
        success: entry.success ?? true,
        errorMessage: entry.errorMessage,
      };

      auditLogs.unshift(logEntry);

      // Keep only last 10000 entries in memory
      if (auditLogs.length > 10000) {
        auditLogs.pop();
      }

      return logEntry;
    });

    logger.info(`Logged ${loggedEntries.length} audit entries`);

    res.status(201).json({ logged: loggedEntries.length });
  } catch (error) {
    return next(error);
  }
};

// Get audit logs with filtering and pagination
export const getAuditLogs = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Only ADMIN and MASTERMIND can view audit logs
    if (!['ADMIN', 'MASTERMIND'].includes(req.user?.role || '')) {
      throw new AppError('Unauthorized to view audit logs', 403);
    }

    const {
      page = '1',
      pageSize = '50',
      startDate,
      endDate,
      userId,
      action,
      module,
      severity,
      resourceType,
      resourceId,
      success,
      search,
    } = req.query;

    let filteredLogs = [...auditLogs];

    // Apply filters
    if (startDate) {
      const start = new Date(startDate as string);
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= end);
    }

    if (userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === userId);
    }

    if (action) {
      const actions = (action as string).split(',');
      filteredLogs = filteredLogs.filter((log) => actions.includes(log.action));
    }

    if (module) {
      const modules = (module as string).split(',');
      filteredLogs = filteredLogs.filter((log) => modules.includes(log.module));
    }

    if (severity) {
      const severities = (severity as string).split(',');
      filteredLogs = filteredLogs.filter((log) => severities.includes(log.severity));
    }

    if (resourceType) {
      filteredLogs = filteredLogs.filter((log) => log.resourceType === resourceType);
    }

    if (resourceId) {
      filteredLogs = filteredLogs.filter((log) => log.resourceId === resourceId);
    }

    if (success !== undefined) {
      const successBool = success === 'true';
      filteredLogs = filteredLogs.filter((log) => log.success === successBool);
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.description.toLowerCase().includes(searchTerm) ||
          log.resourceName?.toLowerCase().includes(searchTerm) ||
          log.userName?.toLowerCase().includes(searchTerm) ||
          log.userEmail?.toLowerCase().includes(searchTerm)
      );
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const total = filteredLogs.length;
    const totalPages = Math.ceil(total / size);
    const startIndex = (pageNum - 1) * size;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + size);

    res.json({
      logs: paginatedLogs,
      total,
      page: pageNum,
      pageSize: size,
      totalPages,
    });
  } catch (error) {
    return next(error);
  }
};

// Get audit statistics
export const getAuditStats = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Only ADMIN and MASTERMIND can view audit stats
    if (!['ADMIN', 'MASTERMIND'].includes(req.user?.role || '')) {
      throw new AppError('Unauthorized to view audit statistics', 403);
    }

    const { startDate, endDate } = req.query;

    let filteredLogs = [...auditLogs];

    if (startDate) {
      const start = new Date(startDate as string);
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= end);
    }

    // Calculate statistics
    const actionsByType: Record<string, number> = {};
    const actionsByModule: Record<string, number> = {};
    const actionsBySeverity: Record<string, number> = {};
    const userCounts: Record<string, { userId: string; userName: string; count: number }> = {};
    let failedActions = 0;
    let criticalEvents = 0;

    filteredLogs.forEach((log) => {
      // By action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

      // By module
      actionsByModule[log.module] = (actionsByModule[log.module] || 0) + 1;

      // By severity
      actionsBySeverity[log.severity] = (actionsBySeverity[log.severity] || 0) + 1;

      // By user
      if (!userCounts[log.userId]) {
        userCounts[log.userId] = { userId: log.userId, userName: log.userName || log.userId, count: 0 };
      }
      userCounts[log.userId]!.count++;

      // Failed actions
      if (!log.success) {
        failedActions++;
      }

      // Critical events
      if (log.severity === 'CRITICAL') {
        criticalEvents++;
      }
    });

    // Top users by action count
    const topUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      totalActions: filteredLogs.length,
      actionsByType,
      actionsByModule,
      actionsBySeverity,
      topUsers,
      failedActions,
      criticalEvents,
    });
  } catch (error) {
    return next(error);
  }
};

// Export audit logs
export const exportAuditLogs = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Only ADMIN and MASTERMIND can export audit logs
    if (!['ADMIN', 'MASTERMIND'].includes(req.user?.role || '')) {
      throw new AppError('Unauthorized to export audit logs', 403);
    }

    const { format = 'json', startDate, endDate, action, module } = req.query;

    let filteredLogs = [...auditLogs];

    // Apply filters
    if (startDate) {
      const start = new Date(startDate as string);
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= end);
    }

    if (action) {
      const actions = (action as string).split(',');
      filteredLogs = filteredLogs.filter((log) => actions.includes(log.action));
    }

    if (module) {
      const modules = (module as string).split(',');
      filteredLogs = filteredLogs.filter((log) => modules.includes(log.module));
    }

    // Log the export action
    auditLogs.unshift({
      id: generateId(),
      timestamp: new Date(),
      userId: req.user?.userId || 'system',
      userName: req.user?.email,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'EXPORT',
      module: 'SYSTEM',
      severity: 'WARNING',
      resourceType: 'AUDIT_LOG',
      description: `Exported ${filteredLogs.length} audit log entries as ${format}`,
      metadata: { format, recordCount: filteredLogs.length },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      success: true,
    });

    switch (format) {
      case 'csv': {
        const headers = [
          'ID',
          'Timestamp',
          'User',
          'Action',
          'Module',
          'Severity',
          'Resource Type',
          'Resource Name',
          'Description',
          'Success',
          'IP Address',
        ];
        const rows = filteredLogs.map((log) => [
          log.id,
          log.timestamp.toISOString(),
          log.userName || log.userId,
          log.action,
          log.module,
          log.severity,
          log.resourceType,
          log.resourceName || '',
          log.description,
          log.success ? 'Yes' : 'No',
          log.ipAddress || '',
        ]);

        const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
        return res.send(csv);
      }

      case 'pdf': {
        // In a real implementation, use a PDF library like pdfkit
        res.setHeader('Content-Type', 'application/json');
        return res.json({ error: 'PDF export not implemented yet', logs: filteredLogs });
      }

      case 'json':
      default: {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-log.json');
        return res.json(filteredLogs);
      }
    }
  } catch (error) {
    return next(error);
  }
};

// Utility function to log audit events from other controllers
export const logAuditEvent = (entry: AuditLogEntry & { ipAddress?: string; userAgent?: string }) => {
  const logEntry = {
    id: generateId(),
    timestamp: new Date(),
    ...entry,
  };

  auditLogs.unshift(logEntry);

  // Keep only last 10000 entries in memory
  if (auditLogs.length > 10000) {
    auditLogs.pop();
  }

  logger.info(`Audit: ${entry.action} - ${entry.description}`, {
    userId: entry.userId,
    module: entry.module,
    severity: entry.severity,
  });

  return logEntry;
};
