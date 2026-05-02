// Sentry client init. Loaded by Next.js automatically when present at the
// project root. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    // Tracing off by default; enable per-deploy via env if you actually look
    // at the data — running it everywhere wastes quota.
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0'),
    // Replays only on errors. The full-session replay quota burns fast and
    // is rarely worth it on a music app — replay-on-error covers the
    // "what did the user do before the crash" use case for ~free.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_RATE || '0.1'),
    ignoreErrors: [
      // Common noise from third-party scripts (browser extensions, RUM).
      /Non-Error promise rejection captured/,
      /ResizeObserver loop limit exceeded/,
    ],
  });
}
