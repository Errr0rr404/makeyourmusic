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
} from '../controllers/authController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
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

router.post('/register', authLimiter, registerRules, validateRequest, register as any);
router.post('/login', authLimiter, loginRules, validateRequest, login as any);
router.post('/logout', optionalAuth as any, logout as any);
router.post('/refresh', authLimiter, refresh as any);
router.get('/me', authenticate as any, me as any);
router.put('/profile', authenticate as any, profileUpdateRules, validateRequest, updateProfile as any);

// Password reset
router.post('/forgot-password', authLimiter, forgotPasswordRules, validateRequest, forgotPassword as any);
router.post('/reset-password', authLimiter, resetPasswordRules, validateRequest, resetPassword as any);

// Email verification
router.get('/verify-email/:token', verifyEmail as any);
router.post('/resend-verification', authLimiter, resendVerificationRules, validateRequest, resendVerification as any);

// Account management (authenticated)
router.post('/change-password', authenticate as any, authLimiter, changePasswordRules, validateRequest, changePassword as any);
router.delete('/account', authenticate as any, authLimiter, deleteAccountRules, validateRequest, deleteAccount as any);

// Email preferences
router.get('/email-preferences', authenticate as any, getEmailPreferences as any);
router.put('/email-preferences', authenticate as any, updateEmailPreferences as any);

export default router;
