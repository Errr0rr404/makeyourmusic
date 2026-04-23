import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateLyrics,
  startMusicGeneration,
  listGenerations,
  getGeneration,
  deleteGeneration,
  publishGeneration,
  createVariation,
  getUsage,
  startVideoGeneration,
  getVideoGeneration,
} from '../controllers/aiGenerationController';
import { playlistFromPrompt } from '../controllers/aiPlaylistController';
import { authenticate } from '../middleware/auth';

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
router.get('/generations', listGenerations as any);
router.get('/generations/:id', getGeneration as any);
router.delete('/generations/:id', deleteGeneration as any);
router.post('/generations/:id/publish', publishGeneration as any);
router.post('/generations/:id/variation', createVariation as any);

// Video
router.post('/video', startVideoGeneration as any);
router.get('/video/:id', getVideoGeneration as any);

// Vibe → Playlist
router.post('/playlist/from-prompt', playlistFromPrompt as any);

export default router;
