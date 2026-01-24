import express from 'express';
import * as adminController from '../controllers/adminController';
import { getAdminWishlist } from '../controllers/wishlistController';
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

// Products
router.get('/products', adminController.getAllProducts);
router.put('/products/:id/price', adminController.updateProductPrice);
router.delete('/products/:id', adminController.deleteProduct);

// Orders
router.get('/orders', adminController.getAllOrders);

// Users
router.get('/users', adminController.getAllUsers);

// Wishlist (aggregated view)
router.get('/wishlist', getAdminWishlist);

// Promotional Discount
router.put('/promotional-discount', adminController.updatePromotionalDiscount);

export default router;
