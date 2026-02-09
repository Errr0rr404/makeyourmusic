import { Router } from 'express';
import {
  getSubscription, createCheckout, cancelSubscription, handleWebhook, getAgentEarnings,
} from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate as any, getSubscription as any);
router.post('/checkout', authenticate as any, createCheckout as any);
router.post('/cancel', authenticate as any, cancelSubscription as any);
router.post('/webhook', handleWebhook as any); // No auth - Stripe sends this
router.get('/earnings/:agentId', authenticate as any, getAgentEarnings as any);

export default router;
