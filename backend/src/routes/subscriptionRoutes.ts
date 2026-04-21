import { Router } from 'express';
import {
  getSubscription, createCheckout, cancelSubscription, getAgentEarnings,
} from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate as any, getSubscription as any);
router.post('/checkout', authenticate as any, createCheckout as any);
router.post('/cancel', authenticate as any, cancelSubscription as any);
// Webhook is mounted directly in server.ts with express.raw() for Stripe signature verification
router.get('/earnings/:agentId', authenticate as any, getAgentEarnings as any);

export default router;
