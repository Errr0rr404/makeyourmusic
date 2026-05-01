/**
 * Portable utility functions shared between web and mobile.
 * No DOM or React Native dependencies — pure TypeScript.
 */

export function formatDuration(seconds: number): string {
  // <audio>.duration is fractional and can be NaN/Infinity for streaming
  // sources or before metadata loads. Clamp to a safe non-negative integer
  // before formatting so we never emit "1:15.7" or "-1:55".
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 0) return '0';
  // Bump unit when the rounded result reaches the next threshold so 999_999
  // formats as "1.0M" instead of the previous bug-prone "1000.0K".
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}B`;
    return `${v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}M`;
    return `${v.toFixed(1)}K`;
  }
  return n.toString();
}

export function slugify(text: string): string {
  // NFKD-normalize so accented Latin (Café → Cafe), Greek, Cyrillic, CJK,
  // Hangul, etc. carry into the slug instead of being stripped. The previous
  // \w-only regex also tripped the Turkish I bug under non-en locales — we
  // pin toLocaleLowerCase('en-US') to avoid that.
  if (!text) return '';
  let normalized = text.normalize('NFKD');
  // Strip combining diacritics so "Café" → "Cafe"; preserve everything else
  // matching Unicode letter / number.
  normalized = normalized.replace(/\p{M}+/gu, '');
  return normalized
    .toLocaleLowerCase('en-US')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  // Bare-date strings ('2026-04-30') are parsed as midnight UTC, which means
  // a user west of UTC sees the previous day. Treat bare dates as UTC and
  // pass timeZone:'UTC' so the formatted day stays stable; full ISO inputs
  // (with time + zone) keep their original semantics.
  let d: Date;
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      d = new Date(`${date}T12:00:00Z`);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
        ...options,
      }).format(d);
    }
    d = new Date(date);
  } else {
    d = date;
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d);
}

export function truncateText(text: string, maxLength: number): string {
  // Slice in code points (not UTF-16 code units) so emoji / non-BMP CJK don't
  // produce a lone surrogate when truncated mid-character.
  if (!text) return text;
  const codePoints = Array.from(text);
  if (codePoints.length <= maxLength) return text;
  return codePoints.slice(0, maxLength).join('').trim() + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}
