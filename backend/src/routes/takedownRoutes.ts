import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fileTakedown, withdrawTakedown } from '../controllers/takedownController';
import { authenticate } from '../middleware/auth';

const router = Router();

// DMCA filing is rate-limited aggressively because the public endpoint can
// be used to weaponize takedowns against competitors. Combined with the
// controller's email-confirmation flow (track is hidden only AFTER the
// claimant clicks the verification link), this defangs the trivial
// catalog-wipe attack.
const takedownFileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 30,
  message: 'Too many takedown filings from this address. Please contact support.',
  standardHeaders: true,
  legacyHeaders: false,
});

const takedownWithdrawLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth is now required to file a takedown. Combined with the staged
// confirmation flow this still allows non-rights-holders to file (they
// just need an account) but provides an audit trail of who filed.
router.post('/', takedownFileLimiter, authenticate as any, fileTakedown as any);
router.post('/:id/withdraw', takedownWithdrawLimiter, authenticate as any, withdrawTakedown as any);

export default router;
