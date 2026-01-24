// Multi-currency and Multi-language Support
// Enterprise-grade internationalization for global business

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Exchange rate relative to USD
  locale: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0, locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92, locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79, locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 149.50, locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.24, locale: 'zh-CN' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.12, locale: 'hi-IN' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.52, locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.35, locale: 'en-CA' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', rate: 0.88, locale: 'de-CH' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 4.97, locale: 'pt-BR' },
];

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

interface InternationalizationState {
  currency: Currency;
  language: Language;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: 'comma' | 'period' | 'space';
  setCurrency: (currency: Currency) => void;
  setLanguage: (language: Language) => void;
  setTimezone: (timezone: string) => void;
  setDateFormat: (format: string) => void;
  setTimeFormat: (format: '12h' | '24h') => void;
  setNumberFormat: (format: 'comma' | 'period' | 'space') => void;
}

export const useInternationalization = create<InternationalizationState>()(
  persist(
    (set) => ({
      currency: SUPPORTED_CURRENCIES[0],
      language: SUPPORTED_LANGUAGES[0],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      numberFormat: 'comma',
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
      setTimezone: (timezone) => set({ timezone }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
    }),
    {
      name: 'kairux-i18n',
    }
  )
);

// Utility functions
export function formatCurrency(
  amount: number,
  currency?: Currency,
  showSymbol: boolean = true
): string {
  const curr = currency || useInternationalization.getState().currency;

  const formatted = new Intl.NumberFormat(curr.locale, {
    style: 'currency',
    currency: curr.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return showSymbol ? formatted : formatted.replace(/[^\d.,]/g, '').trim();
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const from = SUPPORTED_CURRENCIES.find(c => c.code === fromCurrency);
  const to = SUPPORTED_CURRENCIES.find(c => c.code === toCurrency);

  if (!from || !to) return amount;

  // Convert to USD first, then to target currency
  const usdAmount = amount / from.rate;
  return usdAmount * to.rate;
}

export function formatNumber(
  value: number,
  decimals: number = 2
): string {
  const { numberFormat, language } = useInternationalization.getState();

  return new Intl.NumberFormat(language.code, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(
  date: Date | string,
  format?: string
): string {
  const { language, dateFormat } = useInternationalization.getState();
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(language.code, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatDateTime(
  date: Date | string
): string {
  const { language, timeFormat } = useInternationalization.getState();
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(language.code, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(d);
}

export function formatTime(
  date: Date | string
): string {
  const { language, timeFormat } = useInternationalization.getState();
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(language.code, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: timeFormat === '12h',
  }).format(d);
}

// Translation system (simplified - in production use i18next or similar)
const translations: Record<string, Record<string, string>> = {
  en: {
    'dashboard': 'Dashboard',
    'revenue': 'Revenue',
    'customers': 'Customers',
    'orders': 'Orders',
    'products': 'Products',
    'settings': 'Settings',
    'logout': 'Logout',
    'welcome': 'Welcome back',
    'loading': 'Loading',
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'add': 'Add',
    'search': 'Search',
  },
  es: {
    'dashboard': 'Panel',
    'revenue': 'Ingresos',
    'customers': 'Clientes',
    'orders': 'Pedidos',
    'products': 'Productos',
    'settings': 'Configuración',
    'logout': 'Cerrar sesión',
    'welcome': 'Bienvenido',
    'loading': 'Cargando',
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar',
    'add': 'Añadir',
    'search': 'Buscar',
  },
  // Add more languages...
};

export function translate(key: string, fallback?: string): string {
  const { language } = useInternationalization.getState();
  return translations[language.code]?.[key] || fallback || key;
}

export const t = translate;
