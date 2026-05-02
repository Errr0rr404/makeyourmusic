import { Router } from 'express';
import {
  startTrackMusicVideo,
  getTrackMusicVideo,
} from '../controllers/musicVideoController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/:trackId', authenticate as any, startTrackMusicVideo as any);
router.get('/:trackId', optionalAuth as any, getTrackMusicVideo as any);

export default router;
