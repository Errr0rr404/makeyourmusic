import { Router } from 'express';
import { getAnalytics, getSalesReport } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Get analytics dashboard data
router.get('/', getAnalytics);

// Get sales report (supports CSV export)
router.get('/sales', getSalesReport);

export default router;
