import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma as _prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { logAuditEvent } from './auditController';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'DELEGATED' | 'CANCELLED' | 'EXPIRED';
type ApprovalPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type ApprovalType =
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

interface ApprovalStep {
  id: string;
  order: number;
  approverType: 'USER' | 'ROLE' | 'DEPARTMENT' | 'MANAGER' | 'CUSTOM';
  approverId?: string;
  approverRole?: string;
  minApprovers: number;
  canDelegate: boolean;
  canEscalate: boolean;
  escalationHours?: number;
}

interface ApprovalChain {
  id: string;
  name: string;
  description?: string;
  type: ApprovalType;
  isActive: boolean;
  steps: ApprovalStep[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface ApprovalRequest {
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

interface ApprovalHistoryEntry {
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
}

// In-memory stores (in production, use database)
const approvalChains: ApprovalChain[] = [];
const approvalRequests: ApprovalRequest[] = [];

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all approval chains
export const getApprovalChains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;

    let chains = [...approvalChains];
    if (type) {
      chains = chains.filter((c) => c.type === type);
    }

    res.json(chains);
  } catch (error) {
    next(error);
  }
};

// Create approval chain
export const createApprovalChain = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (!['ADMIN', 'MASTERMIND'].includes(req.user?.role || '')) {
      throw new AppError('Only admins can create approval chains', 403);
    }

    const { name, description, type, steps } = req.body;

    if (!name || !type || !steps || !Array.isArray(steps)) {
      throw new AppError('Name, type, and steps are required', 400);
    }

    const chain: ApprovalChain = {
      id: generateId('chain'),
      name,
      description,
      type,
      isActive: true,
      steps: steps.map((step: Partial<ApprovalStep>, index: number) => ({
        id: generateId('step'),
        order: index + 1,
        approverType: step.approverType || 'ROLE',
        approverId: step.approverId,
        approverRole: step.approverRole,
        minApprovers: step.minApprovers || 1,
        canDelegate: step.canDelegate ?? true,
        canEscalate: step.canEscalate ?? true,
        escalationHours: step.escalationHours,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user?.userId || 'system',
    };

    approvalChains.push(chain);

    logAuditEvent({
      userId: req.user?.userId || 'system',
      action: 'CREATE',
      module: 'WORKFLOWS',
      severity: 'INFO',
      resourceType: 'APPROVAL_CHAIN',
      resourceId: chain.id,
      resourceName: chain.name,
      description: `Created approval chain: ${chain.name}`,
      success: true,
    });

    res.status(201).json(chain);
  } catch (error) {
    next(error);
  }
};

// Submit approval request
export const submitApprovalRequest = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const {
      chainId,
      type,
      resourceType,
      resourceId,
      resourceName,
      resourceData,
      amount,
      currency,
      description,
      notes,
      attachments,
      priority = 'NORMAL',
      dueDate,
    } = req.body;

    if (!type || !resourceType || !resourceId || !resourceName || !description) {
      throw new AppError('Type, resourceType, resourceId, resourceName, and description are required', 400);
    }

    // Find or auto-select approval chain
    let chain = chainId ? approvalChains.find((c) => c.id === chainId) : null;
    if (!chain) {
      chain = approvalChains.find((c) => c.type === type && c.isActive);
    }

    // If no chain exists, create a simple default one
    if (!chain) {
      chain = {
        id: generateId('chain'),
        name: `Default ${type} Approval`,
        type,
        isActive: true,
        steps: [
          {
            id: generateId('step'),
            order: 1,
            approverType: 'ROLE',
            approverRole: 'ADMIN',
            minApprovers: 1,
            canDelegate: true,
            canEscalate: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };
      approvalChains.push(chain);
    }

    const request: ApprovalRequest = {
      id: generateId('req'),
      chainId: chain.id,
      chainName: chain.name,
      type,
      status: 'PENDING',
      priority,
      currentStep: 1,
      totalSteps: chain.steps.length,
      requesterId: req.user?.userId || 'anonymous',
      requesterName: req.user?.email || 'Anonymous',
      requesterEmail: req.user?.email || '',
      resourceType,
      resourceId,
      resourceName,
      resourceData: resourceData || {},
      amount,
      currency,
      description,
      notes,
      attachments,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [],
    };

    approvalRequests.push(request);

    logAuditEvent({
      userId: req.user?.userId || 'system',
      action: 'SUBMIT',
      module: 'WORKFLOWS',
      severity: 'INFO',
      resourceType: 'APPROVAL_REQUEST',
      resourceId: request.id,
      resourceName: request.resourceName,
      description: `Submitted approval request: ${description}`,
      metadata: { type, amount, priority },
      success: true,
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

// Get pending approvals for current user
export const getMyPendingApprovals = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    // Filter requests where user can approve current step
    const pending = approvalRequests
      .filter((r) => r.status === 'PENDING')
      .filter((r) => {
        const chain = approvalChains.find((c) => c.id === r.chainId);
        if (!chain) return false;

        const currentStepConfig = chain.steps.find((s) => s.order === r.currentStep);
        if (!currentStepConfig) return false;

        // Check if user matches step requirements
        if (currentStepConfig.approverType === 'USER' && currentStepConfig.approverId === userId) return true;
        if (currentStepConfig.approverType === 'ROLE' && currentStepConfig.approverRole === userRole) return true;
        if (['ADMIN', 'MASTERMIND'].includes(userRole || '')) return true; // Admins can approve anything

        return false;
      })
      .map((request) => {
        const chain = approvalChains.find((c) => c.id === request.chainId);
        const step = chain?.steps.find((s) => s.order === request.currentStep);

        return {
          request,
          step,
          canApprove: true,
          canReject: true,
          canDelegate: step?.canDelegate ?? true,
          canEscalate: step?.canEscalate ?? true,
        };
      });

    res.json(pending);
  } catch (error) {
    next(error);
  }
};

// Get all pending approvals (admin view)
export const getAllPendingApprovals = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (!['ADMIN', 'MASTERMIND', 'CFO', 'HR_MANAGER', 'OPERATIONS_MANAGER'].includes(req.user?.role || '')) {
      throw new AppError('Unauthorized', 403);
    }

    const { type, priority, requesterId, departmentId: _departmentId } = req.query;

    let pending = approvalRequests.filter((r) => r.status === 'PENDING');

    if (type) pending = pending.filter((r) => r.type === type);
    if (priority) pending = pending.filter((r) => r.priority === priority);
    if (requesterId) pending = pending.filter((r) => r.requesterId === requesterId);

    const result = pending.map((request) => {
      const chain = approvalChains.find((c) => c.id === request.chainId);
      const step = chain?.steps.find((s) => s.order === request.currentStep);

      return {
        request,
        step,
        canApprove: true,
        canReject: true,
        canDelegate: step?.canDelegate ?? true,
        canEscalate: step?.canEscalate ?? true,
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Approve request
export const approveRequest = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const request = approvalRequests.find((r) => r.id === id);
    if (!request) {
      throw new AppError('Approval request not found', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Request is not pending', 400);
    }

    // Add history entry
    request.history.push({
      id: generateId('hist'),
      requestId: request.id,
      step: request.currentStep,
      action: 'APPROVED',
      actorId: req.user?.userId || 'system',
      actorName: req.user?.email || 'System',
      actorRole: req.user?.role || 'SYSTEM',
      comments,
      timestamp: new Date(),
    });

    // Move to next step or complete
    if (request.currentStep >= request.totalSteps) {
      request.status = 'APPROVED';
      request.completedAt = new Date();
    } else {
      request.currentStep++;
    }

    request.updatedAt = new Date();

    logAuditEvent({
      userId: req.user?.userId || 'system',
      action: 'APPROVE',
      module: 'WORKFLOWS',
      severity: 'INFO',
      resourceType: 'APPROVAL_REQUEST',
      resourceId: request.id,
      resourceName: request.resourceName,
      description: `Approved: ${request.description}`,
      metadata: { step: request.currentStep - 1, comments },
      success: true,
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

// Reject request
export const rejectRequest = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const request = approvalRequests.find((r) => r.id === id);
    if (!request) {
      throw new AppError('Approval request not found', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Request is not pending', 400);
    }

    request.history.push({
      id: generateId('hist'),
      requestId: request.id,
      step: request.currentStep,
      action: 'REJECTED',
      actorId: req.user?.userId || 'system',
      actorName: req.user?.email || 'System',
      actorRole: req.user?.role || 'SYSTEM',
      comments: reason,
      timestamp: new Date(),
    });

    request.status = 'REJECTED';
    request.completedAt = new Date();
    request.updatedAt = new Date();

    logAuditEvent({
      userId: req.user?.userId || 'system',
      action: 'REJECT',
      module: 'WORKFLOWS',
      severity: 'WARNING',
      resourceType: 'APPROVAL_REQUEST',
      resourceId: request.id,
      resourceName: request.resourceName,
      description: `Rejected: ${request.description}`,
      metadata: { reason },
      success: true,
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

// Escalate request
export const escalateRequest = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = approvalRequests.find((r) => r.id === id);
    if (!request) {
      throw new AppError('Approval request not found', 404);
    }

    request.history.push({
      id: generateId('hist'),
      requestId: request.id,
      step: request.currentStep,
      action: 'ESCALATED',
      actorId: req.user?.userId || 'system',
      actorName: req.user?.email || 'System',
      actorRole: req.user?.role || 'SYSTEM',
      comments: reason,
      timestamp: new Date(),
    });

    request.status = 'ESCALATED';
    request.priority = 'URGENT';
    request.updatedAt = new Date();

    logAuditEvent({
      userId: req.user?.userId || 'system',
      action: 'SUBMIT',
      module: 'WORKFLOWS',
      severity: 'WARNING',
      resourceType: 'APPROVAL_REQUEST',
      resourceId: request.id,
      resourceName: request.resourceName,
      description: `Escalated: ${request.description}`,
      metadata: { reason },
      success: true,
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

// Get my submitted requests
export const getMyRequests = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const userId = req.user?.userId;

    let requests = approvalRequests.filter((r) => r.requesterId === userId);

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    res.json(requests);
  } catch (error) {
    next(error);
  }
};

// Get request history
export const getRequestHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const request = approvalRequests.find((r) => r.id === id);
    if (!request) {
      throw new AppError('Approval request not found', 404);
    }

    res.json(request.history);
  } catch (error) {
    next(error);
  }
};

// Get approval statistics
export const getApprovalStats = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    let requests = [...approvalRequests];

    if (startDate) {
      const start = new Date(startDate as string);
      requests = requests.filter((r) => r.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      requests = requests.filter((r) => r.createdAt <= end);
    }

    const stats = {
      pending: requests.filter((r) => r.status === 'PENDING').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
      escalated: requests.filter((r) => r.status === 'ESCALATED').length,
      overdue: requests.filter((r) => r.status === 'PENDING' && r.dueDate && new Date(r.dueDate) < new Date()).length,
      averageApprovalTime: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    // Calculate averages and groupings
    const completedRequests = requests.filter((r) => r.completedAt);
    if (completedRequests.length > 0) {
      const totalTime = completedRequests.reduce((sum, r) => {
        return sum + (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime());
      }, 0);
      stats.averageApprovalTime = totalTime / completedRequests.length / (1000 * 60 * 60); // in hours
    }

    requests.forEach((r) => {
      stats.byType[r.type] = (stats.byType[r.type] || 0) + 1;
      stats.byPriority[r.priority] = (stats.byPriority[r.priority] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Bulk approve/reject
export const bulkAction = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { requestIds, action, reason } = req.body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      throw new AppError('Request IDs array is required', 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Action must be approve or reject', 400);
    }

    if (action === 'reject' && !reason) {
      throw new AppError('Reason is required for rejection', 400);
    }

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of requestIds) {
      const request = approvalRequests.find((r) => r.id === id);

      if (!request) {
        failed.push({ id, error: 'Not found' });
        continue;
      }

      if (request.status !== 'PENDING') {
        failed.push({ id, error: 'Not pending' });
        continue;
      }

      request.history.push({
        id: generateId('hist'),
        requestId: request.id,
        step: request.currentStep,
        action: action === 'approve' ? 'APPROVED' : 'REJECTED',
        actorId: req.user?.userId || 'system',
        actorName: req.user?.email || 'System',
        actorRole: req.user?.role || 'SYSTEM',
        comments: reason,
        timestamp: new Date(),
      });

      if (action === 'approve' && request.currentStep < request.totalSteps) {
        request.currentStep++;
      } else {
        request.status = action === 'approve' ? 'APPROVED' : 'REJECTED';
        request.completedAt = new Date();
      }

      request.updatedAt = new Date();
      success.push(id);
    }

    logAuditEvent({
      userId: req.user?.userId || 'system',
      action: 'BULK_ACTION',
      module: 'WORKFLOWS',
      severity: 'INFO',
      resourceType: 'APPROVAL_REQUEST',
      description: `Bulk ${action}: ${success.length} succeeded, ${failed.length} failed`,
      metadata: { action, successCount: success.length, failedCount: failed.length },
      success: true,
    });

    res.json({ success, failed });
  } catch (error) {
    next(error);
  }
};
