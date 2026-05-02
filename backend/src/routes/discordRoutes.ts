import { Router, Request } from 'express';
import express from 'express';
import {
  discordInteractions,
  linkDiscordAccount,
  getDiscordIntegration,
  unlinkDiscordAccount,
} from '../controllers/discordController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Discord verifies our endpoint with Ed25519 over the raw bytes of the
// request body. Mount express.raw on this route so we can both verify the
// signature and re-parse the JSON afterwards. The route itself reconstructs
// the parsed body from the raw buffer so existing code can still read req.body.
router.post(
  '/interactions',
  express.raw({ type: '*/*', limit: '500kb' }),
  (req, _res, next) => {
    try {
      const buf = req.body as unknown as Buffer;
      const raw = Buffer.isBuffer(buf) ? buf.toString('utf8') : '';
      (req as Request & { rawBody?: string }).rawBody = raw;
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
    next();
  },
  discordInteractions as any,
);

// User-facing linking endpoints (JWT auth, called from /settings/discord).
router.post('/link', authenticate as any, linkDiscordAccount as any);
router.get('/me', authenticate as any, getDiscordIntegration as any);
router.delete('/me', authenticate as any, unlinkDiscordAccount as any);

export default router;
