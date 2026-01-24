// Advanced Security & Audit System
// Enterprise-grade security monitoring, audit trails, and compliance

import { create } from 'zustand';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface SecurityAlert {
  id: string;
  type: 'authentication' | 'authorization' | 'data' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  resolved: boolean;
  actions?: string[];
}

export interface AccessControl {
  resource: string;
  action: string;
  allowed: boolean;
  reason?: string;
}

class SecurityService {
  private auditLogs: AuditLog[] = [];
  private securityAlerts: SecurityAlert[] = [];

  // Log user action for audit trail
  logAction(
    action: string,
    resource: string,
    resourceId?: string,
    changes?: Record<string, any>
  ): void {
    const user = this.getCurrentUser();

    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: user?.id || 'anonymous',
      userName: user?.name || 'Anonymous',
      action,
      resource,
      resourceId,
      changes,
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
      status: 'success',
      severity: this.calculateSeverity(action),
    };

    this.auditLogs.push(log);

    // Store in localStorage (in production, send to backend)
    this.persistAuditLog(log);

    // Check for suspicious activity
    this.detectAnomalies(log);
  }

  // Get audit logs with filtering
  getAuditLogs(filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
      if (filters.resource) logs = logs.filter(l => l.resource === filters.resource);
      if (filters.action) logs = logs.filter(l => l.action === filters.action);
      if (filters.severity) logs = logs.filter(l => l.severity === filters.severity);
      if (filters.startDate) logs = logs.filter(l => l.timestamp >= filters.startDate!);
      if (filters.endDate) logs = logs.filter(l => l.timestamp <= filters.endDate!);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Create security alert
  createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: SecurityAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
    };

    this.securityAlerts.push(newAlert);

    // In production, send to backend and notify admins
    if (alert.severity === 'critical' || alert.severity === 'high') {
      this.notifySecurityTeam(newAlert);
    }
  }

  // Get active security alerts
  getSecurityAlerts(includeResolved: boolean = false): SecurityAlert[] {
    let alerts = [...this.securityAlerts];

    if (!includeResolved) {
      alerts = alerts.filter(a => !a.resolved);
    }

    return alerts.sort((a, b) => {
      // Sort by severity first, then by timestamp
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];

      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  // Resolve security alert
  resolveAlert(alertId: string): void {
    const alert = this.securityAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logAction('RESOLVE_ALERT', 'security_alert', alertId);
    }
  }

  // Check access permissions
  checkAccess(resource: string, action: string): AccessControl {
    const user = this.getCurrentUser();

    if (!user) {
      return { resource, action, allowed: false, reason: 'Not authenticated' };
    }

    // Role-based access control
    const hasAccess = this.evaluatePermissions(user.role, resource, action);

    // Log access attempt
    this.logAction(
      hasAccess ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      resource,
      undefined,
      { action, role: user.role }
    );

    return {
      resource,
      action,
      allowed: hasAccess,
      reason: hasAccess ? undefined : 'Insufficient permissions',
    };
  }

  // Data encryption (client-side sensitive data)
  encryptSensitiveData(data: string): string {
    // In production, use proper encryption library
    return btoa(data); // Simple base64 for demo
  }

  decryptSensitiveData(encrypted: string): string {
    try {
      return atob(encrypted);
    } catch {
      return '';
    }
  }

  // Detect suspicious activity patterns
  private detectAnomalies(log: AuditLog): void {
    // Check for multiple failed login attempts
    const recentFailures = this.auditLogs
      .filter(l =>
        l.userId === log.userId &&
        l.action === 'LOGIN_FAILED' &&
        l.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      );

    if (recentFailures.length >= 5) {
      this.createAlert({
        type: 'authentication',
        severity: 'high',
        title: 'Multiple Failed Login Attempts',
        description: `User ${log.userName} has ${recentFailures.length} failed login attempts in the last 15 minutes`,
        userId: log.userId,
        actions: ['Lock account', 'Reset password', 'Contact user'],
      });
    }

    // Check for unusual access patterns
    const recentActions = this.auditLogs
      .filter(l =>
        l.userId === log.userId &&
        l.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

    if (recentActions.length >= 50) {
      this.createAlert({
        type: 'system',
        severity: 'medium',
        title: 'Unusual Activity Pattern',
        description: `User ${log.userName} has performed ${recentActions.length} actions in 5 minutes`,
        userId: log.userId,
        actions: ['Monitor user', 'Review activity'],
      });
    }

    // Check for privilege escalation attempts
    if (log.action.includes('PERMISSION') || log.action.includes('ROLE')) {
      this.createAlert({
        type: 'authorization',
        severity: 'high',
        title: 'Permission Change Detected',
        description: `User ${log.userName} modified permissions or roles`,
        userId: log.userId,
        actions: ['Review changes', 'Verify authorization'],
      });
    }
  }

  // Calculate action severity
  private calculateSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = ['DELETE_USER', 'DELETE_DATA', 'EXPORT_ALL'];
    const highActions = ['UPDATE_PERMISSIONS', 'UPDATE_ROLE', 'ACCESS_SENSITIVE'];
    const mediumActions = ['UPDATE', 'CREATE', 'LOGIN_FAILED'];

    if (criticalActions.some(a => action.includes(a))) return 'critical';
    if (highActions.some(a => action.includes(a))) return 'high';
    if (mediumActions.some(a => action.includes(a))) return 'medium';
    return 'low';
  }

  // Permission evaluation
  private evaluatePermissions(role: string, resource: string, action: string): boolean {
    const permissions: Record<string, Record<string, string[]>> = {
      ADMIN: { '*': ['*'] }, // Admin has all permissions
      MANAGER: {
        'users': ['read', 'create', 'update'],
        'products': ['*'],
        'orders': ['*'],
        'reports': ['read'],
      },
      USER: {
        'products': ['read'],
        'orders': ['read', 'create'],
        'profile': ['*'],
      },
    };

    const rolePerms = permissions[role];
    if (!rolePerms) return false;

    // Check wildcard permissions
    if (rolePerms['*']?.includes('*')) return true;

    // Check specific resource permissions
    const resourcePerms = rolePerms[resource];
    if (!resourcePerms) return false;

    return resourcePerms.includes('*') || resourcePerms.includes(action);
  }

  // Helper methods
  private getCurrentUser(): { id: string; name: string; role: string } | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private getClientIP(): string {
    // In production, get from backend
    return 'Client IP';
  }

  private persistAuditLog(log: AuditLog): void {
    // In production, send to backend API
    console.log('📝 Audit Log:', log);
  }

  private notifySecurityTeam(alert: SecurityAlert): void {
    // In production, send notifications via email, Slack, etc.
    console.warn('🚨 Security Alert:', alert);
  }
}

// Singleton instance
export const securityService = new SecurityService();

// React Hook
export function useSecurity() {
  const logAction = (action: string, resource: string, resourceId?: string, changes?: Record<string, any>) => {
    securityService.logAction(action, resource, resourceId, changes);
  };

  const checkAccess = (resource: string, action: string) => {
    return securityService.checkAccess(resource, action);
  };

  const getAuditLogs = (filters?: any) => {
    return securityService.getAuditLogs(filters);
  };

  const getSecurityAlerts = (includeResolved?: boolean) => {
    return securityService.getSecurityAlerts(includeResolved);
  };

  const resolveAlert = (alertId: string) => {
    securityService.resolveAlert(alertId);
  };

  return {
    logAction,
    checkAccess,
    getAuditLogs,
    getSecurityAlerts,
    resolveAlert,
    encryptData: securityService.encryptSensitiveData.bind(securityService),
    decryptData: securityService.decryptSensitiveData.bind(securityService),
  };
}
