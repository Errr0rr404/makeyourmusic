import { Router } from 'express';
import {
  createClip,
  listClips,
  getClip,
  updateClip,
  deleteClip,
  incrementClipView,
  toggleClipLike,
  listClipComments,
  createClipComment,
  deleteClipComment,
  shareClip,
  getClipDownloadUrl,
} from '../controllers/clipController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { clipCreateLimiter, commentLimiter, socialPumpLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', optionalAuth as any, listClips as any);
router.post('/', authenticate as any, clipCreateLimiter, createClip as any);

router.get('/:id', optionalAuth as any, getClip as any);
router.patch('/:id', authenticate as any, updateClip as any);
router.delete('/:id', authenticate as any, deleteClip as any);

router.post('/:id/view', optionalAuth as any, socialPumpLimiter, incrementClipView as any);
router.post('/:id/likes', authenticate as any, socialPumpLimiter, toggleClipLike as any);

router.get('/:id/comments', optionalAuth as any, listClipComments as any);
router.post('/:id/comments', authenticate as any, commentLimiter, createClipComment as any);
router.delete('/comments/:id', authenticate as any, deleteClipComment as any);

router.post('/:id/shares', optionalAuth as any, socialPumpLimiter, shareClip as any);
router.get('/:id/download', optionalAuth as any, getClipDownloadUrl as any);

export default router;
