import express from 'express';
import { authenticate, requireAdminOrMastermind } from '../middleware/auth';
import { getSystemMetrics, getSystemHealth } from '../controllers/monitoringController';

const router = express.Router();

// Monitoring endpoints (Admin/Manager only)
router.get('/monitoring', authenticate, requireAdminOrMastermind, getSystemMetrics);
router.get('/monitoring/health', authenticate, requireAdminOrMastermind, getSystemHealth);

export default router;
