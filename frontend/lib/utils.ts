import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export shared utilities for convenience
export { formatDuration, formatCount, slugify, formatDate, truncateText, debounce } from '@makeyourmusic/shared';

// Allowed payment / billing redirect destinations. We never allow `window.
// location.href = res.data.url` to point at an arbitrary domain — even though
// the backend issues these, a misconfigured Stripe account or a compromised
// server response could redirect a user to an attacker's phishing page.
const PAYMENT_REDIRECT_HOSTS = [
  'checkout.stripe.com',
  'billing.stripe.com',
  'connect.stripe.com',
  'dashboard.stripe.com',
];

/**
 * Validate a server-provided redirect URL, returning the URL if it points to
 * a known billing host (or to our own origin), and `null` otherwise. The
 * caller is responsible for showing an error to the user when this returns
 * null instead of redirecting blindly.
 */
export function validatePaymentRedirect(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null;
  let url: URL;
  try {
    url = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://makeyourmusic.ai');
  } catch {
    return null;
  }
  if (typeof window !== 'undefined' && url.origin === window.location.origin) {
    return url.toString();
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (PAYMENT_REDIRECT_HOSTS.includes(host)) return url.toString();
  // Stripe rotates *.stripe.com subdomains for hosted invoice pages.
  if (host.endsWith('.stripe.com')) return url.toString();
  return null;
}
