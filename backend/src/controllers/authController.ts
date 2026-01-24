import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/db';
import {
  generateTokenPair,
  verifyRefreshToken,
} from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../types';
import { validatePassword } from '../middleware/validation';
import {
  isRefreshTokenValid,
  persistRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../utils/refreshTokenStore';

const parseDurationMs = (value: string | undefined, fallbackMs: number): number => {
  if (!value) return fallbackMs;
  const match = /^([0-9]+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return fallbackMs;
  }
};

const REFRESH_TTL_MS = parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

const setRefreshCookie = (res: Response, refreshToken: string) => {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite: 'lax' | 'strict' = secure ? 'strict' : 'lax';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_TTL_MS,
    path: '/api/auth',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
};

const persistSession = (
  refreshJti: string,
  userId: string,
  sessionId: string,
  req: Request
) => {
  persistRefreshToken(refreshJti, {
    userId,
    sessionId,
    expiresAt: Date.now() + REFRESH_TTL_MS,
    userAgent: req.get('user-agent') || undefined,
    ip: req.ip,
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message || 'Password does not meet requirements', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Don't reveal if email exists (prevent user enumeration)
      throw new AppError('Registration failed', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        role: UserRole.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const { accessToken, refreshToken, refreshJti, sessionId } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    persistSession(refreshJti, user.id, sessionId, req);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      user,
      accessToken,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
    const hashToCompare = user?.passwordHash || dummyHash;
    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken, refreshJti, sessionId } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    persistSession(refreshJti, user.id, sessionId, req);
    setRefreshCookie(res, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, email, phone } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // If email is being changed, check if new email is available
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });

      if (emailTaken) {
        throw new AppError('Email is already in use', 400);
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name.trim() || null }),
        ...(email !== undefined && email !== existingUser.email && { email: email.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token not provided', 401);
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded.jti) {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValid = isRefreshTokenValid(decoded.jti, user.id);
    if (!isValid) {
      throw new AppError('Refresh token revoked or expired', 401);
    }

    const { accessToken, refreshToken: newRefreshToken, refreshJti, sessionId } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: decoded.sessionId,
    });

    rotateRefreshToken(decoded.jti, refreshJti, {
      userId: user.id,
      sessionId: sessionId,
      expiresAt: Date.now() + REFRESH_TTL_MS,
      userAgent: req.get('user-agent') || undefined,
      ip: req.ip,
    });

    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken, sessionId });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded.jti) {
        revokeRefreshToken(decoded.jti);
      }
    } catch (err) {
      // ignore decode errors on logout
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth', domain: process.env.COOKIE_DOMAIN || undefined });
  res.json({ message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // In a real application, you would generate a password reset token,
      // save it to the database, and send an email to the user with a
      // link to reset their password.
      //
      // For this example, we'll just return a success message.
    }

    res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    // In a real application, you would:
    // 1. Find the user by the password reset token.
    // 2. Verify that the token has not expired.
    // 3. Hash the new password.
    // 4. Update the user's password in the database.
    // 5. Invalidate the password reset token.

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
};
