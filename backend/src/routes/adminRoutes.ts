import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Admin login (no auth required, but rate limited)
router.post('/login', authLimiter, adminController.adminLogin);

// All routes below require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', adminController.getDashboardStats);

// Users
router.get('/users', adminController.getAllUsers);

export default router;
