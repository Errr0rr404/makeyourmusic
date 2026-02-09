import { Router } from 'express';
import { upload, handleUpload } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate as any, upload.single('file'), handleUpload as any);

export default router;
