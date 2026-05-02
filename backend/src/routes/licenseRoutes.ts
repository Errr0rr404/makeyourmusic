import { Router } from 'express';
import {
  enableLicensing,
  disableLicensing,
  startCheckout,
  downloadLicensedFiles,
  browseLicenseable,
} from '../controllers/licenseController';
import {
  requestStems,
  getStems,
  setStemsPrice,
  createStemsGenerationCheckout,
  exportStemsMix,
} from '../controllers/stemsController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/browse', browseLicenseable as any);
router.put('/tracks/:trackId/enable', authenticate as any, enableLicensing as any);
router.put('/tracks/:trackId/disable', authenticate as any, disableLicensing as any);
router.post('/checkout', authenticate as any, startCheckout as any);
router.get('/download/:token', downloadLicensedFiles as any);

// Stems
// /stems/checkout — owner pays the flat generation fee (Stripe Checkout); the
//                   webhook starts the Replicate job after payment.
// /stems/request  — retry a previously-paid generation that failed (no charge).
// /stems          — read current stems state.
// /stems/price    — owner sets a resale price for the buyer-facing bundle.
router.post(
  '/tracks/:trackId/stems/checkout',
  authenticate as any,
  createStemsGenerationCheckout as any,
);
router.post('/tracks/:trackId/stems/request', authenticate as any, requestStems as any);
router.get('/tracks/:trackId/stems', optionalAuth as any, getStems as any);
router.put('/tracks/:trackId/stems/price', authenticate as any, setStemsPrice as any);
router.post('/tracks/:trackId/stems/mix-export', authenticate as any, exportStemsMix as any);

export default router;
