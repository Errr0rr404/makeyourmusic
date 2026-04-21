import { Response } from 'express';
import crypto from 'crypto';
import argon2 from 'argon2';
import { prisma } from '../utils/db';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from '../utils/email';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function dispatchVerificationEmail(email: string, rawToken: string): Promise<void> {
  try {
    await sendEmail(buildVerificationEmail(email, rawToken));
  } catch (err) {
    logger.error('Failed to send verification email', {
      email,
      error: (err as Error).message,
    });
  }
}

async function dispatchPasswordResetEmail(email: string, rawToken: string): Promise<void> {
  try {
    await sendEmail(buildPasswordResetEmail(email, rawToken));
  } catch (err) {
    logger.error('Failed to send password reset email', {
      email,
      error: (err as Error).message,
    });
  }
}

export const register = async (req: RequestWithUser, res: Response) => {
  try {
    const { email, password, username, displayName } = req.body;

    if (!email || !password || !username) {
      res.status(400).json({ error: 'Email, password, and username are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ error: 'Username must be 3-30 characters' });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      res.status(409).json({
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken',
      });
      return;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const rawVerificationToken = generateToken();
    const hashedVerificationToken = hashToken(rawVerificationToken);
    const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        displayName: displayName || username,
        role: 'LISTENER',
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: verificationExpires,
        subscription: { create: { tier: 'FREE', status: 'ACTIVE' } },
      },
      select: {
        id: true, email: true, username: true, displayName: true, role: true, avatar: true,
        emailVerified: true,
      },
    });

    await dispatchVerificationEmail(user.email, rawVerificationToken);

    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user, accessToken });
  } catch (error) {
    logger.error('Registration error', { error: (error as Error).message });
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: RequestWithUser, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, username: true, displayName: true, role: true, avatar: true,
        passwordHash: true, emailVerified: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { passwordHash: _, ...safeUser } = user;

    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: safeUser, accessToken });
  } catch (error) {
    logger.error('Login error', { error: (error as Error).message });
    res.status(500).json({ error: 'Login failed' });
  }
};

export const me = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, email: true, username: true, displayName: true,
        role: true, avatar: true, bio: true, createdAt: true,
        emailVerified: true,
        subscription: { select: { tier: true, status: true } },
        _count: { select: { likes: true, playlists: true, follows: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get me error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateProfile = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { displayName, bio, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
      },
      select: { id: true, email: true, username: true, displayName: true, role: true, avatar: true, bio: true },
    });

    res.json({ user });
  } catch (error) {
    logger.error('Update profile error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const logout = async (_req: RequestWithUser, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

export const refresh = async (req: RequestWithUser, res: Response) => {
  try {
    const refreshTokenCookie = req.cookies?.refreshToken;
    if (!refreshTokenCookie) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const decoded = await verifyRefreshToken(refreshTokenCookie);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// ─── Password Reset ───────────────────────────────────────

export const forgotPassword = async (req: RequestWithUser, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Always respond the same whether the user exists or not to prevent email enumeration
    if (user) {
      const rawToken = generateToken();
      const hashedToken = hashToken(rawToken);
      const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
        },
      });

      await dispatchPasswordResetEmail(user.email, rawToken);
    } else {
      logger.info('Password reset requested for unknown email', { email });
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Forgot password error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req: RequestWithUser, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }

    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('Reset password error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// ─── Email Verification ───────────────────────────────────

export const verifyEmail = async (req: RequestWithUser, res: Response) => {
  try {
    const token = req.params.token as string | undefined;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { gt: new Date() },
      },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    if (user.emailVerified) {
      res.json({ message: 'Email already verified' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify email error', { error: (error as Error).message });
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const resendVerification = async (req: RequestWithUser, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (user && !user.emailVerified) {
      const rawToken = generateToken();
      const hashedToken = hashToken(rawToken);
      const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: hashedToken,
          emailVerificationExpires: expires,
        },
      });

      await dispatchVerificationEmail(user.email, rawToken);
    }

    res.json({
      message: 'If an unverified account exists, a verification email has been sent.',
    });
  } catch (error) {
    logger.error('Resend verification error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to resend verification' });
  }
};

// ─── Change Password (authenticated) ──────────────────────

export const changePassword = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new passwords are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// ─── Email notification preferences ───────────────────────

export const getEmailPreferences = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        emailFollowerAlert: true,
        emailLikeAlert: true,
        emailCommentAlert: true,
        emailDigestWeekly: true,
        emailMarketing: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ preferences: user });
  } catch (error) {
    logger.error('Get email preferences error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get preferences' });
  }
};

export const updateEmailPreferences = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { emailFollowerAlert, emailLikeAlert, emailCommentAlert, emailDigestWeekly, emailMarketing } =
      req.body || {};

    const data: Record<string, boolean> = {};
    if (typeof emailFollowerAlert === 'boolean') data.emailFollowerAlert = emailFollowerAlert;
    if (typeof emailLikeAlert === 'boolean') data.emailLikeAlert = emailLikeAlert;
    if (typeof emailCommentAlert === 'boolean') data.emailCommentAlert = emailCommentAlert;
    if (typeof emailDigestWeekly === 'boolean') data.emailDigestWeekly = emailDigestWeekly;
    if (typeof emailMarketing === 'boolean') data.emailMarketing = emailMarketing;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: {
        emailFollowerAlert: true,
        emailLikeAlert: true,
        emailCommentAlert: true,
        emailDigestWeekly: true,
        emailMarketing: true,
      },
    });

    res.json({ preferences: user });
  } catch (error) {
    logger.error('Update email preferences error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

// ─── Delete Account (authenticated) ───────────────────────

export const deleteAccount = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { password, confirmUsername } = req.body;
    if (!password || !confirmUsername) {
      res.status(400).json({ error: 'Password and username confirmation are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, passwordHash: true, username: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.username !== confirmUsername) {
      res.status(400).json({ error: 'Username confirmation does not match' });
      return;
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      res.status(401).json({ error: 'Password is incorrect' });
      return;
    }

    await prisma.user.delete({ where: { id: user.id } });

    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted' });
  } catch (error) {
    logger.error('Delete account error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
