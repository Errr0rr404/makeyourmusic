import { Router } from 'express';
import { upload, handleUpload } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', authenticate as any, uploadLimiter, upload.single('file'), handleUpload as any);

export default router;
