import { Router } from 'express';
import multer from 'multer';
import { voiceCreate } from '../controllers/voiceCreateController';
import { authenticate } from '../middleware/auth';

// 5MB cap mirrors the transcribe endpoint. Memory storage is fine — we
// forward the buffer to OpenAI and never persist locally.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.post('/', authenticate as any, upload.single('audio'), voiceCreate as any);

export default router;
