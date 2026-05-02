import { Router } from 'express';
import {
  createSession,
  getSession,
  updateVibe,
  advance,
  endSession,
  listMySessions,
} from '../controllers/djController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/', authenticate as any, createSession as any);
router.get('/mine', authenticate as any, listMySessions as any);
router.get('/:code', optionalAuth as any, getSession as any);
router.post('/:code/vibe', authenticate as any, updateVibe as any);
router.post('/:code/advance', authenticate as any, advance as any);
router.post('/:code/end', authenticate as any, endSession as any);

export default router;
