import { Router } from 'express';
import { listNiches, nicheLanding, listAllNiches } from '../controllers/nicheController';

const router = Router();

router.get('/', listNiches as any);
// Programmatic-niche slug listing for sitemap generation. Routed before
// `/:slug` so the literal path wins.
router.get('/all', listAllNiches as any);
router.get('/:slug', nicheLanding as any);

export default router;
