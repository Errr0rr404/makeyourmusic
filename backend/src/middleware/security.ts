import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

// Banking-level security headers middleware
// Implements the same security standards used by major financial institutions
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // This server is API-only (no HTML pages). Drop unsafe-inline; CSS is
      // never delivered via this origin, so 'self' is enough and the previous
      // 'unsafe-inline' allow-listed CSS-injection XSS for free.
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'], // Allow blob: for image previews
      // Allow only your specific Railway deploys via env (RAILWAY_PUBLIC_DOMAIN).
      // The previous wildcards on *.railway.app would let any Railway tenant
      // host attacker content under our same connect-src budget.
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://*.stripe.com',
        ...(process.env.RAILWAY_PUBLIC_DOMAIN
          ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`]
          : process.env.NODE_ENV !== 'production'
            ? ['https://*.up.railway.app', 'https://*.railway.app']
            : []),
      ],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      // Audio/video streamed from Cloudinary or any HTTPS source. blob: lets
      // us play locally-decoded audio (e.g. crossfade buffer swaps).
      mediaSrc: ["'self'", 'https:', 'blob:', 'data:'],
      // CSP `'none'` must appear alone — combining it with a URL is invalid
      // (some browsers fall back to ignoring the URL). frameAncestors below
      // is what actually prevents the API from being embedded.
      frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
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
  // X-XSS-Protection is deprecated and ignored by modern browsers; older IE
  // versions had bugs where setting it could ENABLE XSS reflection. Rely on
  // CSP instead.
  xssFilter: false,
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
