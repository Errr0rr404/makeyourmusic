import express from 'express';
import * as erpController from '../controllers/erpController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Accounting (read)
router.get('/accounting/chart-of-accounts', erpController.listChartOfAccounts);
router.get('/accounting/invoices', erpController.listInvoices);

// Protected - create/update operations
router.use(authenticate);

router.post('/accounting/chart-of-accounts', erpController.createChartOfAccount);
router.post('/accounting/invoices', erpController.createInvoice);

export default router;
