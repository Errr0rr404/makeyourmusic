import { Router } from 'express';
import { listNiches, nicheLanding } from '../controllers/nicheController';

const router = Router();

router.get('/', listNiches as any);
router.get('/:slug', nicheLanding as any);

export default router;
