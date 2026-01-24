import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../middleware/auth';
import { AppError } from '../utils/errorHandler';

/**
 * Authenticate request and check if user has required roles
 * @param req - Next request object
 * @param requiredRoles - Array of roles that are allowed to access
 * @returns User object if authenticated and authorized
 * @throws AppError if authentication fails or user doesn't have required role
 */
export function requireAuth(req: NextRequest, requiredRoles?: string[]) {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    throw new AppError('Authentication required', 401);
  }

  const { user } = authResult;
  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  // If specific roles are required, check them
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.role)) {
      throw new AppError(`Access denied. Required roles: ${requiredRoles.join(', ')}`, 403);
    }
  }

  return user;
}

/**
 * Authenticate request and check for ERP access (any ERP role)
 */
export function requireERPAccess(req: NextRequest) {
  return requireAuth(req, [
    'ADMIN',
    'MASTERMIND',
    'CFO',
    'HR_MANAGER',
    'SALES_MANAGER',
    'OPERATIONS_MANAGER',
    'PROJECT_MANAGER',
    'ANALYST'
  ]);
}

/**
 * Require admin or mastermind access
 */
export function requireAdminAccess(req: NextRequest) {
  return requireAuth(req, ['ADMIN', 'MASTERMIND']);
}

/**
 * Require accounting access (CFO, Admin, Mastermind, Analyst)
 */
export function requireAccountingAccess(req: NextRequest) {
  return requireAuth(req, ['ADMIN', 'MASTERMIND', 'CFO', 'ANALYST']);
}

/**
 * Require CRM access
 */
export function requireCRMAccess(req: NextRequest) {
  return requireAuth(req, ['ADMIN', 'MASTERMIND', 'SALES_MANAGER', 'ANALYST']);
}

/**
 * Require project access
 */
export function requireProjectAccess(req: NextRequest) {
  return requireAuth(req, ['ADMIN', 'MASTERMIND', 'PROJECT_MANAGER', 'OPERATIONS_MANAGER', 'ANALYST']);
}

/**
 * Require HR access
 */
export function requireHRAccess(req: NextRequest) {
  return requireAuth(req, ['ADMIN', 'MASTERMIND', 'HR_MANAGER']);
}

/**
 * Require manager or higher (for POS)
 */
export function requireManagerAccess(req: NextRequest) {
  return requireAuth(req, ['MANAGER', 'ADMIN', 'MASTERMIND']);
}
