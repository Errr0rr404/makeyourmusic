import { Router } from 'express';
import { getPublicUserProfile } from '../controllers/userController';

const router = Router();

router.get('/:username', getPublicUserProfile as any);

export default router;
