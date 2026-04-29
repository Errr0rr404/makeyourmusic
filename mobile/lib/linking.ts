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
export const MAKEYOURMUSIC_WEB_URL = 'https://makeyourmusic.ai';

/**
 * Parse an incoming URL into a route path for the app.
 */
export function parseDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path;

    if (!path) return null;

    // Handle known routes
    if (path.startsWith('track/')) return `/${path}`;
    if (path.startsWith('agent/')) return `/${path}`;
    if (path.startsWith('genre/')) return `/${path}`;
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
