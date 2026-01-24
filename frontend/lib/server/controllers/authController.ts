import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/errorHandler';
import { UserRole } from '../types';
import { validatePassword, sanitizeEmail, isValidEmail } from '../utils/validation';
import { authenticate } from '../middleware/auth';

export const register = async (req: NextRequest): Promise<NextResponse> => {
  const body = await req.json();
  const { email, password, name } = body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new AppError(passwordValidation.message || 'Password does not meet requirements', 400);
  }

  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    throw new AppError('Invalid email format', 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: sanitizedEmail },
  });

  if (existingUser) {
    // Don't reveal if email exists (prevent user enumeration)
    throw new AppError('Registration failed', 400);
  }

  // Use higher salt rounds for better security
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: sanitizedEmail,
      passwordHash,
      name: name?.trim() || null,
      role: UserRole.CUSTOMER,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

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

  const response = NextResponse.json(
    {
      user,
      accessToken,
    },
    { status: 201 }
  );

  // Set refresh token cookie
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return response;
};

export const login = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Normalize email: trim and lowercase (matching backend behavior)
    // This ensures consistency with how emails are stored
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      throw new AppError('Invalid email format', 400);
    }

    // Find user by email (normalized to lowercase)
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      
      // Error logging only - no debug logs in production
    } catch (dbError: any) {
      console.error('Database error during login:', dbError);
      throw new AppError(
        `Database connection error: ${dbError.message || 'Unable to connect to database'}`,
        500
      );
    }

    // Always perform bcrypt comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
    const hashToCompare = user?.passwordHash || dummyHash;
    
    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    // Security: No password check logging

    // Don't reveal if user exists (prevent user enumeration)
    if (!user || !isValidPassword) {
      throw new AppError('Invalid email or password', 401);
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
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken, // Include in response body for client-side storage
    });

    // Set refresh token cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return response;
  } catch (error: any) {
    // Re-throw AppError as-is
    if (error instanceof AppError) {
      throw error;
    }
    // Wrap other errors
    console.error('Login error:', error);
    throw new AppError(
      error.message || 'Login failed. Please try again.',
      500
    );
  }
};

export const getMe = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    throw new AppError('User not found', 404);
  }

  return NextResponse.json({ user: dbUser });
};

export const updateProfile = async (req: NextRequest): Promise<NextResponse> => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!user?.userId) {
    throw new AppError('User not authenticated', 401);
  }

  const body = await req.json();
  const { name, email, phone } = body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: user.userId },
  });

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  // If email is being changed, check if new email is available
  let sanitizedEmail: string | null = null;
  if (email && email !== existingUser.email) {
    sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      throw new AppError('Invalid email format', 400);
    }

    const emailTaken = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (emailTaken) {
      throw new AppError('Email is already in use', 400);
    }
  }

  // Update user profile
  const updateData: {
    name?: string | null;
    email?: string;
    phone?: string | null;
  } = {};
  
  if (name !== undefined) {
    updateData.name = name?.trim() || null;
  }
  
  if (sanitizedEmail) {
    updateData.email = sanitizedEmail;
  }
  
  if (phone !== undefined) {
    updateData.phone = phone?.trim() || null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updatedUser });
};

export const refresh = async (req: NextRequest): Promise<NextResponse> => {
  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (!refreshToken) {
    throw new AppError('Refresh token not provided', 401);
  }

  const decoded = verifyRefreshToken(refreshToken);

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

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return NextResponse.json({ accessToken });
};

export const logout = async (req: NextRequest): Promise<NextResponse> => {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.delete('refreshToken');
  return response;
};
