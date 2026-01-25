import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/errorHandler';
import { UserRole } from '../types';
import { sanitizeEmail } from '../utils/validation';

// Admin login (super admin / mastermind equivalent)
export const mastermindLogin = async (req: NextRequest): Promise<NextResponse> => {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    throw new AppError('Invalid email format', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: sanitizedEmail },
  });

  // Prevent timing attacks by always performing bcrypt comparison
  // Use a dummy hash if user doesn't exist or is not admin
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
  const hashToCompare = (user && user.role === UserRole.ADMIN) ? user.passwordHash : dummyHash;

  const isValidPassword = await bcrypt.compare(password, hashToCompare);

  // Don't reveal if user exists or is admin (prevent user enumeration)
  if (!user || user.role !== UserRole.ADMIN || !isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });

  // Set refresh token cookie
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return response;
};
