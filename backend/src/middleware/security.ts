import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

// Banking-level security headers middleware
// Implements the same security standards used by major financial institutions
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' needed for Tailwind
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'], // Allow blob: for image previews
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://*.stripe.com'], // Allow Stripe
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'", 'https://js.stripe.com'], // Allow Stripe iframes
      frameAncestors: ["'none'"], // Prevent embedding in frames
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null, // Force HTTPS in production
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for compatibility with payment gateways
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true, // Enable HSTS preload for banking-level security
  },
  // Additional banking-level security headers
  frameguard: { action: 'deny' }, // Prevent clickjacking
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Control referrer information
  // Note: permissionsPolicy is not supported in helmet v8 - if needed, use a separate middleware
});

// Validate required environment variables
export const validateEnv = (): void => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validate JWT secrets are not default values
  if (
    process.env.JWT_SECRET === 'your-secret-key-change-in-production' ||
    process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production'
  ) {
    throw new Error(
      'JWT secrets must be changed from default values in production'
    );
  }

  // Validate JWT secret length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
};

// Request ID middleware for logging
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  // Use crypto.randomUUID() for secure, unique request IDs
  const reqId = crypto.randomUUID();
  (req as Request & { id: string }).id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
};
