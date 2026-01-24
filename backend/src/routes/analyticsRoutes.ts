import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard', analyticsController.getDashboardAnalytics);

export default router;