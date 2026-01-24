import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// CSRF token validation middleware
// Uses Double Submit Cookie pattern for stateless CSRF protection

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Generate a CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Validate CSRF token from header against cookie
 */
export const validateCsrfToken = (req: NextRequest): boolean => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // Get token from header
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER);
  
  // Get token from cookie
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Both must exist and match
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(headerToken),
    Buffer.from(cookieToken)
  );
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = async (req: NextRequest): Promise<NextResponse | null> => {
  // Skip CSRF check for public endpoints that don't modify state
  const publicEndpoints = [
    '/api/health',
    '/api/store-config/public',
    '/api/products',
    '/api/categories',
  ];

  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    req.nextUrl.pathname.startsWith(endpoint)
  );

  if (isPublicEndpoint) {
    return null; // Allow request
  }

  // Validate CSRF token
  if (!validateCsrfToken(req)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null; // Allow request
};

/**
 * Set CSRF token cookie in response
 */
export const setCsrfTokenCookie = (response: NextResponse, token: string): void => {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript for header submission
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
  });
};
