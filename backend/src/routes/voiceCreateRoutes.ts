import { Router } from 'express';
import multer from 'multer';
import { voiceCreate } from '../controllers/voiceCreateController';
import { authenticate } from '../middleware/auth';
import { singleUpload } from '../middleware/uploadMiddleware';
import { AUDIO_MIME_TYPES, createMimeFileFilter } from '../utils/fileValidation';

// 5MB cap mirrors the transcribe endpoint. Memory storage is fine — we
// forward the buffer to OpenAI and never persist locally.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 4,
    fieldSize: 16 * 1024,
    parts: 6,
  },
  fileFilter: createMimeFileFilter(AUDIO_MIME_TYPES),
});

const router = Router();

router.post('/', authenticate as any, singleUpload(upload, 'audio'), voiceCreate as any);

export default router;
