import express from 'express';
import * as reportsController from '../controllers/reportsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Reports
router.post('/generate', reportsController.generateReport);
router.get('/', reportsController.getReports);
router.get('/:id', reportsController.getReport);

export default router;
