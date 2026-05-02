import { Router } from 'express';
import {
  register,
  login,
  me,
  updateProfile,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  deleteAccount,
  getEmailPreferences,
  updateEmailPreferences,
  firebaseExchange,
  requestMagicLink,
  verifyMagicLink,
  getAuthConfig,
} from '../controllers/authController';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
  authLimiter,
  writeAuthLimiter,
  emailDispatchLimiter,
} from '../middleware/rateLimiter';
import {
  registerRules,
  loginRules,
  profileUpdateRules,
  forgotPasswordRules,
  resetPasswordRules,
  resendVerificationRules,
  changePasswordRules,
  deleteAccountRules,
  validateRequest,
} from '../middleware/validation';

const router = Router();

// Register — always returns 201 on success or 400/409 on failure. We must
// count *every* request, otherwise an attacker can spam without throttle.
router.post('/register', writeAuthLimiter, registerRules, validateRequest, register as any);
router.post('/login', authLimiter, loginRules, validateRequest, login as any);
router.post('/logout', optionalAuth as any, logout as any);
router.post('/refresh', writeAuthLimiter, refresh as any);
router.post('/firebase/exchange', writeAuthLimiter, firebaseExchange as any);
router.get('/me', authenticate as any, me as any);
router.put('/profile', authenticate as any, profileUpdateRules, validateRequest, updateProfile as any);

// Password reset — `forgot-password` always 200 (anti-enumeration), so a
// limiter that skips successful requests would be a no-op. Use a strict
// email-dispatch limiter that counts every call.
router.post('/forgot-password', emailDispatchLimiter, forgotPasswordRules, validateRequest, forgotPassword as any);
router.post('/reset-password', writeAuthLimiter, resetPasswordRules, validateRequest, resetPassword as any);

// Email verification
router.get('/verify-email/:token', verifyEmail as any);
router.post('/resend-verification', emailDispatchLimiter, resendVerificationRules, validateRequest, resendVerification as any);

// Magic-link (passwordless). Request is rate-limited as an email dispatch
// (every call counts — response is intentionally enumeration-safe). Verify
// uses the write-auth limiter so a stolen token can't be brute-forced.
router.post('/magic-link/request', emailDispatchLimiter, requestMagicLink as any);
router.post('/magic-link/verify', writeAuthLimiter, verifyMagicLink as any);

// Public auth-feature config — used by the frontend to hide UI for
// features that aren't fully wired up server-side (e.g. magic-link
// without an email provider).
router.get('/config', getAuthConfig as any);

// Account management (authenticated)
router.post('/change-password', authenticate as any, writeAuthLimiter, changePasswordRules, validateRequest, changePassword as any);
router.delete('/account', authenticate as any, writeAuthLimiter, deleteAccountRules, validateRequest, deleteAccount as any);

// Email preferences
router.get('/email-preferences', authenticate as any, getEmailPreferences as any);
router.put('/email-preferences', authenticate as any, updateEmailPreferences as any);

export default router;
