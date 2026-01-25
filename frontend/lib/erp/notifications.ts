/**
 * Enterprise Notification System
 * Real-time notifications, email alerts, and notification preferences
 */

import api from '@/lib/api';

export type NotificationType =
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_ESCALATED'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'MENTION'
  | 'COMMENT'
  | 'DOCUMENT_SHARED'
  | 'REPORT_READY'
  | 'ALERT'
  | 'ANNOUNCEMENT'
  | 'SYSTEM'
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_FAILED'
  | 'BUDGET_THRESHOLD'
  | 'INVOICE_DUE'
  | 'INVOICE_OVERDUE'
  | 'CONTRACT_EXPIRING'
  | 'LOW_INVENTORY'
  | 'PROJECT_MILESTONE'
  | 'SECURITY_ALERT';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK' | 'TEAMS';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  channels: NotificationChannel[];
  sentVia: NotificationChannel[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  globalEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  typePreferences: Record<NotificationType, {
    enabled: boolean;
    channels: NotificationChannel[];
    priority: NotificationPriority; // Minimum priority to notify
  }>;
  digestEnabled: boolean;
  digestFrequency: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  digestTime?: string; // HH:mm for daily/weekly digests
}

export interface NotificationGroup {
  type: NotificationType;
  count: number;
  latestNotification: Notification;
  notifications: Notification[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Real-time notification connection
class NotificationService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(notification: Notification) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Connect to real-time notification stream
  connect(userId: string, token: string) {
    if (this.eventSource) {
      this.disconnect();
    }

    // Use NEXT_PUBLIC_API_URL or fallback to relative path
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    const url = `${apiUrl}/erp/notifications/stream?token=${token}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[Notifications] Connected to real-time stream');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        this.notifyListeners(notification);
      } catch (error) {
        console.error('[Notifications] Failed to parse notification:', error);
      }
    };

    this.eventSource.onerror = () => {
      console.error('[Notifications] Connection error');
      this.handleReconnect(userId, token);
    };
  }

  private handleReconnect(userId: string, token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Notifications] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`[Notifications] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect(userId, token);
    }, delay);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Subscribe to notifications
  subscribe(type: NotificationType | 'ALL', callback: (notification: Notification) => void): () => void {
    const key = type;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notifyListeners(notification: Notification) {
    // Notify type-specific listeners
    this.listeners.get(notification.type)?.forEach((callback) => callback(notification));
    // Notify ALL listeners
    this.listeners.get('ALL')?.forEach((callback) => callback(notification));
  }

  // Fetch notifications
  async getNotifications(options: {
    unreadOnly?: boolean;
    type?: NotificationType[];
    priority?: NotificationPriority[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    const params = new URLSearchParams();
    if (options.unreadOnly) params.set('unreadOnly', 'true');
    if (options.type?.length) params.set('type', options.type.join(','));
    if (options.priority?.length) params.set('priority', options.priority.join(','));
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));

    const response = await api.get(`/erp/notifications?${params.toString()}`);
    return response.data;
  }

  // Get grouped notifications
  async getGroupedNotifications(): Promise<NotificationGroup[]> {
    const response = await api.get('/erp/notifications/grouped');
    return response.data;
  }

  // Get notification stats
  async getStats(): Promise<NotificationStats> {
    const response = await api.get('/erp/notifications/stats');
    return response.data;
  }

  // Mark as read
  async markAsRead(notificationIds: string[]): Promise<void> {
    await api.post('/erp/notifications/mark-read', { ids: notificationIds });
  }

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    await api.post('/erp/notifications/mark-all-read');
  }

  // Dismiss notification
  async dismiss(notificationId: string): Promise<void> {
    await api.post(`/erp/notifications/${notificationId}/dismiss`);
  }

  // Get preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/erp/notifications/preferences');
    return response.data;
  }

  // Update preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put('/erp/notifications/preferences', preferences);
    return response.data;
  }

  // Send test notification
  async sendTest(channel: NotificationChannel): Promise<void> {
    await api.post('/erp/notifications/test', { channel });
  }

  // Create notification (admin only)
  async create(notification: {
    userId?: string;
    userIds?: string[];
    roleIds?: string[];
    departmentIds?: string[];
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    link?: string;
    channels?: NotificationChannel[];
    expiresAt?: Date;
  }): Promise<Notification | Notification[]> {
    const response = await api.post('/erp/notifications', notification);
    return response.data;
  }

  // Create announcement (broadcasts to all users)
  async createAnnouncement(announcement: {
    title: string;
    message: string;
    priority: NotificationPriority;
    link?: string;
    expiresAt?: Date;
    targetRoles?: string[];
    targetDepartments?: string[];
  }): Promise<void> {
    await api.post('/erp/notifications/announcement', announcement);
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Partial<NotificationPreferences> = {
  globalEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  quietHoursEnabled: false,
  digestEnabled: false,
  digestFrequency: 'DAILY',
  typePreferences: {
    APPROVAL_REQUEST: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'NORMAL' },
    APPROVAL_APPROVED: { enabled: true, channels: ['IN_APP'], priority: 'LOW' },
    APPROVAL_REJECTED: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'NORMAL' },
    APPROVAL_ESCALATED: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    TASK_ASSIGNED: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'NORMAL' },
    TASK_DUE_SOON: { enabled: true, channels: ['IN_APP'], priority: 'LOW' },
    TASK_OVERDUE: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    MENTION: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'NORMAL' },
    COMMENT: { enabled: true, channels: ['IN_APP'], priority: 'LOW' },
    DOCUMENT_SHARED: { enabled: true, channels: ['IN_APP'], priority: 'LOW' },
    REPORT_READY: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'NORMAL' },
    ALERT: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    ANNOUNCEMENT: { enabled: true, channels: ['IN_APP'], priority: 'NORMAL' },
    SYSTEM: { enabled: true, channels: ['IN_APP'], priority: 'LOW' },
    WORKFLOW_STARTED: { enabled: true, channels: ['IN_APP'], priority: 'LOW' },
    WORKFLOW_COMPLETED: { enabled: true, channels: ['IN_APP'], priority: 'NORMAL' },
    WORKFLOW_FAILED: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    BUDGET_THRESHOLD: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    INVOICE_DUE: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'NORMAL' },
    INVOICE_OVERDUE: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    CONTRACT_EXPIRING: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    LOW_INVENTORY: { enabled: true, channels: ['IN_APP', 'EMAIL'], priority: 'HIGH' },
    PROJECT_MILESTONE: { enabled: true, channels: ['IN_APP'], priority: 'NORMAL' },
    SECURITY_ALERT: { enabled: true, channels: ['IN_APP', 'EMAIL', 'SMS'], priority: 'URGENT' },
  },
};

// Helper to get notification icon
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    APPROVAL_REQUEST: '📋',
    APPROVAL_APPROVED: '✅',
    APPROVAL_REJECTED: '❌',
    APPROVAL_ESCALATED: '⬆️',
    TASK_ASSIGNED: '📌',
    TASK_DUE_SOON: '⏰',
    TASK_OVERDUE: '🚨',
    MENTION: '@',
    COMMENT: '💬',
    DOCUMENT_SHARED: '📄',
    REPORT_READY: '📊',
    ALERT: '⚠️',
    ANNOUNCEMENT: '📢',
    SYSTEM: '⚙️',
    WORKFLOW_STARTED: '▶️',
    WORKFLOW_COMPLETED: '✔️',
    WORKFLOW_FAILED: '❗',
    BUDGET_THRESHOLD: '💰',
    INVOICE_DUE: '📃',
    INVOICE_OVERDUE: '📛',
    CONTRACT_EXPIRING: '📝',
    LOW_INVENTORY: '📦',
    PROJECT_MILESTONE: '🎯',
    SECURITY_ALERT: '🔒',
  };
  return icons[type] || '🔔';
}

// Helper to get notification color
export function getNotificationColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    LOW: 'text-gray-500',
    NORMAL: 'text-blue-500',
    HIGH: 'text-orange-500',
    URGENT: 'text-red-500',
  };
  return colors[priority];
}
