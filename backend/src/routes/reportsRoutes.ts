import express from 'express';
import * as reportsController from '../controllers/reportsController';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../utils/storeConfig';

const router = express.Router();

// All routes require authentication and employee management feature
router.use(authenticate);
router.use(requireFeature('posEmployeeManagementEnabled'));

// Reports
router.post('/generate', reportsController.generateReport);
router.get('/', reportsController.getReports);
router.get('/admin/overview', reportsController.getAdminOverview);
router.get('/:id', reportsController.getReport);

export default router;
