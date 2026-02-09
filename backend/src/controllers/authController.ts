import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/db';
import { generateTokenPair } from '../utils/jwt';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

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

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        displayName: displayName || username,
        role: 'LISTENER',
        subscription: { create: { tier: 'FREE', status: 'ACTIVE' } },
      },
      select: { id: true, email: true, username: true, displayName: true, role: true, avatar: true },
    });

    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as any,
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
      select: { id: true, email: true, username: true, displayName: true, role: true, avatar: true, passwordHash: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { passwordHash: _, ...safeUser } = user;

    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as any,
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

    const { verifyRefreshToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshTokenCookie);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as any,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};
