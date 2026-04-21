// Server-side fetch helper — used in Server Components for generateMetadata,
// sitemap generation, etc. Falls back gracefully if the backend is unreachable.

const DEFAULT_URL = 'http://localhost:3001/api';

export function getServerApiUrl(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    DEFAULT_URL
  );
}

export async function serverFetch<T>(
  path: string,
  options?: { revalidate?: number }
): Promise<T | null> {
  try {
    const base = getServerApiUrl();
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      next: { revalidate: options?.revalidate ?? 300 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://morlo.ai';
}
