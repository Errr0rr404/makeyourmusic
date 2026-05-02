import { Router } from 'express';
import {
  getAppInfo,
  authorize,
  exchangeToken,
  revokeToken,
  listMyGrants,
  revokeGrant,
} from '../controllers/oauthController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public — used by the consent screen pre-flight + token exchange.
router.get('/info', getAppInfo as any);
router.post('/token', exchangeToken as any);
router.post('/revoke', revokeToken as any);

// Auth-required — user actions on the consent screen + dashboard.
router.post('/authorize', authenticate as any, authorize as any);
router.get('/grants', authenticate as any, listMyGrants as any);
router.delete('/grants/:id', authenticate as any, revokeGrant as any);

export default router;
