/**
 * Enterprise Approval Workflow Engine
 * Provides multi-level approval chains, delegation, and escalation
 */

import api from '@/lib/api';
import { auditLogger } from './auditLog';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'DELEGATED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ApprovalPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type ApprovalType =
  | 'EXPENSE'
  | 'PURCHASE_ORDER'
  | 'INVOICE'
  | 'BUDGET'
  | 'LEAVE_REQUEST'
  | 'TIMESHEET'
  | 'CONTRACT'
  | 'DOCUMENT'
  | 'PROJECT'
  | 'PRICE_CHANGE'
  | 'DISCOUNT'
  | 'REFUND'
  | 'CUSTOM';

export interface ApprovalStep {
  id: string;
  order: number;
  approverType: 'USER' | 'ROLE' | 'DEPARTMENT' | 'MANAGER' | 'CUSTOM';
  approverId?: string; // User ID if USER type
  approverRole?: string; // Role if ROLE type
  approverDepartment?: string; // Department if DEPARTMENT type
  minApprovers: number; // Minimum approvers needed (for parallel approvals)
  canDelegate: boolean;
  canEscalate: boolean;
  escalationHours?: number; // Auto-escalate after this many hours
  escalateTo?: string; // User/Role to escalate to
  conditions?: ApprovalCondition[]; // Conditional logic
}

export interface ApprovalCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in';
  value: unknown;
}

export interface ApprovalChain {
  id: string;
  name: string;
  description?: string;
  type: ApprovalType;
  isActive: boolean;
  steps: ApprovalStep[];
  conditions?: ApprovalCondition[]; // When to trigger this chain
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ApprovalRequest {
  id: string;
  chainId: string;
  chainName: string;
  type: ApprovalType;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  currentStep: number;
  totalSteps: number;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  resourceData: Record<string, unknown>;
  amount?: number;
  currency?: string;
  description: string;
  notes?: string;
  attachments?: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  history: ApprovalHistoryEntry[];
}

export interface ApprovalHistoryEntry {
  id: string;
  requestId: string;
  step: number;
  action: ApprovalStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  comments?: string;
  delegatedTo?: string;
  delegatedToName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PendingApproval {
  request: ApprovalRequest;
  step: ApprovalStep;
  canApprove: boolean;
  canReject: boolean;
  canDelegate: boolean;
  canEscalate: boolean;
  delegatedFrom?: {
    userId: string;
    userName: string;
    reason: string;
  };
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  averageApprovalTime: number; // in hours
  overdue: number;
  byType: Record<ApprovalType, number>;
  byPriority: Record<ApprovalPriority, number>;
}

// Approval Workflow Service
class ApprovalWorkflowService {
  // Create a new approval chain template
  async createChain(chain: Omit<ApprovalChain, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApprovalChain> {
    const response = await api.post('/erp/approvals/chains', chain);
    return response.data;
  }

  // Update an approval chain
  async updateChain(id: string, updates: Partial<ApprovalChain>): Promise<ApprovalChain> {
    const response = await api.put(`/erp/approvals/chains/${id}`, updates);
    return response.data;
  }

  // Get all approval chains
  async getChains(type?: ApprovalType): Promise<ApprovalChain[]> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/erp/approvals/chains${params}`);
    return response.data;
  }

  // Submit a new approval request
  async submitRequest(request: {
    chainId?: string; // If not provided, auto-select based on type and conditions
    type: ApprovalType;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    resourceData: Record<string, unknown>;
    amount?: number;
    currency?: string;
    description: string;
    notes?: string;
    attachments?: string[];
    priority?: ApprovalPriority;
    dueDate?: Date;
  }): Promise<ApprovalRequest> {
    const response = await api.post('/erp/approvals/requests', request);

    await auditLogger.log({
      userId: response.data.requesterId,
      action: 'SUBMIT',
      module: 'WORKFLOWS',
      severity: 'INFO',
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      resourceName: request.resourceName,
      description: `Submitted approval request: ${request.description}`,
      metadata: { chainId: request.chainId, type: request.type },
      success: true,
    });

    return response.data;
  }

  // Get pending approvals for current user
  async getMyPendingApprovals(): Promise<PendingApproval[]> {
    const response = await api.get('/erp/approvals/my-pending');
    return response.data;
  }

  // Get all pending approvals (admin/manager view)
  async getAllPendingApprovals(filter?: {
    type?: ApprovalType;
    priority?: ApprovalPriority;
    requesterId?: string;
    departmentId?: string;
  }): Promise<PendingApproval[]> {
    const params = new URLSearchParams();
    if (filter?.type) params.set('type', filter.type);
    if (filter?.priority) params.set('priority', filter.priority);
    if (filter?.requesterId) params.set('requesterId', filter.requesterId);
    if (filter?.departmentId) params.set('departmentId', filter.departmentId);

    const response = await api.get(`/erp/approvals/pending?${params.toString()}`);
    return response.data;
  }

  // Approve a request
  async approve(requestId: string, comments?: string, userId?: string): Promise<ApprovalRequest> {
    const response = await api.post(`/erp/approvals/requests/${requestId}/approve`, { comments });

    await auditLogger.logApproval(
      'WORKFLOWS',
      response.data.resourceType,
      response.data.resourceId,
      response.data.resourceName,
      userId || response.data.requesterId,
      true,
      comments
    );

    return response.data;
  }

  // Reject a request
  async reject(requestId: string, reason: string, userId?: string): Promise<ApprovalRequest> {
    const response = await api.post(`/erp/approvals/requests/${requestId}/reject`, { reason });

    await auditLogger.logApproval(
      'WORKFLOWS',
      response.data.resourceType,
      response.data.resourceId,
      response.data.resourceName,
      userId || response.data.requesterId,
      false,
      reason
    );

    return response.data;
  }

  // Delegate approval to another user
  async delegate(requestId: string, delegateToUserId: string, reason: string): Promise<ApprovalRequest> {
    const response = await api.post(`/erp/approvals/requests/${requestId}/delegate`, {
      delegateToUserId,
      reason,
    });
    return response.data;
  }

  // Escalate a request
  async escalate(requestId: string, reason: string): Promise<ApprovalRequest> {
    const response = await api.post(`/erp/approvals/requests/${requestId}/escalate`, { reason });
    return response.data;
  }

  // Cancel a request (by requester)
  async cancel(requestId: string, reason: string): Promise<ApprovalRequest> {
    const response = await api.post(`/erp/approvals/requests/${requestId}/cancel`, { reason });
    return response.data;
  }

  // Get request history
  async getRequestHistory(requestId: string): Promise<ApprovalHistoryEntry[]> {
    const response = await api.get(`/erp/approvals/requests/${requestId}/history`);
    return response.data;
  }

  // Get my submitted requests
  async getMyRequests(status?: ApprovalStatus): Promise<ApprovalRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/erp/approvals/my-requests${params}`);
    return response.data;
  }

  // Get approval statistics
  async getStats(startDate?: Date, endDate?: Date): Promise<ApprovalStats> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate.toISOString());
    if (endDate) params.set('endDate', endDate.toISOString());

    const response = await api.get(`/erp/approvals/stats?${params.toString()}`);
    return response.data;
  }

  // Bulk approve/reject
  async bulkAction(
    requestIds: string[],
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const response = await api.post('/erp/approvals/bulk', {
      requestIds,
      action,
      reason,
    });
    return response.data;
  }

  // Set out of office delegation
  async setOutOfOffice(
    delegateToUserId: string,
    startDate: Date,
    endDate: Date,
    reason?: string
  ): Promise<void> {
    await api.post('/erp/approvals/out-of-office', {
      delegateToUserId,
      startDate,
      endDate,
      reason,
    });
  }

  // Clear out of office
  async clearOutOfOffice(): Promise<void> {
    await api.delete('/erp/approvals/out-of-office');
  }
}

// Singleton instance
export const approvalWorkflow = new ApprovalWorkflowService();

// Pre-built approval chain templates
export const APPROVAL_CHAIN_TEMPLATES: Partial<ApprovalChain>[] = [
  {
    name: 'Expense Approval - Standard',
    description: 'Standard expense approval up to $5,000',
    type: 'EXPENSE',
    steps: [
      {
        id: '1',
        order: 1,
        approverType: 'MANAGER',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: true,
        escalationHours: 48,
      },
    ],
    conditions: [
      { field: 'amount', operator: 'lessThan', value: 5000 },
    ],
  },
  {
    name: 'Expense Approval - High Value',
    description: 'High-value expense approval over $5,000',
    type: 'EXPENSE',
    steps: [
      {
        id: '1',
        order: 1,
        approverType: 'MANAGER',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: true,
        escalationHours: 24,
      },
      {
        id: '2',
        order: 2,
        approverType: 'ROLE',
        approverRole: 'CFO',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: false,
      },
    ],
    conditions: [
      { field: 'amount', operator: 'greaterThan', value: 5000 },
    ],
  },
  {
    name: 'Purchase Order Approval',
    description: 'Standard purchase order approval',
    type: 'PURCHASE_ORDER',
    steps: [
      {
        id: '1',
        order: 1,
        approverType: 'ROLE',
        approverRole: 'OPERATIONS_MANAGER',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: true,
        escalationHours: 24,
      },
      {
        id: '2',
        order: 2,
        approverType: 'ROLE',
        approverRole: 'CFO',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: false,
        conditions: [
          { field: 'amount', operator: 'greaterThan', value: 10000 },
        ],
      },
    ],
  },
  {
    name: 'Leave Request Approval',
    description: 'Employee leave request approval',
    type: 'LEAVE_REQUEST',
    steps: [
      {
        id: '1',
        order: 1,
        approverType: 'MANAGER',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: true,
        escalationHours: 72,
      },
      {
        id: '2',
        order: 2,
        approverType: 'ROLE',
        approverRole: 'HR_MANAGER',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: false,
        conditions: [
          { field: 'days', operator: 'greaterThan', value: 5 },
        ],
      },
    ],
  },
  {
    name: 'Contract Approval',
    description: 'Legal contract approval workflow',
    type: 'CONTRACT',
    steps: [
      {
        id: '1',
        order: 1,
        approverType: 'ROLE',
        approverRole: 'SALES_MANAGER',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: true,
        escalationHours: 48,
      },
      {
        id: '2',
        order: 2,
        approverType: 'ROLE',
        approverRole: 'CFO',
        minApprovers: 1,
        canDelegate: true,
        canEscalate: true,
        escalationHours: 48,
      },
      {
        id: '3',
        order: 3,
        approverType: 'ROLE',
        approverRole: 'MASTERMIND',
        minApprovers: 1,
        canDelegate: false,
        canEscalate: false,
        conditions: [
          { field: 'amount', operator: 'greaterThan', value: 100000 },
        ],
      },
    ],
  },
];

// Helper to evaluate conditions
export function evaluateConditions(conditions: ApprovalCondition[], data: Record<string, unknown>): boolean {
  return conditions.every((condition) => {
    const fieldValue = data[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'notEquals':
        return fieldValue !== condition.value;
      case 'greaterThan':
        return typeof fieldValue === 'number' && fieldValue > (condition.value as number);
      case 'lessThan':
        return typeof fieldValue === 'number' && fieldValue < (condition.value as number);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value as string);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default:
        return false;
    }
  });
}
