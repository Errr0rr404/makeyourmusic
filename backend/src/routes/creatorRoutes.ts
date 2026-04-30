import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConnectStatus,
  createOnboardingLink,
  createDashboardLink,
  refreshConnectStatus,
} from '../controllers/connectController';
import { createTipCheckout, getReceivedTips } from '../controllers/tipController';
import {
  setPlaylistPricing,
  subscribeToPlaylist,
  cancelChannelSubscription,
  getMyChannelSubscriptions,
  getCreatorSubscribers,
} from '../controllers/channelSubController';
import { getCreatorEarningsSummary } from '../controllers/earningsController';

const router = Router();

// ─── Stripe Connect onboarding ───────────────────────────
router.get('/connect/status', authenticate as any, getConnectStatus as any);
router.post('/connect/onboarding-link', authenticate as any, createOnboardingLink as any);
router.post('/connect/dashboard-link', authenticate as any, createDashboardLink as any);
router.post('/connect/refresh', authenticate as any, refreshConnectStatus as any);

// ─── Tips ────────────────────────────────────────────────
router.post('/tips/checkout', authenticate as any, createTipCheckout as any);
router.get('/tips/received', authenticate as any, getReceivedTips as any);

// ─── Paid playlists / channel subscriptions ──────────────
router.put('/playlists/:id/pricing', authenticate as any, setPlaylistPricing as any);
router.post('/playlists/:id/subscribe', authenticate as any, subscribeToPlaylist as any);
router.post('/channel-subscriptions/:id/cancel', authenticate as any, cancelChannelSubscription as any);
router.get('/channel-subscriptions/mine', authenticate as any, getMyChannelSubscriptions as any);
router.get('/subscribers', authenticate as any, getCreatorSubscribers as any);

// ─── Earnings dashboard ──────────────────────────────────
router.get('/earnings/summary', authenticate as any, getCreatorEarningsSummary as any);

export default router;
