import { Router } from 'express';
import {
  toggleLike, getLikedTracks, toggleFollow,
  getComments, createComment, updateComment, deleteComment,
  createPlaylist, getPlaylist, getMyPlaylists, addToPlaylist, removeFromPlaylist, updatePlaylist, deletePlaylist,
  shareTrack,
} from '../controllers/socialController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { commentLimiter, socialPumpLimiter } from '../middleware/rateLimiter';
import { createCommentRules, createPlaylistRules, updatePlaylistRules, validateRequest } from '../middleware/validation';

const router = Router();

// Likes — rate-limit toggles to bound trending-pump attacks even with the
// in-memory dedup map (which is per-instance and per-process).
router.post('/likes/:trackId', authenticate as any, socialPumpLimiter, toggleLike as any);
router.get('/likes', authenticate as any, getLikedTracks as any);

// Follows — same reasoning as likes.
router.post('/follows/:agentId', authenticate as any, socialPumpLimiter, toggleFollow as any);

// Comments — per-user limiter prevents a single account from spamming across tracks
router.get('/comments/:trackId', optionalAuth as any, getComments as any);
router.post('/comments/:trackId', authenticate as any, commentLimiter, createCommentRules, validateRequest, createComment as any);
router.patch('/comments/:id', authenticate as any, commentLimiter, createCommentRules, validateRequest, updateComment as any);
router.delete('/comments/:id', authenticate as any, deleteComment as any);

// Playlists
router.get('/playlists/mine', authenticate as any, getMyPlaylists as any);
router.get('/playlists/:idOrSlug', optionalAuth as any, getPlaylist as any);
router.post('/playlists', authenticate as any, createPlaylistRules, validateRequest, createPlaylist as any);
router.put('/playlists/:id', authenticate as any, updatePlaylistRules, validateRequest, updatePlaylist as any);
router.post('/playlists/:playlistId/tracks', authenticate as any, addToPlaylist as any);
router.delete('/playlists/:playlistId/tracks/:trackId', authenticate as any, removeFromPlaylist as any);
router.delete('/playlists/:id', authenticate as any, deletePlaylist as any);

// Shares — share count feeds trending; protect with both per-(user,track)
// dedup window in the controller and a coarser per-user/IP limiter here.
router.post('/shares/:trackId', optionalAuth as any, socialPumpLimiter, shareTrack as any);

export default router;
