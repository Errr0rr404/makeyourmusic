import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', invoiceController.getInvoices);
router.post('/', invoiceController.createInvoice);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;