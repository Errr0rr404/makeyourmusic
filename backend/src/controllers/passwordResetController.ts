import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { validatePassword } from '../middleware/validation';
import { emailService } from '../services/emailService';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// In-memory store for reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

// Cleanup expired tokens every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiresAt) {
      resetTokens.delete(token);
    }
  }
}, CLEANUP_INTERVAL);

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent',
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hour

    resetTokens.set(token, { userId: user.id, expiresAt });

    // Send password reset email
    await emailService.sendPasswordReset(user.email, token);

    // In development, also return the token for easier testing
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        message: 'Password reset link sent (dev mode)',
        token, // Only in development
      });
    }

    return res.json({
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError('Token and password are required', 400);
    }

    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(token);
      throw new AppError('Reset token has expired', 400);
    }

    // Validate password strength using consistent validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message || 'Password does not meet requirements', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
    });

    // Delete used token
    resetTokens.delete(token);

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
};
