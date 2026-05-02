import { Router } from 'express';
import {
  createListing,
  updateListing,
  listListings,
  getListing,
  listMyListings,
  startCheckout,
  listMyPurchases,
  downloadPurchase,
} from '../controllers/marketplaceController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Specific routes BEFORE the slug-matched routes so /listings/mine and
// /purchases/mine aren't shadowed by the :slug parameter pattern.
router.get('/listings/mine', authenticate as any, listMyListings as any);
router.get('/purchases/mine', authenticate as any, listMyPurchases as any);
router.get('/purchases/:id/download', authenticate as any, downloadPurchase as any);

router.post('/listings', authenticate as any, createListing as any);
router.patch('/listings/:id', authenticate as any, updateListing as any);
router.get('/listings', optionalAuth as any, listListings as any);
router.get('/listings/:slug', optionalAuth as any, getListing as any);
router.post('/listings/:slug/checkout', authenticate as any, startCheckout as any);

export default router;
