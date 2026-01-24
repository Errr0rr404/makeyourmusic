import express from 'express';
import * as auditController from '../controllers/auditController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All audit routes require authentication
router.use(authenticate);

// Log audit entries (batch)
router.post('/log', auditController.logAuditEntries);

// Get audit logs with filtering
router.get('/logs', auditController.getAuditLogs);

// Get audit statistics
router.get('/stats', auditController.getAuditStats);

// Export audit logs
router.get('/export', auditController.exportAuditLogs);

export default router;
