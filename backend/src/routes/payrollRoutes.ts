import express from 'express';
import * as payrollController from '../controllers/payrollController';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../utils/storeConfig';

const router = express.Router();

// All routes require authentication and employee management feature
router.use(authenticate);
router.use(requireFeature('posEmployeeManagementEnabled'));

// Payroll settings
router.get('/settings', payrollController.getSettings);
router.put('/settings', payrollController.updateSettings);

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
