import { Router } from 'express';
import { register, login, me, updateProfile, logout, refresh } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register as any);
router.post('/login', authLimiter, login as any);
router.post('/logout', logout as any);
router.post('/refresh', authLimiter, refresh as any);
router.get('/me', authenticate as any, me as any);
router.put('/profile', authenticate as any, updateProfile as any);

export default router;
