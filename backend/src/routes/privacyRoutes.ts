import { Router } from 'express';
import {
  exportMyData,
  requestAccountDeletion,
  cancelAccountDeletion,
  setDoNotSell,
  getPrivacyStatus,
} from '../controllers/privacyController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/status', getPrivacyStatus as any);
router.get('/export', exportMyData as any);
router.post('/delete', requestAccountDeletion as any);
router.post('/cancel-delete', cancelAccountDeletion as any);
router.patch('/do-not-sell', setDoNotSell as any);

export default router;
