import express from 'express';
import { uploadImage, uploadImages, upload } from '../controllers/uploadController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Single image upload (admin only) with rate limiting
router.post(
  '/image',
  authenticate,
  requireAdmin,
  uploadLimiter,
  upload.single('image'),
  uploadImage
);

// Multiple images upload (admin only) with rate limiting
router.post(
  '/images',
  authenticate,
  requireAdmin,
  uploadLimiter,
  upload.array('images', 10), // Max 10 images
  uploadImages
);

export default router;
