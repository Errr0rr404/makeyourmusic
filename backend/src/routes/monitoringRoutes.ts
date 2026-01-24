import express from 'express';
import { authenticate, requireAdminOrMastermind } from '../middleware/auth';
import { getMonitoringMetrics, getSystemAlerts } from '../controllers/monitoringController';

const router = express.Router();

// Monitoring endpoints (Admin/Mastermind only)
router.get('/monitoring', authenticate, requireAdminOrMastermind, getMonitoringMetrics);
router.get('/monitoring/alerts', authenticate, requireAdminOrMastermind, getSystemAlerts);

export default router;
