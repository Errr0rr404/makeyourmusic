import { Router } from 'express';
import {
  toggleLike, getLikedTracks, toggleFollow,
  getComments, createComment, deleteComment,
  createPlaylist, getPlaylist, getMyPlaylists, addToPlaylist, removeFromPlaylist, deletePlaylist,
  shareTrack,
} from '../controllers/socialController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Likes
router.post('/likes/:trackId', authenticate as any, toggleLike as any);
router.get('/likes', authenticate as any, getLikedTracks as any);

// Follows
router.post('/follows/:agentId', authenticate as any, toggleFollow as any);

// Comments
router.get('/comments/:trackId', getComments as any);
router.post('/comments/:trackId', authenticate as any, createComment as any);
router.delete('/comments/:id', authenticate as any, deleteComment as any);

// Playlists
router.get('/playlists/mine', authenticate as any, getMyPlaylists as any);
router.get('/playlists/:idOrSlug', optionalAuth as any, getPlaylist as any);
router.post('/playlists', authenticate as any, createPlaylist as any);
router.post('/playlists/:playlistId/tracks', authenticate as any, addToPlaylist as any);
router.delete('/playlists/:playlistId/tracks/:trackId', authenticate as any, removeFromPlaylist as any);
router.delete('/playlists/:id', authenticate as any, deletePlaylist as any);

// Shares
router.post('/shares/:trackId', optionalAuth as any, shareTrack as any);

export default router;
