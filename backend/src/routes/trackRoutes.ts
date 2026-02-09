import { Router } from 'express';
import { createTrack, getTrack, listTracks, recordPlay, deleteTrack, getTrending } from '../controllers/trackController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { createTrackRules, paginationRules, validateRequest } from '../middleware/validation';

const router = Router();

router.get('/', paginationRules, validateRequest, listTracks as any);
router.get('/trending', getTrending as any);
router.get('/:idOrSlug', optionalAuth as any, getTrack as any);
router.post('/', authenticate as any, createTrackRules, validateRequest, createTrack as any);
router.post('/:trackId/play', optionalAuth as any, recordPlay as any);
router.delete('/:id', authenticate as any, deleteTrack as any);

export default router;
