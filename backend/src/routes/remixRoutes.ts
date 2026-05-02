import { Router } from 'express';
import { remixDiscoveryFeed } from '../controllers/remixController';

const router = Router();

// Global remix discovery feed (public). Lists recent (parentTrack → remixTrack)
// edges where both tracks are public + ACTIVE. Supports cursor pagination.
router.get('/feed', remixDiscoveryFeed as any);

export default router;
