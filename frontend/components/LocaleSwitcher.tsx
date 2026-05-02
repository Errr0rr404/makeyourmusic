'use client';

// Tiny locale picker. Writes the cookie that lib/i18n.ts reads, then
// reloads so server-rendered surfaces (sitemap, OG cards, route handlers)
// pick up the new locale on the next request.
//
// Locale catalogs live at frontend/messages/<lang>.json and English is the
// fallback for any missing key — translating a partial set is safe.

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale, getCookieLocale, setLocaleCookie } from '@/lib/i18n';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
};

export function LocaleSwitcher() {
  const [current, setCurrent] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setCurrent(getCookieLocale() || DEFAULT_LOCALE);
  }, []);

  const pick = (locale: Locale) => {
    setLocaleCookie(locale);
    setCurrent(locale);
    // Hard reload so any server-side rendered text re-resolves.
    if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <span className="text-sm font-medium text-white">Language</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(SUPPORTED_LOCALES as readonly Locale[]).map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => pick(locale)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              current === locale
                ? 'bg-purple-500 border-purple-500 text-white'
                : 'bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}
          >
            {LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
