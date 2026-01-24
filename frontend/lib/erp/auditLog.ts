/**
 * Enterprise Audit Logging System
 * Provides comprehensive audit trail functionality for compliance and security
 */

import api from '@/lib/api';

export type AuditAction =
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

export type AuditModule =
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

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
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

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: AuditAction[];
  module?: AuditModule[];
  severity?: AuditSeverity[];
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  searchTerm?: string;
}

export interface AuditLogStats {
  totalActions: number;
  actionsByType: Record<AuditAction, number>;
  actionsByModule: Record<AuditModule, number>;
  actionsBySeverity: Record<AuditSeverity, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  failedActions: number;
  criticalEvents: number;
}

// Client-side audit logger for frontend actions
class AuditLogger {
  private queue: Partial<AuditLogEntry>[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    if (typeof window !== 'undefined') {
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>) {
    const fullEntry: Partial<AuditLogEntry> = {
      ...entry,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // For critical events, send immediately
    if (entry.severity === 'CRITICAL') {
      await this.sendToServer([fullEntry]);
      return;
    }

    this.queue.push(fullEntry);

    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  async flush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.queue.length === 0) return;

    const entries = [...this.queue];
    this.queue = [];

    await this.sendToServer(entries);
  }

  private async sendToServer(entries: Partial<AuditLogEntry>[]) {
    try {
      await api.post('/erp/audit/log', { entries });
    } catch (error) {
      console.error('Failed to send audit logs:', error);
      // Re-queue failed entries (but limit to prevent infinite growth)
      if (this.queue.length < this.MAX_QUEUE_SIZE * 2) {
        this.queue.push(...entries);
      }
    }
  }

  // Convenience methods for common actions
  async logCreate(module: AuditModule, resourceType: string, resourceId: string, resourceName: string, userId: string, metadata?: Record<string, unknown>) {
    await this.log({
      userId,
      action: 'CREATE',
      module,
      severity: 'INFO',
      resourceType,
      resourceId,
      resourceName,
      description: `Created ${resourceType}: ${resourceName}`,
      metadata,
      success: true,
    });
  }

  async logUpdate(module: AuditModule, resourceType: string, resourceId: string, resourceName: string, userId: string, previousValue: unknown, newValue: unknown) {
    await this.log({
      userId,
      action: 'UPDATE',
      module,
      severity: 'INFO',
      resourceType,
      resourceId,
      resourceName,
      description: `Updated ${resourceType}: ${resourceName}`,
      previousValue,
      newValue,
      success: true,
    });
  }

  async logDelete(module: AuditModule, resourceType: string, resourceId: string, resourceName: string, userId: string) {
    await this.log({
      userId,
      action: 'DELETE',
      module,
      severity: 'WARNING',
      resourceType,
      resourceId,
      resourceName,
      description: `Deleted ${resourceType}: ${resourceName}`,
      success: true,
    });
  }

  async logAccess(module: AuditModule, resourceType: string, resourceId: string, resourceName: string, userId: string) {
    await this.log({
      userId,
      action: 'READ',
      module,
      severity: 'INFO',
      resourceType,
      resourceId,
      resourceName,
      description: `Accessed ${resourceType}: ${resourceName}`,
      success: true,
    });
  }

  async logApproval(module: AuditModule, resourceType: string, resourceId: string, resourceName: string, userId: string, approved: boolean, comments?: string) {
    await this.log({
      userId,
      action: approved ? 'APPROVE' : 'REJECT',
      module,
      severity: approved ? 'INFO' : 'WARNING',
      resourceType,
      resourceId,
      resourceName,
      description: `${approved ? 'Approved' : 'Rejected'} ${resourceType}: ${resourceName}`,
      metadata: { comments },
      success: true,
    });
  }

  async logExport(module: AuditModule, resourceType: string, userId: string, format: string, recordCount: number) {
    await this.log({
      userId,
      action: 'EXPORT',
      module,
      severity: 'INFO',
      resourceType,
      description: `Exported ${recordCount} ${resourceType} records as ${format}`,
      metadata: { format, recordCount },
      success: true,
    });
  }

  async logSecurityEvent(userId: string, description: string, metadata?: Record<string, unknown>, success = false) {
    await this.log({
      userId,
      action: 'LOGIN',
      module: 'AUTH',
      severity: 'CRITICAL',
      resourceType: 'AUTH',
      description,
      metadata,
      success,
    });
  }

  async logConfigChange(userId: string, configType: string, previousValue: unknown, newValue: unknown) {
    await this.log({
      userId,
      action: 'CONFIG_CHANGE',
      module: 'SYSTEM',
      severity: 'WARNING',
      resourceType: 'CONFIG',
      resourceName: configType,
      description: `Changed system configuration: ${configType}`,
      previousValue,
      newValue,
      success: true,
    });
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Fetch audit logs
export async function fetchAuditLogs(filter: AuditLogFilter, page = 1, pageSize = 50): Promise<{
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  if (filter.startDate) params.set('startDate', filter.startDate.toISOString());
  if (filter.endDate) params.set('endDate', filter.endDate.toISOString());
  if (filter.userId) params.set('userId', filter.userId);
  if (filter.action?.length) params.set('action', filter.action.join(','));
  if (filter.module?.length) params.set('module', filter.module.join(','));
  if (filter.severity?.length) params.set('severity', filter.severity.join(','));
  if (filter.resourceType) params.set('resourceType', filter.resourceType);
  if (filter.resourceId) params.set('resourceId', filter.resourceId);
  if (filter.success !== undefined) params.set('success', String(filter.success));
  if (filter.searchTerm) params.set('search', filter.searchTerm);

  const response = await api.get(`/erp/audit/logs?${params.toString()}`);
  return response.data;
}

// Fetch audit statistics
export async function fetchAuditStats(startDate?: Date, endDate?: Date): Promise<AuditLogStats> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate.toISOString());
  if (endDate) params.set('endDate', endDate.toISOString());

  const response = await api.get(`/erp/audit/stats?${params.toString()}`);
  return response.data;
}

// Export audit logs
export async function exportAuditLogs(filter: AuditLogFilter, format: 'csv' | 'json' | 'pdf'): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('format', format);

  if (filter.startDate) params.set('startDate', filter.startDate.toISOString());
  if (filter.endDate) params.set('endDate', filter.endDate.toISOString());
  if (filter.userId) params.set('userId', filter.userId);
  if (filter.action?.length) params.set('action', filter.action.join(','));
  if (filter.module?.length) params.set('module', filter.module.join(','));

  const response = await api.get(`/erp/audit/export?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
}
