import { Router } from 'express';
import {
  createTrack,
  getTrack,
  listTracks,
  listMyTracks,
  updateTrackVisibility,
  updateTrackCover,
  recordPlay,
  recordDownload,
  getDownloadUrl,
  deleteTrack,
  getTrending,
  getHistory,
  getRecommendations,
  getSimilarTracks,
  reportTrack,
} from '../controllers/trackController';
import { setCollaborators, getCollaborators } from '../controllers/collabController';
import { requestDistribution, getDistribution } from '../controllers/distributionController';
import { karaokeLyrics } from '../controllers/karaokeController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { createTrackRules, paginationRules, validateRequest } from '../middleware/validation';
import { socialPumpLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', paginationRules, validateRequest, listTracks as any);
router.get('/trending', getTrending as any);
router.get('/mine', authenticate as any, paginationRules, validateRequest, listMyTracks as any);
router.get('/history', authenticate as any, getHistory as any);
router.get('/recommendations', authenticate as any, getRecommendations as any);
router.get('/:idOrSlug/similar', optionalAuth as any, getSimilarTracks as any);
router.get('/:idOrSlug', optionalAuth as any, getTrack as any);
router.post('/', authenticate as any, createTrackRules, validateRequest, createTrack as any);
// Play counter is hot — protect with the social pump limiter so the in-process
// dedup map can't be evaded by distributed/multi-tab pumping.
router.post('/:trackId/play', optionalAuth as any, socialPumpLimiter, recordPlay as any);
// Save-for-offline counter — auth required so we can attribute & dedup per user.
router.post('/:trackId/download', authenticate as any, socialPumpLimiter, recordDownload as any);
// Returns a Cloudinary URL with watermark applied (FREE tier) or clean
// (Premium / track owner). Frontend hits this instead of using
// track.audioUrl directly when the user explicitly downloads the file.
router.get('/:trackId/download-url', authenticate as any, getDownloadUrl as any);
router.patch('/:id/visibility', authenticate as any, updateTrackVisibility as any);
router.patch('/:id/cover', authenticate as any, updateTrackCover as any);
router.post('/:id/report', authenticate as any, reportTrack as any);
router.delete('/:id', authenticate as any, deleteTrack as any);

// Collaboration
router.put('/:trackId/collaborators', authenticate as any, setCollaborators as any);
router.get('/:trackId/collaborators', authenticate as any, getCollaborators as any);

// Distribution to Spotify/Apple via partner
router.post('/:trackId/distribution', authenticate as any, requestDistribution as any);
router.get('/:trackId/distribution', authenticate as any, getDistribution as any);

// Karaoke synced lyrics
router.get('/:trackId/karaoke', karaokeLyrics as any);

export default router;
