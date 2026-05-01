import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateLyrics,
  startMusicGeneration,
  startMusicCover,
  generateCoverArt,
  listGenerations,
  getGeneration,
  deleteGeneration,
  publishGeneration,
  createVariation,
  getUsage,
  startVideoGeneration,
  getVideoGeneration,
  regenerateSection,
  extendGeneration,
} from '../controllers/aiGenerationController';
import { playlistFromPrompt } from '../controllers/aiPlaylistController';
import { transcribeAudio } from '../controllers/transcribeController';
import multer from 'multer';
import { authenticate } from '../middleware/auth';

// Transcribe endpoint accepts at most 5MB. The shared `upload` instance is
// 50MB (sized for music uploads); reusing it here wastes bandwidth +
// memory on inputs the controller will then reject.
const transcribeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

// All AI routes require auth. Authenticate BEFORE rate-limiting so the limiter
// can key on the authenticated user id rather than always falling back to IP.
router.use(authenticate as any);

const aiBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'anon',
  message: { error: 'Too many AI requests. Slow down.' },
});
router.use(aiBurstLimiter);

// Lyrics (fast, synchronous)
router.post('/lyrics', generateLyrics as any);

// Usage
router.get('/usage', getUsage as any);

// Music
router.post('/music', startMusicGeneration as any);
router.post('/music/cover', startMusicCover as any);
router.get('/generations', listGenerations as any);
router.get('/generations/:id', getGeneration as any);
router.delete('/generations/:id', deleteGeneration as any);
router.post('/generations/:id/publish', publishGeneration as any);
router.post('/generations/:id/variation', createVariation as any);
router.post('/generations/:id/regenerate-section', regenerateSection as any);
router.post('/generations/:id/extend', extendGeneration as any);

// Cover art (image-01)
router.post('/cover-art', generateCoverArt as any);

// Video
router.post('/video', startVideoGeneration as any);
router.get('/video/:id', getVideoGeneration as any);

// Vibe → Playlist
router.post('/playlist/from-prompt', playlistFromPrompt as any);

// Voice → text (mobile "hold to speak a song idea" entrypoint)
router.post('/transcribe', transcribeUpload.single('audio'), transcribeAudio as any);

export default router;
