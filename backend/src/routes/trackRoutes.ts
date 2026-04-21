import { Router } from 'express';
import {
  createTrack,
  getTrack,
  listTracks,
  listMyTracks,
  updateTrackVisibility,
  recordPlay,
  deleteTrack,
  getTrending,
  getHistory,
  getRecommendations,
  getSimilarTracks,
  reportTrack,
} from '../controllers/trackController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { createTrackRules, paginationRules, validateRequest } from '../middleware/validation';

const router = Router();

router.get('/', paginationRules, validateRequest, listTracks as any);
router.get('/trending', getTrending as any);
router.get('/mine', authenticate as any, paginationRules, validateRequest, listMyTracks as any);
router.get('/history', authenticate as any, getHistory as any);
router.get('/recommendations', authenticate as any, getRecommendations as any);
router.get('/:idOrSlug/similar', optionalAuth as any, getSimilarTracks as any);
router.get('/:idOrSlug', optionalAuth as any, getTrack as any);
router.post('/', authenticate as any, createTrackRules, validateRequest, createTrack as any);
router.post('/:trackId/play', optionalAuth as any, recordPlay as any);
router.patch('/:id/visibility', authenticate as any, updateTrackVisibility as any);
router.post('/:id/report', authenticate as any, reportTrack as any);
router.delete('/:id', authenticate as any, deleteTrack as any);

export default router;
