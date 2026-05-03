/**
 * Deep linking configuration for MakeYourMusic mobile app.
 *
 * Handles URLs like:
 *   makeyourmusic://track/some-slug
 *   https://makeyourmusic.ai/track/some-slug
 *   https://makeyourmusic.ai/agent/some-slug
 *   https://makeyourmusic.ai/genre/electronic
 *
 * expo-router handles file-based deep links automatically via the `scheme`
 * configured in app.json. This module provides additional utilities for
 * universal links and custom URL parsing.
 */
import * as Linking from 'expo-linking';

export const MAKEYOURMUSIC_SCHEME = 'makeyourmusic';
// The makeyourmusic.ai domain isn't live yet — point shareable links to the
// actual deployed Railway frontend so URLs people open from share sheets,
// Terms/Privacy links, etc. resolve. Override at build time via
// EXPO_PUBLIC_WEB_URL once the production domain is wired up.
export const MAKEYOURMUSIC_WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://makeyourmusic-web-production.up.railway.app';

// Slugs are restricted to lowercase letters, digits, and hyphens. This is
// what backend slugify() emits, so anything else in a deep-link path is
// either malformed or hostile (path traversal, encoded escapes, etc.).
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/i;

function safeSlugRoute(prefix: 'track' | 'agent' | 'genre' | 'playlist', path: string): string | null {
  // path looks like e.g. `track/some-slug` or `track/some-slug/extra`.
  const tail = path.slice(prefix.length + 1);
  const slug = tail.split('/')[0];
  if (!slug || !SLUG.test(slug)) return null;
  return `/${prefix}/${slug}`;
}

/**
 * Parse an incoming URL into a route path for the app. Only known prefixes
 * are accepted; everything else returns null so the caller falls through to
 * the home tab instead of navigating to an attacker-controlled string.
 */
export function parseDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path;

    if (!path) return null;

    if (path.startsWith('track/')) return safeSlugRoute('track', path);
    if (path.startsWith('agent/')) return safeSlugRoute('agent', path);
    if (path.startsWith('genre/')) return safeSlugRoute('genre', path);
    if (path.startsWith('playlist/')) return safeSlugRoute('playlist', path);
    if (path === 'login') return '/(auth)/login';
    if (path === 'register') return '/(auth)/register';
    if (path === 'library') return '/(tabs)/library';
    if (path === 'search') return '/(tabs)/search';
    if (path === 'feed') return '/(tabs)/feed';
    if (path === 'dashboard') return '/dashboard';

    return null;
  } catch {
    return null;
  }
}

/**
 * Create a shareable link for a track.
 */
export function createTrackShareLink(slug: string): string {
  return `${MAKEYOURMUSIC_WEB_URL}/track/${slug}`;
}

/**
 * Create a shareable link for an agent.
 */
export function createAgentShareLink(slug: string): string {
  return `${MAKEYOURMUSIC_WEB_URL}/agent/${slug}`;
}
