import { Router } from 'express';
import { upload, videoUpload, handleUpload, handleVideoUpload } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { singleUpload } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/', authenticate as any, uploadLimiter, singleUpload(upload, 'file'), handleUpload as any);
router.post('/video', authenticate as any, uploadLimiter, singleUpload(videoUpload, 'file'), handleVideoUpload as any);

export default router;
