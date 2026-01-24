/**
 * Enterprise Report Builder
 * Dynamic report generation, scheduling, and export
 */

import api from '@/lib/api';
import { auditLogger } from './auditLog';

export type ReportType =
  | 'FINANCIAL'
  | 'SALES'
  | 'INVENTORY'
  | 'HR'
  | 'PROJECT'
  | 'CRM'
  | 'COMPLIANCE'
  | 'CUSTOM';

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'HTML';

export type ChartType = 'BAR' | 'LINE' | 'PIE' | 'DONUT' | 'AREA' | 'SCATTER' | 'TABLE' | 'KPI';

export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'MEDIAN';

export type DateRange =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'LAST_QUARTER'
  | 'THIS_YEAR'
  | 'LAST_YEAR'
  | 'CUSTOM';

export interface ReportColumn {
  id: string;
  field: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'CURRENCY' | 'PERCENTAGE';
  aggregation?: AggregationType;
  format?: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'between' | 'isNull' | 'isNotNull';
  value: unknown;
  value2?: unknown; // For 'between' operator
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportGroupBy {
  field: string;
  label: string;
  dateGranularity?: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
}

export interface ReportVisualization {
  id: string;
  type: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string[];
  colorBy?: string;
  showLegend?: boolean;
  showDataLabels?: boolean;
  stacked?: boolean;
  config?: Record<string, unknown>;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSource: string; // API endpoint or data source name
  columns: ReportColumn[];
  filters?: ReportFilter[];
  sort?: ReportSort[];
  groupBy?: ReportGroupBy[];
  visualizations?: ReportVisualization[];
  dateRange?: DateRange;
  customDateStart?: Date;
  customDateEnd?: Date;
  parameters?: Record<string, unknown>;
  isTemplate: boolean;
  isPublic: boolean;
  sharedWith?: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  schedule: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm
    timezone: string;
  };
  format: ReportFormat;
  recipients: Array<{
    type: 'USER' | 'EMAIL' | 'ROLE';
    value: string;
  }>;
  lastRun?: Date;
  nextRun: Date;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  errorMessage?: string;
  createdAt: Date;
  createdBy: string;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  reportName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  format: ReportFormat;
  parameters?: Record<string, unknown>;
  filters?: ReportFilter[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  recordCount?: number;
  fileUrl?: string;
  fileSize?: number;
  errorMessage?: string;
  createdBy: string;
}

export interface ReportData {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  metadata: {
    totalRecords: number;
    filteredRecords: number;
    executionTime: number;
    generatedAt: Date;
  };
}

// Report Builder Service
class ReportBuilderService {
  // Get available data sources
  async getDataSources(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: ReportType;
    availableColumns: ReportColumn[];
  }>> {
    const response = await api.get('/erp/reports/data-sources');
    return response.data;
  }

  // Create a new report
  async createReport(report: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportDefinition> {
    const response = await api.post('/erp/reports', report);
    return response.data;
  }

  // Update a report
  async updateReport(id: string, updates: Partial<ReportDefinition>): Promise<ReportDefinition> {
    const response = await api.put(`/erp/reports/${id}`, updates);
    return response.data;
  }

  // Delete a report
  async deleteReport(id: string): Promise<void> {
    await api.delete(`/erp/reports/${id}`);
  }

  // Get all reports
  async getReports(type?: ReportType): Promise<ReportDefinition[]> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/erp/reports${params}`);
    return response.data;
  }

  // Get report by ID
  async getReport(id: string): Promise<ReportDefinition> {
    const response = await api.get(`/erp/reports/${id}`);
    return response.data;
  }

  // Get report templates
  async getTemplates(type?: ReportType): Promise<ReportDefinition[]> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/erp/reports/templates${params}`);
    return response.data;
  }

  // Execute report and get data
  async executeReport(
    id: string,
    options?: {
      filters?: ReportFilter[];
      dateRange?: DateRange;
      customDateStart?: Date;
      customDateEnd?: Date;
      parameters?: Record<string, unknown>;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ReportData> {
    const response = await api.post(`/erp/reports/${id}/execute`, options);
    return response.data;
  }

  // Export report
  async exportReport(
    id: string,
    format: ReportFormat,
    options?: {
      filters?: ReportFilter[];
      dateRange?: DateRange;
      customDateStart?: Date;
      customDateEnd?: Date;
      parameters?: Record<string, unknown>;
    },
    userId?: string
  ): Promise<{ url: string; filename: string }> {
    const response = await api.post(`/erp/reports/${id}/export`, {
      format,
      ...options,
    });

    // Log export action
    if (userId) {
      await auditLogger.logExport(
        'ANALYTICS',
        'REPORT',
        userId,
        format,
        response.data.recordCount || 0
      );
    }

    return response.data;
  }

  // Schedule a report
  async scheduleReport(schedule: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun' | 'nextRun' | 'status'>): Promise<ScheduledReport> {
    const response = await api.post('/erp/reports/schedules', schedule);
    return response.data;
  }

  // Update schedule
  async updateSchedule(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const response = await api.put(`/erp/reports/schedules/${id}`, updates);
    return response.data;
  }

  // Delete schedule
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/erp/reports/schedules/${id}`);
  }

  // Get scheduled reports
  async getSchedules(): Promise<ScheduledReport[]> {
    const response = await api.get('/erp/reports/schedules');
    return response.data;
  }

  // Pause/Resume schedule
  async toggleSchedule(id: string, active: boolean): Promise<ScheduledReport> {
    const response = await api.post(`/erp/reports/schedules/${id}/${active ? 'resume' : 'pause'}`);
    return response.data;
  }

  // Run scheduled report immediately
  async runScheduleNow(id: string): Promise<ReportExecution> {
    const response = await api.post(`/erp/reports/schedules/${id}/run`);
    return response.data;
  }

  // Get execution history
  async getExecutionHistory(reportId?: string, limit = 50): Promise<ReportExecution[]> {
    const params = new URLSearchParams();
    if (reportId) params.set('reportId', reportId);
    params.set('limit', String(limit));

    const response = await api.get(`/erp/reports/executions?${params.toString()}`);
    return response.data;
  }

  // Share report
  async shareReport(id: string, userIds: string[]): Promise<void> {
    await api.post(`/erp/reports/${id}/share`, { userIds });
  }

  // Clone report
  async cloneReport(id: string, newName: string): Promise<ReportDefinition> {
    const response = await api.post(`/erp/reports/${id}/clone`, { name: newName });
    return response.data;
  }
}

// Singleton instance
export const reportBuilder = new ReportBuilderService();

// Pre-built report templates
export const REPORT_TEMPLATES: Partial<ReportDefinition>[] = [
  // Financial Reports
  {
    name: 'Profit & Loss Statement',
    description: 'Income statement showing revenues, expenses, and net income',
    type: 'FINANCIAL',
    dataSource: 'journal_entries',
    columns: [
      { id: '1', field: 'accountName', label: 'Account', type: 'STRING', sortable: true },
      { id: '2', field: 'accountType', label: 'Type', type: 'STRING', filterable: true },
      { id: '3', field: 'debit', label: 'Debit', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '4', field: 'credit', label: 'Credit', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '5', field: 'balance', label: 'Balance', type: 'CURRENCY' },
    ],
    groupBy: [{ field: 'accountType', label: 'Account Type' }],
    isTemplate: true,
  },
  {
    name: 'Balance Sheet',
    description: 'Snapshot of assets, liabilities, and equity',
    type: 'FINANCIAL',
    dataSource: 'chart_of_accounts',
    columns: [
      { id: '1', field: 'accountNumber', label: 'Account #', type: 'STRING' },
      { id: '2', field: 'accountName', label: 'Account Name', type: 'STRING' },
      { id: '3', field: 'accountType', label: 'Type', type: 'STRING' },
      { id: '4', field: 'balance', label: 'Balance', type: 'CURRENCY', aggregation: 'SUM' },
    ],
    isTemplate: true,
  },
  {
    name: 'Cash Flow Statement',
    description: 'Analysis of cash inflows and outflows',
    type: 'FINANCIAL',
    dataSource: 'payments',
    columns: [
      { id: '1', field: 'date', label: 'Date', type: 'DATE' },
      { id: '2', field: 'description', label: 'Description', type: 'STRING' },
      { id: '3', field: 'category', label: 'Category', type: 'STRING' },
      { id: '4', field: 'inflow', label: 'Inflow', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '5', field: 'outflow', label: 'Outflow', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '6', field: 'balance', label: 'Running Balance', type: 'CURRENCY' },
    ],
    groupBy: [{ field: 'date', label: 'Date', dateGranularity: 'MONTH' }],
    isTemplate: true,
  },

  // Sales Reports
  {
    name: 'Sales by Product',
    description: 'Revenue breakdown by product',
    type: 'SALES',
    dataSource: 'order_items',
    columns: [
      { id: '1', field: 'productName', label: 'Product', type: 'STRING', sortable: true },
      { id: '2', field: 'category', label: 'Category', type: 'STRING', filterable: true },
      { id: '3', field: 'quantity', label: 'Units Sold', type: 'NUMBER', aggregation: 'SUM' },
      { id: '4', field: 'revenue', label: 'Revenue', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '5', field: 'avgPrice', label: 'Avg Price', type: 'CURRENCY', aggregation: 'AVG' },
    ],
    visualizations: [
      { id: '1', type: 'BAR', title: 'Revenue by Product', xAxis: 'productName', yAxis: ['revenue'] },
      { id: '2', type: 'PIE', title: 'Sales Distribution', xAxis: 'category', yAxis: ['revenue'] },
    ],
    isTemplate: true,
  },
  {
    name: 'Sales by Region',
    description: 'Geographic sales analysis',
    type: 'SALES',
    dataSource: 'orders',
    columns: [
      { id: '1', field: 'region', label: 'Region', type: 'STRING' },
      { id: '2', field: 'orderCount', label: 'Orders', type: 'NUMBER', aggregation: 'COUNT' },
      { id: '3', field: 'revenue', label: 'Revenue', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '4', field: 'avgOrderValue', label: 'Avg Order Value', type: 'CURRENCY', aggregation: 'AVG' },
    ],
    groupBy: [{ field: 'region', label: 'Region' }],
    isTemplate: true,
  },
  {
    name: 'Sales Pipeline',
    description: 'Opportunity funnel analysis',
    type: 'CRM',
    dataSource: 'opportunities',
    columns: [
      { id: '1', field: 'stage', label: 'Stage', type: 'STRING' },
      { id: '2', field: 'count', label: 'Count', type: 'NUMBER', aggregation: 'COUNT' },
      { id: '3', field: 'value', label: 'Value', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '4', field: 'avgProbability', label: 'Avg Win Rate', type: 'PERCENTAGE', aggregation: 'AVG' },
      { id: '5', field: 'weightedValue', label: 'Weighted Value', type: 'CURRENCY', aggregation: 'SUM' },
    ],
    visualizations: [
      { id: '1', type: 'BAR', title: 'Pipeline by Stage', xAxis: 'stage', yAxis: ['value'], stacked: false },
    ],
    isTemplate: true,
  },

  // HR Reports
  {
    name: 'Employee Headcount',
    description: 'Current employee count by department',
    type: 'HR',
    dataSource: 'employees',
    columns: [
      { id: '1', field: 'department', label: 'Department', type: 'STRING' },
      { id: '2', field: 'count', label: 'Headcount', type: 'NUMBER', aggregation: 'COUNT' },
      { id: '3', field: 'avgTenure', label: 'Avg Tenure (months)', type: 'NUMBER', aggregation: 'AVG' },
      { id: '4', field: 'turnoverRate', label: 'Turnover Rate', type: 'PERCENTAGE' },
    ],
    visualizations: [
      { id: '1', type: 'DONUT', title: 'Headcount by Department', xAxis: 'department', yAxis: ['count'] },
    ],
    isTemplate: true,
  },
  {
    name: 'Payroll Summary',
    description: 'Payroll costs by department and category',
    type: 'HR',
    dataSource: 'payroll',
    columns: [
      { id: '1', field: 'period', label: 'Period', type: 'DATE' },
      { id: '2', field: 'department', label: 'Department', type: 'STRING' },
      { id: '3', field: 'baseSalary', label: 'Base Salary', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '4', field: 'overtime', label: 'Overtime', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '5', field: 'benefits', label: 'Benefits', type: 'CURRENCY', aggregation: 'SUM' },
      { id: '6', field: 'total', label: 'Total', type: 'CURRENCY', aggregation: 'SUM' },
    ],
    groupBy: [{ field: 'period', label: 'Period', dateGranularity: 'MONTH' }],
    isTemplate: true,
  },

  // Inventory Reports
  {
    name: 'Inventory Valuation',
    description: 'Current stock value by location',
    type: 'INVENTORY',
    dataSource: 'inventory',
    columns: [
      { id: '1', field: 'sku', label: 'SKU', type: 'STRING' },
      { id: '2', field: 'productName', label: 'Product', type: 'STRING' },
      { id: '3', field: 'location', label: 'Location', type: 'STRING' },
      { id: '4', field: 'quantity', label: 'Qty', type: 'NUMBER', aggregation: 'SUM' },
      { id: '5', field: 'unitCost', label: 'Unit Cost', type: 'CURRENCY' },
      { id: '6', field: 'totalValue', label: 'Total Value', type: 'CURRENCY', aggregation: 'SUM' },
    ],
    isTemplate: true,
  },
  {
    name: 'Low Stock Alert',
    description: 'Products below reorder point',
    type: 'INVENTORY',
    dataSource: 'inventory',
    columns: [
      { id: '1', field: 'sku', label: 'SKU', type: 'STRING' },
      { id: '2', field: 'productName', label: 'Product', type: 'STRING' },
      { id: '3', field: 'currentStock', label: 'Current Stock', type: 'NUMBER' },
      { id: '4', field: 'reorderPoint', label: 'Reorder Point', type: 'NUMBER' },
      { id: '5', field: 'suggestedOrder', label: 'Suggested Order', type: 'NUMBER' },
    ],
    filters: [
      { field: 'currentStock', operator: 'lt', value: { $ref: 'reorderPoint' } },
    ],
    isTemplate: true,
  },

  // Project Reports
  {
    name: 'Project Status Overview',
    description: 'Current status of all projects',
    type: 'PROJECT',
    dataSource: 'projects',
    columns: [
      { id: '1', field: 'name', label: 'Project', type: 'STRING' },
      { id: '2', field: 'status', label: 'Status', type: 'STRING' },
      { id: '3', field: 'progress', label: 'Progress', type: 'PERCENTAGE' },
      { id: '4', field: 'budget', label: 'Budget', type: 'CURRENCY' },
      { id: '5', field: 'spent', label: 'Spent', type: 'CURRENCY' },
      { id: '6', field: 'variance', label: 'Variance', type: 'CURRENCY' },
      { id: '7', field: 'dueDate', label: 'Due Date', type: 'DATE' },
    ],
    visualizations: [
      { id: '1', type: 'BAR', title: 'Budget vs Spent', xAxis: 'name', yAxis: ['budget', 'spent'] },
    ],
    isTemplate: true,
  },

  // Compliance Reports
  {
    name: 'Audit Trail',
    description: 'System activity log for compliance',
    type: 'COMPLIANCE',
    dataSource: 'audit_logs',
    columns: [
      { id: '1', field: 'timestamp', label: 'Time', type: 'DATE' },
      { id: '2', field: 'userName', label: 'User', type: 'STRING' },
      { id: '3', field: 'action', label: 'Action', type: 'STRING' },
      { id: '4', field: 'module', label: 'Module', type: 'STRING' },
      { id: '5', field: 'resourceType', label: 'Resource', type: 'STRING' },
      { id: '6', field: 'description', label: 'Description', type: 'STRING' },
      { id: '7', field: 'ipAddress', label: 'IP Address', type: 'STRING' },
    ],
    isTemplate: true,
  },
];

// Helper to calculate date range
export function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'TODAY':
      return { start: today, end: now };
    case 'YESTERDAY':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    case 'THIS_WEEK':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: now };
    case 'LAST_WEEK':
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    case 'THIS_MONTH':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'LAST_MONTH':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case 'THIS_QUARTER':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { start: quarterStart, end: now };
    case 'LAST_QUARTER':
      const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), lastQuarterEnd.getMonth() - 2, 1);
      return { start: lastQuarterStart, end: lastQuarterEnd };
    case 'THIS_YEAR':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'LAST_YEAR':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31),
      };
    case 'CUSTOM':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      return { start: today, end: now };
    default:
      return { start: today, end: now };
  }
}
