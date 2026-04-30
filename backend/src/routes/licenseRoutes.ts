import { Router } from 'express';
import {
  enableLicensing,
  disableLicensing,
  startCheckout,
  downloadLicensedFiles,
  browseLicenseable,
} from '../controllers/licenseController';
import { requestStems, getStems, setStemsPrice } from '../controllers/stemsController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/browse', browseLicenseable as any);
router.put('/tracks/:trackId/enable', authenticate as any, enableLicensing as any);
router.put('/tracks/:trackId/disable', authenticate as any, disableLicensing as any);
router.post('/checkout', authenticate as any, startCheckout as any);
router.get('/download/:token', downloadLicensedFiles as any);

// Stems (the paid bundle is a license tier)
router.post('/tracks/:trackId/stems/request', authenticate as any, requestStems as any);
router.get('/tracks/:trackId/stems', optionalAuth as any, getStems as any);
router.put('/tracks/:trackId/stems/price', authenticate as any, setStemsPrice as any);

export default router;
