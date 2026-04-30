import { Router } from 'express';
import { getMyReferralCode, myReferralStats } from '../controllers/referralController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/code', authenticate as any, getMyReferralCode as any);
router.get('/stats', authenticate as any, myReferralStats as any);

export default router;
