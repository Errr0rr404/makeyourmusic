import { Router } from 'express';
import { searchTracks, searchAgents } from '../controllers/searchController';

const router = Router();

// Public — vector + text hybrid search. Auth-optional; no per-user signal yet.
router.get('/tracks', searchTracks as any);
router.get('/agents', searchAgents as any);

export default router;
