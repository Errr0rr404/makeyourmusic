// Sentry server-side init for the Next.js app (Server Components, route
// handlers, generateMetadata). Reads SENTRY_DSN (server-only — keep the
// client DSN under NEXT_PUBLIC_SENTRY_DSN if they differ). No-op when
// neither is set.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
  });
}
