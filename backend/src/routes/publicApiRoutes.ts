import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireApiKey } from '../middleware/apiKeyAuth';
import {
  startMusicGeneration,
  getGeneration,
  generateLyrics,
} from '../controllers/aiGenerationController';
import { authenticate } from '../middleware/auth';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController';

const router = Router();

// Key-management endpoints use the same JWT auth as the dashboard. The
// /v1/* music endpoints below use API-key auth.
router.post('/keys', authenticate as any, createApiKey as any);
router.get('/keys', authenticate as any, listApiKeys as any);
router.delete('/keys/:id', authenticate as any, revokeApiKey as any);

// Public API surface (auth via Bearer mym_… key).
const v1 = Router();
v1.use(requireApiKey as any);

const v1Limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // bumped per-key via ApiKey.rateLimitPerMin in a later iteration
  standardHeaders: true,
  keyGenerator: (req: any) => req.apiKey?.id || req.ip,
});
v1.use(v1Limiter);

// Reuse the existing controllers — they read req.user.userId, which the
// API-key middleware populates synthetically. So a /v1/music call burns
// the same daily AI usage budget as a dashboard call.
v1.post('/music/generate', startMusicGeneration as any);
v1.get('/music/generations/:id', getGeneration as any);
v1.post('/lyrics', generateLyrics as any);

router.use('/', v1);

export default router;
