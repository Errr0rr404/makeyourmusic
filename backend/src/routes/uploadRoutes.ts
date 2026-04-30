import { Router } from 'express';
import { upload, videoUpload, handleUpload, handleVideoUpload } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', authenticate as any, uploadLimiter, upload.single('file'), handleUpload as any);
router.post('/video', authenticate as any, uploadLimiter, videoUpload.single('file'), handleVideoUpload as any);

export default router;
