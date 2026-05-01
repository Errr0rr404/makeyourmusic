import logger from './logger';

// Single shared Stripe SDK instance. Returns null if STRIPE_SECRET_KEY is unset
// (dev/test environments) — callers must check and 503 cleanly.
let stripeSingleton: any = null;
let initialized = false;

export function getStripe(): any | null {
  if (initialized) return stripeSingleton;
  initialized = true;
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = require('stripe');
      // Cap Stripe SDK request timeout. Default 80s × N rows in the collab
      // payout cron loop (up to 100 rows) can exceed the 15-min cron interval
      // worst case. 15s per call lets the loop bail and retry next tick
      // instead of stacking.
      stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY, {
        timeout: 15_000,
        maxNetworkRetries: 1,
      });
    }
  } catch (err) {
    logger.error('Failed to initialize Stripe SDK', { error: (err as Error).message });
  }
  // In production, refuse to initialize if webhook secret is missing — silently
  // accepting unsigned webhooks would let anyone upgrade themselves to PREMIUM
  // by POSTing to /api/subscription/webhook.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    logger.error(
      'STRIPE_WEBHOOK_SECRET is required in production when STRIPE_SECRET_KEY is set.'
    );
    stripeSingleton = null;
  }
  return stripeSingleton;
}

// Platform fee in basis points. 1500 = 15%. Override via PLATFORM_FEE_BPS env.
export function platformFeeBps(): number {
  return Math.max(0, Math.min(5000, parseInt(process.env.PLATFORM_FEE_BPS || '1500', 10)));
}

export function applyPlatformFee(grossCents: number): {
  fee: number;
  net: number;
} {
  const bps = platformFeeBps();
  const fee = Math.floor((grossCents * bps) / 10000);
  return { fee, net: grossCents - fee };
}

export function frontendUrl(): string {
  const url = process.env.FRONTEND_URL || 'http://localhost:3000';
  // FRONTEND_URL can be a comma-list (used by CORS); take the first.
  const first = url.split(',')[0];
  return (first || 'http://localhost:3000').trim();
}
