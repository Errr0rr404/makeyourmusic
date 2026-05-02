import { Router } from 'express';
import {
  getTrainingState,
  addTrainingExample,
  removeTrainingExample,
  deriveStyleProfile,
} from '../controllers/agentTrainingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/:agentId', getTrainingState as any);
router.post('/:agentId/examples', addTrainingExample as any);
router.delete('/:agentId/examples/:index', removeTrainingExample as any);
router.post('/:agentId/derive', deriveStyleProfile as any);

export default router;
