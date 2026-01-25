import express from 'express';
import * as erpController from '../controllers/erpController';
import { authenticate } from '../middleware/auth';
import leadRoutes from './leadRoutes';
import invoiceRoutes from './invoiceRoutes';
import productRoutes from './productRoutes';
import employeeRoutes from './employeeRoutes';
import analyticsRoutes from './analyticsRoutes';
import customFieldRoutes from './customFieldRoutes';
import approvalRoutes from './approvalRoutes'; // Import approval routes
import * as leadConversionController from '../controllers/leadConversionController';

const router = express.Router();

// Analytics
router.use('/analytics', analyticsRoutes);

// Accounting
router.get('/accounting/chart-of-accounts', erpController.listChartOfAccounts);
router.use('/accounting/invoices', invoiceRoutes);

// CRM
router.use('/crm/leads', leadRoutes);
router.post('/crm/leads/convert', leadConversionController.convertLead);


// Inventory
router.use('/inventory/products', productRoutes);

// HR
router.use('/hr/employees', employeeRoutes);

// Approvals
router.use('/approvals', approvalRoutes); // Mount approval routes

// Extensibility
router.use('/custom-fields', customFieldRoutes);

// Protected - create/update operations
router.use(authenticate);

router.post('/accounting/chart-of-accounts', erpController.createChartOfAccount);

export default router;
