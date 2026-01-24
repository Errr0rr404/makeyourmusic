import express from 'express';
import * as approvalController from '../controllers/approvalController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All approval routes require authentication
router.use(authenticate);

// Approval chains
router.get('/chains', approvalController.getApprovalChains);
router.post('/chains', approvalController.createApprovalChain);

// Approval requests
router.post('/requests', approvalController.submitApprovalRequest);
router.get('/my-pending', approvalController.getMyPendingApprovals);
router.get('/pending', approvalController.getAllPendingApprovals);
router.get('/my-requests', approvalController.getMyRequests);
router.get('/stats', approvalController.getApprovalStats);

// Request actions
router.post('/requests/:id/approve', approvalController.approveRequest);
router.post('/requests/:id/reject', approvalController.rejectRequest);
router.post('/requests/:id/escalate', approvalController.escalateRequest);
router.get('/requests/:id/history', approvalController.getRequestHistory);

// Bulk actions
router.post('/bulk', approvalController.bulkAction);

export default router;
