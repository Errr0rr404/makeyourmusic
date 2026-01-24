import express from 'express';
import * as payrollController from '../controllers/payrollController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Pay periods
router.post('/pay-periods', payrollController.createPayPeriod);
router.get('/pay-periods', payrollController.getPayPeriods);

// Payroll generation and management
router.post('/generate', payrollController.generatePayrolls);
router.get('/preview', payrollController.previewPayroll);
router.get('/', payrollController.getPayrolls);
router.get('/:id', payrollController.getPayroll);
router.put('/:id', payrollController.updatePayroll);

export default router;
