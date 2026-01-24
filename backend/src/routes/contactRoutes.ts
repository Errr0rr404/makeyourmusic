import express from 'express';
import * as contactController from '../controllers/contactController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Public contact form submission
router.post('/', contactController.submitContact);

// Admin routes for managing contact messages
router.use(authenticate);
router.use(requireAdmin);

router.get('/', contactController.getContactMessages);
router.get('/:id', contactController.getContactMessage);
router.post('/:id/respond', contactController.respondToMessage);
router.put('/:id/status', contactController.updateMessageStatus);
router.delete('/:id', contactController.deleteContactMessage);

export default router;
