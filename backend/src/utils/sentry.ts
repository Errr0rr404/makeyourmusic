// Sentry init for the backend. Call `initSentry()` once at process start.
// No-op when SENTRY_DSN is unset, so dev / self-hosted deploys don't need
// to know about Sentry at all.

import * as Sentry from '@sentry/node';
import logger from './logger';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('Sentry disabled (SENTRY_DSN not set)');
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE,
      // Tracing: opt-in by default. Set SENTRY_TRACES_SAMPLE_RATE=0.1 to
      // enable. Logs and exceptions still ship at 100%.
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
      // Strip noisy 4xx errors — the user typed a bad password, not our problem.
      ignoreErrors: ['Invalid credentials', 'Invalid or expired'],
    });
    initialized = true;
    logger.info('Sentry initialized');
  } catch (err) {
    logger.warn('Sentry init failed', { error: (err as Error).message });
  }
}

/**
 * Forward an exception to Sentry. Safe to call before init — it just won't
 * be captured. Adds optional context keys (userId, route, etc.).
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    Sentry.captureException(err, context ? { extra: context as Record<string, unknown> } : undefined);
  } catch {
    /* never break the request path on a Sentry transport hiccup */
  }
}

export { Sentry };
