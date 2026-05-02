import { Router } from 'express';
import {
  startVoiceCloneCheckout,
  createVoiceClone,
  listMyVoiceClones,
  deleteVoiceClone,
} from '../controllers/voiceCloneController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/', listMyVoiceClones as any);
router.post('/', createVoiceClone as any);
router.post('/checkout', startVoiceCloneCheckout as any);
router.delete('/:id', deleteVoiceClone as any);

export default router;
