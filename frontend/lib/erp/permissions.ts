/**
 * ERP Role-Based Access Control Configuration
 * Defines which roles have access to which ERP modules
 */

export type ERPRole =
  | 'ADMIN'
  | 'MASTERMIND'
  | 'CFO'
  | 'HR_MANAGER'
  | 'SALES_MANAGER'
  | 'OPERATIONS_MANAGER'
  | 'PROJECT_MANAGER'
  | 'ANALYST';

export type ERPModule =
  | 'accounting'
  | 'crm'
  | 'hr'
  | 'projects'
  | 'inventory'
  | 'analytics'
  | 'ai-insights'
  | 'workflows'
  | 'documents';

export interface ModuleAccess {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canAdmin: boolean;
}

/**
 * Role-based access matrix for ERP modules
 */
export const ERP_ACCESS_MATRIX: Record<ERPRole, Record<ERPModule, ModuleAccess>> = {
  MASTERMIND: {
    accounting: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    crm: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    hr: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    projects: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    inventory: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    analytics: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    'ai-insights': { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    workflows: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    documents: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
  },
  ADMIN: {
    accounting: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    crm: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    hr: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    projects: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    inventory: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    analytics: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    'ai-insights': { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    workflows: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
    documents: { canRead: true, canWrite: true, canDelete: true, canAdmin: true },
  },
  CFO: {
    accounting: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
    crm: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    hr: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    projects: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    inventory: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    analytics: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    'ai-insights': { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    workflows: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    documents: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
  },
  HR_MANAGER: {
    accounting: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    crm: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    hr: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
    projects: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    inventory: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    analytics: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    'ai-insights': { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    workflows: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
    documents: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
  },
  SALES_MANAGER: {
    accounting: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    crm: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
    hr: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    projects: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    inventory: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    analytics: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    'ai-insights': { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    workflows: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
    documents: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
  },
  OPERATIONS_MANAGER: {
    accounting: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    crm: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    hr: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    projects: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
    inventory: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
    analytics: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    'ai-insights': { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    workflows: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
    documents: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
  },
  PROJECT_MANAGER: {
    accounting: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    crm: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    hr: { canRead: false, canWrite: false, canDelete: false, canAdmin: false },
    projects: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
    inventory: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    analytics: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    'ai-insights': { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    workflows: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
    documents: { canRead: true, canWrite: true, canDelete: true, canAdmin: false },
  },
  ANALYST: {
    accounting: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    crm: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    hr: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    projects: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    inventory: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    analytics: { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
    'ai-insights': { canRead: true, canWrite: true, canDelete: false, canAdmin: false },
    workflows: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
    documents: { canRead: true, canWrite: false, canDelete: false, canAdmin: false },
  },
};

/**
 * Check if a user role has access to an ERP module
 */
export function hasModuleAccess(role: string, module: ERPModule): boolean {
  const erpRole = role as ERPRole;
  if (!ERP_ACCESS_MATRIX[erpRole]) {
    return false;
  }
  return ERP_ACCESS_MATRIX[erpRole][module]?.canRead || false;
}

/**
 * Check if a user role can write to an ERP module
 */
export function canWriteModule(role: string, module: ERPModule): boolean {
  const erpRole = role as ERPRole;
  if (!ERP_ACCESS_MATRIX[erpRole]) {
    return false;
  }
  return ERP_ACCESS_MATRIX[erpRole][module]?.canWrite || false;
}

/**
 * Check if a user role can delete from an ERP module
 */
export function canDeleteModule(role: string, module: ERPModule): boolean {
  const erpRole = role as ERPRole;
  if (!ERP_ACCESS_MATRIX[erpRole]) {
    return false;
  }
  return ERP_ACCESS_MATRIX[erpRole][module]?.canDelete || false;
}

/**
 * Check if a user role can admin an ERP module
 */
export function canAdminModule(role: string, module: ERPModule): boolean {
  const erpRole = role as ERPRole;
  if (!ERP_ACCESS_MATRIX[erpRole]) {
    return false;
  }
  return ERP_ACCESS_MATRIX[erpRole][module]?.canAdmin || false;
}

/**
 * Get all modules a role has access to
 */
export function getAccessibleModules(role: string): ERPModule[] {
  const erpRole = role as ERPRole;
  if (!ERP_ACCESS_MATRIX[erpRole]) {
    return [];
  }

  return Object.keys(ERP_ACCESS_MATRIX[erpRole]).filter(
    (module) => ERP_ACCESS_MATRIX[erpRole][module as ERPModule].canRead
  ) as ERPModule[];
}

/**
 * Get module access details for a role
 */
export function getModuleAccess(role: string, module: ERPModule): ModuleAccess {
  const erpRole = role as ERPRole;
  if (!ERP_ACCESS_MATRIX[erpRole]) {
    return { canRead: false, canWrite: false, canDelete: false, canAdmin: false };
  }
  return ERP_ACCESS_MATRIX[erpRole][module] || { canRead: false, canWrite: false, canDelete: false, canAdmin: false };
}

/**
 * Check if user has any ERP access
 */
export function hasERPAccess(role: string): boolean {
  const erpRoles: ERPRole[] = [
    'ADMIN',
    'MASTERMIND',
    'CFO',
    'HR_MANAGER',
    'SALES_MANAGER',
    'OPERATIONS_MANAGER',
    'PROJECT_MANAGER',
    'ANALYST',
  ];
  return erpRoles.includes(role as ERPRole);
}

/**
 * Module metadata for UI display
 */
export const MODULE_METADATA: Record<ERPModule, {
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  accounting: {
    title: 'Accounting & Finance',
    description: 'Chart of Accounts, Invoices, Financial Reports, General Ledger',
    icon: 'DollarSign',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  crm: {
    title: 'CRM',
    description: 'Leads, Opportunities, Campaigns, Customer Management',
    icon: 'Users',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  hr: {
    title: 'Human Resources',
    description: 'Employees, Payroll, Leave Management, Performance Reviews',
    icon: 'Briefcase',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  projects: {
    title: 'Project Management',
    description: 'Projects, Tasks, Resources, Time Tracking, Milestones',
    icon: 'FolderTree',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  inventory: {
    title: 'Inventory & Supply Chain',
    description: 'Stock Management, Suppliers, Procurement, Warehouses',
    icon: 'Package',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  analytics: {
    title: 'Business Intelligence',
    description: 'Reports, Dashboards, KPIs, Data Visualization',
    icon: 'BarChart3',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  'ai-insights': {
    title: 'AI Insights',
    description: 'Predictive Analytics, Forecasting, AI Recommendations',
    icon: 'Sparkles',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  workflows: {
    title: 'Workflow Automation',
    description: 'Process Automation, Approvals, Business Rules',
    icon: 'Workflow',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  documents: {
    title: 'Document Management',
    description: 'Files, Contracts, Reports, Version Control',
    icon: 'FileText',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};
