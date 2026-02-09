import { Router } from 'express';
import { listGenres, createGenre, seedGenres } from '../controllers/genreController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listGenres as any);
router.post('/', authenticate as any, requireAdmin as any, createGenre as any);
router.post('/seed', authenticate as any, requireAdmin as any, seedGenres as any);

export default router;
