import { Router } from 'express';
import {
  toggleLike, getLikedTracks, toggleFollow,
  getComments, createComment, updateComment, deleteComment,
  createPlaylist, getPlaylist, getMyPlaylists, addToPlaylist, removeFromPlaylist, updatePlaylist, deletePlaylist,
  shareTrack,
} from '../controllers/socialController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { commentLimiter } from '../middleware/rateLimiter';
import { createCommentRules, createPlaylistRules, validateRequest } from '../middleware/validation';

const router = Router();

// Likes
router.post('/likes/:trackId', authenticate as any, toggleLike as any);
router.get('/likes', authenticate as any, getLikedTracks as any);

// Follows
router.post('/follows/:agentId', authenticate as any, toggleFollow as any);

// Comments — per-user limiter prevents a single account from spamming across tracks
router.get('/comments/:trackId', getComments as any);
router.post('/comments/:trackId', authenticate as any, commentLimiter, createCommentRules, validateRequest, createComment as any);
router.patch('/comments/:id', authenticate as any, commentLimiter, createCommentRules, validateRequest, updateComment as any);
router.delete('/comments/:id', authenticate as any, deleteComment as any);

// Playlists
router.get('/playlists/mine', authenticate as any, getMyPlaylists as any);
router.get('/playlists/:idOrSlug', optionalAuth as any, getPlaylist as any);
router.post('/playlists', authenticate as any, createPlaylistRules, validateRequest, createPlaylist as any);
router.put('/playlists/:id', authenticate as any, createPlaylistRules, validateRequest, updatePlaylist as any);
router.post('/playlists/:playlistId/tracks', authenticate as any, addToPlaylist as any);
router.delete('/playlists/:playlistId/tracks/:trackId', authenticate as any, removeFromPlaylist as any);
router.delete('/playlists/:id', authenticate as any, deletePlaylist as any);

// Shares
router.post('/shares/:trackId', optionalAuth as any, shareTrack as any);

export default router;
