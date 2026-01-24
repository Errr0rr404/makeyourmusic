import express from 'express';
import { healthCheck, readinessCheck, livenessCheck } from '../controllers/healthController';

const router = express.Router();

// Health check endpoints
router.get('/health', healthCheck);
router.get('/ready', readinessCheck);
router.get('/live', livenessCheck);

export default router;
