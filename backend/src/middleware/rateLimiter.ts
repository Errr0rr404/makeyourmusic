import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { RequestWithUser } from '../types';

// More lenient rate limits in development
const isDevelopment = process.env.NODE_ENV !== 'production';

// When the request is authenticated, key by userId so a single account can't
// hop IPs to bypass limits — and so users behind shared NATs aren't lumped
// together. Falls back to IP for anonymous traffic.
const userOrIpKey = (req: Request): string => {
  const userId = (req as RequestWithUser).user?.userId;
  if (userId) return `u:${userId}`;
  return req.ip ?? 'anonymous';
};

// Login-only limiter — `skipSuccessfulRequests` is safe here because
// a successful login means the credentials were correct, not a guess.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// For endpoints that ALWAYS return 200 (forgot-password, resend-verification)
// — `skipSuccessfulRequests` would effectively disable the limiter here,
// letting attackers spam emails and inflate provider bills.
export const writeAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 5,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot-password / verification email — tighter cap to deter abuse since
// each successful request sends an email.
export const emailDispatchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 20 : 3,
  message: 'Too many email requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login — independent counter so a brute-force on /auth/login can't
// burn the admin's window and a brute-force on /admin/auth/verify can't
// burn the user's window.
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 20 : 5,
  message: 'Too many admin login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Much more lenient in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip rate limiting for OPTIONS requests
});

// Strict rate limiter for upload endpoints (prevent abuse)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: 'Too many upload requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user limit on writes that can be used to spam other users (comments, shares).
// A single user posting 30 comments/hour across the platform is already aggressive.
export const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 200 : 30,
  message: 'You are commenting too quickly. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});

// Per-user limit on AI generation (expensive, costs money). Tighter than uploads.
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 100 : 20,
  message: 'You have hit the hourly generation limit. Try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});
