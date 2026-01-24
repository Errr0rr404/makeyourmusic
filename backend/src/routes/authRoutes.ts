import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile,
  refresh,
  logout,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import {
  emailValidation,
  passwordValidation,
  nameValidation,
  validateRequest,
} from '../middleware/validation';

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [emailValidation, passwordValidation, nameValidation],
  validateRequest,
  register
);

router.post(
  '/login',
  authLimiter,
  [emailValidation, body('password').notEmpty().withMessage('Password is required')],
  validateRequest,
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);

export default router;
