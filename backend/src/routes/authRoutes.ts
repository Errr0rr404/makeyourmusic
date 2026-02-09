import { Router } from 'express';
import { register, login, me, updateProfile, logout, refresh } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { registerRules, loginRules, profileUpdateRules, validateRequest } from '../middleware/validation';

const router = Router();

router.post('/register', authLimiter, registerRules, validateRequest, register as any);
router.post('/login', authLimiter, loginRules, validateRequest, login as any);
router.post('/logout', logout as any);
router.post('/refresh', authLimiter, refresh as any);
router.get('/me', authenticate as any, me as any);
router.put('/profile', authenticate as any, profileUpdateRules, validateRequest, updateProfile as any);

export default router;
