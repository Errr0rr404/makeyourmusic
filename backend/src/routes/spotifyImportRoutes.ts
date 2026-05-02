import { Router } from 'express';
import {
  getSpotifyAuthUrl,
  startSpotifyImport,
  getSpotifyImport,
  listMySpotifyImports,
} from '../controllers/spotifyImportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/auth-url', getSpotifyAuthUrl as any);
router.get('/', listMySpotifyImports as any);
router.post('/', startSpotifyImport as any);
router.get('/:id', getSpotifyImport as any);

export default router;
