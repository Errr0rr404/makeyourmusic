import { Router } from 'express';
import {
  similarTracks,
  radio,
  madeForYou,
  trending,
} from '../controllers/recommendationsController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/similar/:trackId', optionalAuth as any, similarTracks as any);
router.get('/radio', optionalAuth as any, radio as any);
router.get('/for-you', authenticate as any, madeForYou as any);
router.get('/trending', optionalAuth as any, trending as any);

export default router;
