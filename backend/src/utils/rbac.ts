/**
 * Enterprise-Grade Role-Based Access Control (RBAC)
 * Implements hierarchical permission model for ERP system
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  MASTERMIND = 'MASTERMIND',
  MANAGER = 'MANAGER',
  CFO = 'CFO',
  HR_MANAGER = 'HR_MANAGER',
  SALES_MANAGER = 'SALES_MANAGER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ANALYST = 'ANALYST',
}

export enum Permission {
  // Authentication & User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',

  // Accounting & Finance
  ACCOUNTING_READ = 'accounting:read',
  ACCOUNTING_CREATE = 'accounting:create',
  ACCOUNTING_UPDATE = 'accounting:update',
  ACCOUNTING_POST = 'accounting:post', // Post journal entries
  ACCOUNTING_REVERSE = 'accounting:reverse', // Reverse transactions
  ACCOUNTING_DELETE = 'accounting:delete',
  ACCOUNTING_REPORTS = 'accounting:reports',

  // Invoicing & Payments
  INVOICE_CREATE = 'invoice:create',
  INVOICE_READ = 'invoice:read',
  INVOICE_UPDATE = 'invoice:update',
  INVOICE_SEND = 'invoice:send',
  INVOICE_CANCEL = 'invoice:cancel',
  PAYMENT_RECORD = 'payment:record',
  PAYMENT_REFUND = 'payment:refund',

  // Sales & CRM
  SALES_READ = 'sales:read',
  SALES_CREATE = 'sales:create',
  SALES_UPDATE = 'sales:update',
  SALES_DELETE = 'sales:delete',
  LEAD_MANAGE = 'lead:manage',
  OPPORTUNITY_MANAGE = 'opportunity:manage',

  // Inventory
  INVENTORY_READ = 'inventory:read',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_ADJUST = 'inventory:adjust',
  INVENTORY_TRANSFER = 'inventory:transfer',

  // Projects
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_MANAGE_RESOURCES = 'project:manage_resources',

  // HR & Payroll
  EMPLOYEE_READ = 'employee:read',
  EMPLOYEE_CREATE = 'employee:create',
  EMPLOYEE_UPDATE = 'employee:update',
  EMPLOYEE_DELETE = 'employee:delete',
  PAYROLL_READ = 'payroll:read',
  PAYROLL_PROCESS = 'payroll:process',

  // Reports & Analytics
  REPORTS_READ = 'reports:read',
  REPORTS_EXPORT = 'reports:export',
  ANALYTICS_READ = 'analytics:read',

  // System Administration
  SYSTEM_CONFIGURE = 'system:configure',
  SYSTEM_AUDIT = 'system:audit',
  SYSTEM_BACKUP = 'system:backup',
}

/**
 * Define role hierarchy and associated permissions
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.MASTERMIND]: [
    // Mastermind: Full system access (Owner/CTO level)
    ...Object.values(Permission), // All permissions
  ],

  [UserRole.ADMIN]: [
    // Admin: System-wide administrative access
    Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE, Permission.USER_DELETE,
    Permission.ACCOUNTING_READ, Permission.ACCOUNTING_CREATE, Permission.ACCOUNTING_UPDATE, Permission.ACCOUNTING_POST,
    Permission.ACCOUNTING_REPORTS, Permission.INVOICE_CREATE, Permission.INVOICE_READ, Permission.INVOICE_UPDATE,
    Permission.PAYMENT_RECORD, Permission.SALES_READ, Permission.SALES_CREATE, Permission.SALES_UPDATE,
    Permission.INVENTORY_READ, Permission.INVENTORY_UPDATE, Permission.INVENTORY_ADJUST,
    Permission.PROJECT_READ, Permission.EMPLOYEE_READ, Permission.REPORTS_READ, Permission.SYSTEM_CONFIGURE,
    Permission.SYSTEM_AUDIT,
  ],

  [UserRole.CFO]: [
    // CFO: Financial operations and reporting
    Permission.ACCOUNTING_READ, Permission.ACCOUNTING_CREATE, Permission.ACCOUNTING_UPDATE, Permission.ACCOUNTING_POST,
    Permission.ACCOUNTING_REVERSE, Permission.ACCOUNTING_REPORTS, Permission.INVOICE_CREATE, Permission.INVOICE_READ,
    Permission.INVOICE_UPDATE, Permission.INVOICE_SEND, Permission.PAYMENT_RECORD, Permission.PAYMENT_REFUND,
    Permission.REPORTS_READ, Permission.REPORTS_EXPORT, Permission.ANALYTICS_READ, Permission.PAYROLL_READ,
  ],

  [UserRole.SALES_MANAGER]: [
    // Sales Manager: Sales and revenue operations
    Permission.SALES_READ, Permission.SALES_CREATE, Permission.SALES_UPDATE, Permission.SALES_DELETE,
    Permission.LEAD_MANAGE, Permission.OPPORTUNITY_MANAGE, Permission.INVOICE_READ, Permission.INVOICE_SEND,
    Permission.REPORTS_READ, Permission.REPORTS_EXPORT,
  ],

  [UserRole.HR_MANAGER]: [
    // HR Manager: Human resources and payroll
    Permission.EMPLOYEE_READ, Permission.EMPLOYEE_CREATE, Permission.EMPLOYEE_UPDATE, Permission.EMPLOYEE_DELETE,
    Permission.PAYROLL_READ, Permission.PAYROLL_PROCESS, Permission.REPORTS_READ, Permission.USER_READ,
  ],

  [UserRole.OPERATIONS_MANAGER]: [
    // Operations Manager: Inventory and logistics
    Permission.INVENTORY_READ, Permission.INVENTORY_UPDATE, Permission.INVENTORY_ADJUST, Permission.INVENTORY_TRANSFER,
    Permission.SALES_READ, Permission.REPORTS_READ, Permission.REPORTS_EXPORT,
  ],

  [UserRole.PROJECT_MANAGER]: [
    // Project Manager: Project management
    Permission.PROJECT_CREATE, Permission.PROJECT_READ, Permission.PROJECT_UPDATE, Permission.PROJECT_DELETE,
    Permission.PROJECT_MANAGE_RESOURCES, Permission.REPORTS_READ,
  ],

  [UserRole.ANALYST]: [
    // Analyst: Data analysis and reporting
    Permission.ACCOUNTING_READ, Permission.SALES_READ, Permission.INVENTORY_READ, Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT, Permission.ANALYTICS_READ,
  ],

  [UserRole.MANAGER]: [
    // Manager: General management access
    Permission.SALES_READ, Permission.SALES_CREATE, Permission.SALES_UPDATE, Permission.INVENTORY_READ,
    Permission.REPORTS_READ,
  ],

  [UserRole.CUSTOMER]: [
    // Customer: Limited access for customers
    // Customers can only read/update their own data
  ],
};

/**
 * Role hierarchy for inheritance (higher roles inherit lower)
 */
export const roleHierarchy: Record<UserRole, UserRole[]> = {
  [UserRole.MASTERMIND]: [UserRole.ADMIN, UserRole.CFO, UserRole.SALES_MANAGER],
  [UserRole.ADMIN]: [UserRole.MANAGER],
  [UserRole.CFO]: [],
  [UserRole.SALES_MANAGER]: [UserRole.MANAGER],
  [UserRole.HR_MANAGER]: [UserRole.MANAGER],
  [UserRole.OPERATIONS_MANAGER]: [UserRole.MANAGER],
  [UserRole.PROJECT_MANAGER]: [UserRole.MANAGER],
  [UserRole.ANALYST]: [UserRole.MANAGER],
  [UserRole.MANAGER]: [UserRole.CUSTOMER],
  [UserRole.CUSTOMER]: [],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role (including inherited)
 */
export function getAllPermissions(role: UserRole): Permission[] {
  const directPermissions = rolePermissions[role] || [];
  const inheritedRoles = roleHierarchy[role] || [];

  const allPermissions = new Set(directPermissions);

  for (const inheritedRole of inheritedRoles) {
    const inherited = getAllPermissions(inheritedRole);
    inherited.forEach((p) => allPermissions.add(p));
  }

  return Array.from(allPermissions);
}

/**
 * Check if a role can perform an operation
 */
export function canPerform(role: UserRole, permission: Permission): boolean {
  const permissions = getAllPermissions(role);
  return permissions.includes(permission);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.MASTERMIND]: 'Mastermind (Owner)',
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.CFO]: 'Chief Financial Officer',
    [UserRole.SALES_MANAGER]: 'Sales Manager',
    [UserRole.HR_MANAGER]: 'HR Manager',
    [UserRole.OPERATIONS_MANAGER]: 'Operations Manager',
    [UserRole.PROJECT_MANAGER]: 'Project Manager',
    [UserRole.ANALYST]: 'Analyst',
    [UserRole.MANAGER]: 'Manager',
    [UserRole.CUSTOMER]: 'Customer',
  };

  return names[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    [UserRole.MASTERMIND]: 'Full system access - System owner/CTO level',
    [UserRole.ADMIN]: 'System administration and user management',
    [UserRole.CFO]: 'Financial operations, accounting, and reporting',
    [UserRole.SALES_MANAGER]: 'Sales operations and customer relationships',
    [UserRole.HR_MANAGER]: 'Human resources and payroll management',
    [UserRole.OPERATIONS_MANAGER]: 'Inventory and logistics operations',
    [UserRole.PROJECT_MANAGER]: 'Project planning and resource management',
    [UserRole.ANALYST]: 'Data analysis and business intelligence',
    [UserRole.MANAGER]: 'General management and oversight',
    [UserRole.CUSTOMER]: 'End-user customer access',
  };

  return descriptions[role] || '';
}

/**
 * Validate if a user can be assigned a specific role
 * (prevents privilege escalation)
 */
export function canAssignRole(performerRole: UserRole, targetRole: UserRole): boolean {
  // Only MASTERMIND can assign any role
  if (performerRole === UserRole.MASTERMIND) {
    return true;
  }

  // ADMIN can assign roles except MASTERMIND
  if (performerRole === UserRole.ADMIN && targetRole !== UserRole.MASTERMIND) {
    return true;
  }

  // Others cannot assign roles
  return false;
}

/**
 * Get available roles for a specific role to assign
 */
export function getAssignableRoles(role: UserRole): UserRole[] {
  if (role === UserRole.MASTERMIND) {
    return Object.values(UserRole);
  }

  if (role === UserRole.ADMIN) {
    return Object.values(UserRole).filter((r) => r !== UserRole.MASTERMIND);
  }

  return [];
}

/**
 * Audit permission check (for logging)
 */
export interface PermissionCheckAudit {
  userId: string;
  userRole: UserRole;
  requiredPermission: Permission;
  allowed: boolean;
  timestamp: Date;
  context?: string;
}

/**
 * Get role-based API endpoints access
 */
export const roleEndpointAccess: Record<UserRole, string[]> = {
  [UserRole.MASTERMIND]: ['/*'], // All endpoints
  [UserRole.ADMIN]: [
    '/api/users/*',
    '/api/accounting/*',
    '/api/invoices/*',
    '/api/sales/*',
    '/api/inventory/*',
    '/api/projects/*',
    '/api/employees/*',
    '/api/reports/*',
    '/api/system/*',
  ],
  [UserRole.CFO]: [
    '/api/accounting/*',
    '/api/invoices/*',
    '/api/payments/*',
    '/api/reports/financial*',
  ],
  [UserRole.SALES_MANAGER]: [
    '/api/sales/*',
    '/api/leads/*',
    '/api/opportunities/*',
    '/api/invoices/*/send',
    '/api/reports/sales*',
  ],
  [UserRole.HR_MANAGER]: [
    '/api/employees/*',
    '/api/payroll/*',
    '/api/reports/hr*',
  ],
  [UserRole.OPERATIONS_MANAGER]: [
    '/api/inventory/*',
    '/api/sales/orders*',
    '/api/reports/operations*',
  ],
  [UserRole.PROJECT_MANAGER]: [
    '/api/projects/*',
    '/api/tasks/*',
    '/api/reports/projects*',
  ],
  [UserRole.ANALYST]: [
    '/api/reports/*',
    '/api/analytics/*',
  ],
  [UserRole.MANAGER]: [
    '/api/sales/read',
    '/api/reports/*/summary',
  ],
  [UserRole.CUSTOMER]: [
    '/api/account/*',
    '/api/orders/*',
  ],
};

export default {
  UserRole,
  Permission,
  rolePermissions,
  hasPermission,
  getAllPermissions,
  canPerform,
  getRoleDisplayName,
  getRoleDescription,
  canAssignRole,
  getAssignableRoles,
  roleEndpointAccess,
};
