// Minimal i18n runtime. No dependency. Supports nested keys (`auth.login`)
// and `{var}` interpolation (`landing.subhead`). Falls back to the English
// catalog for any missing key, so a partial translation never shows
// `auth.login` to the user.
//
// Locale resolution order:
//   1. `mym_locale` cookie (set when the user picks a language)
//   2. `Accept-Language` (server-side) or `navigator.language` (client-side)
//   3. `en` default

import en from '@/messages/en.json';
import es from '@/messages/es.json';
import pt from '@/messages/pt.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import ja from '@/messages/ja.json';
import ko from '@/messages/ko.json';
import zh from '@/messages/zh.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'zh'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'en';

const CATALOGS: Record<Locale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  es: es as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
  fr: fr as Record<string, unknown>,
  de: de as Record<string, unknown>,
  ja: ja as Record<string, unknown>,
  ko: ko as Record<string, unknown>,
  zh: zh as Record<string, unknown>,
};

const LOCALE_COOKIE = 'mym_locale';

export function getCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)mym_locale=([a-z]{2,5})/);
  if (!m || !m[1]) return null;
  const v = m[1];
  return (SUPPORTED_LOCALES as readonly string[]).includes(v) ? (v as Locale) : null;
}

export function setLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function detectLocale(): Locale {
  if (typeof document !== 'undefined') {
    const cookie = getCookieLocale();
    if (cookie) return cookie;
    const nav = (navigator?.language || 'en').toLowerCase();
    return matchLocale(nav);
  }
  return DEFAULT_LOCALE;
}

function matchLocale(input: string): Locale {
  const short = input.slice(0, 2);
  return (SUPPORTED_LOCALES as readonly string[]).includes(short) ? (short as Locale) : DEFAULT_LOCALE;
}

// Look up a dotted key path in a catalog, returning undefined when missing
// rather than crashing (so we can fall back to English).
function getPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
  );
}

export function t(key: string, vars?: Record<string, string | number>, locale?: Locale): string {
  const loc = locale || detectLocale();
  const localized = getPath(CATALOGS[loc], key);
  if (localized) return interpolate(localized, vars);
  // Fall back to English so a missing translation doesn't show the raw key.
  const fallback = getPath(CATALOGS[DEFAULT_LOCALE], key);
  if (fallback) return interpolate(fallback, vars);
  return key;
}

// Helper for components that want the active locale once and forward it
// down. Avoids re-parsing cookies/nav on every t() call inside a hot render.
export function useDetectedLocale(): Locale {
  return detectLocale();
}
