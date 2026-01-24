import express from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/', notificationController.getNotifications);
router.get('/:id', notificationController.getNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Admin routes
router.use(requireAdmin);
router.get('/admin/all', notificationController.getAllNotifications);
router.post('/', notificationController.createNotification);

export default router;
