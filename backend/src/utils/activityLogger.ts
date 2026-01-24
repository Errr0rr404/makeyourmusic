import { prisma } from './db';
import logger from './logger';

export interface ActivityLogData {
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log user activities for audit trail
 */
export const logActivity = async (data: ActivityLogData): Promise<void> => {
  try {
    // Store in database if ActivityLog model exists
    const prismaClient = prisma as any;
    
    if (prismaClient.activityLog) {
      await prismaClient.activityLog.create({
        data: {
          userId: data.userId || null,
          userEmail: data.userEmail || null,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId || null,
          details: data.details || {},
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    }

    // Also log to Winston
    logger.info('Activity logged', {
      userId: data.userId,
      userEmail: data.userEmail,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
    });
  } catch (error) {
    // Don't fail the request if activity logging fails
    logger.error('Failed to log activity', {
      error: error instanceof Error ? error.message : 'Unknown error',
      activityData: data,
    });
  }
};

/**
 * Common activity actions
 */
export const ActivityActions = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET: 'PASSWORD_RESET',
  
  // Products
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  
  // Orders
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_UPDATE: 'ORDER_UPDATE',
  ORDER_CANCEL: 'ORDER_CANCEL',
  ORDER_REFUND: 'ORDER_REFUND',
  
  // Payments
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  
  // Admin Actions
  ADMIN_ACTION: 'ADMIN_ACTION',
  MASTERMIND_CONFIG_UPDATE: 'MASTERMIND_CONFIG_UPDATE',
  
  // User Management
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
} as const;
