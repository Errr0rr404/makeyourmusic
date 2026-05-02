// Mobile i18n runtime. Mirrors frontend/lib/i18n.ts (same JSON catalogs)
// but reads device locale via expo-localization and persists user choice
// via AsyncStorage. Same `{var}` interpolation, same English fallback.

import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../messages/en.json';
import es from '../messages/es.json';
import pt from '../messages/pt.json';
import fr from '../messages/fr.json';
import de from '../messages/de.json';
import ja from '../messages/ja.json';
import ko from '../messages/ko.json';
import zh from '../messages/zh.json';

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

const LOCALE_KEY = 'mym_locale_v1';

let cached: Locale | null = null;

export async function loadLocale(): Promise<Locale> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(LOCALE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      cached = stored as Locale;
      return cached;
    }
  } catch {
    // AsyncStorage failed — fall through to device locale.
  }
  // expo-localization is the right source for device locale; we lazy-import
  // it so the bundle isn't penalized when the user picked a locale.
  try {
    const { getLocales } = await import('expo-localization');
    const locales = getLocales();
    const code = (locales[0]?.languageCode || 'en').toLowerCase();
    cached = (SUPPORTED_LOCALES as readonly string[]).includes(code) ? (code as Locale) : DEFAULT_LOCALE;
    return cached;
  } catch {
    cached = DEFAULT_LOCALE;
    return cached;
  }
}

export async function setLocale(locale: Locale): Promise<void> {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  cached = locale;
  try {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Best effort
  }
}

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

// Synchronous t() — assumes loadLocale() has been awaited at app boot.
// Falls back to DEFAULT_LOCALE before the boot completes; this keeps call
// sites simple at the cost of a single render with English on first paint.
export function t(key: string, vars?: Record<string, string | number>): string {
  const loc = cached || DEFAULT_LOCALE;
  const localized = getPath(CATALOGS[loc], key);
  if (localized) return interpolate(localized, vars);
  const fallback = getPath(CATALOGS[DEFAULT_LOCALE], key);
  if (fallback) return interpolate(fallback, vars);
  return key;
}
