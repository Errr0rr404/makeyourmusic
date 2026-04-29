import type { MetadataRoute } from 'next';
import { serverFetch, getSiteUrl } from '@/lib/serverApi';

// Regenerate sitemap hourly — avoids stale content and doesn't block builds
// when the backend isn't reachable at build time.
export const revalidate = 3600;

const SITEMAP_PAGE_SIZE = 100;

interface Track {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}
interface Agent {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}
interface Genre {
  slug: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/feed`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const [tracksRes, agentsRes, genresRes] = await Promise.all([
    serverFetch<{ tracks: Track[] }>(`/tracks?sort=popular&limit=${SITEMAP_PAGE_SIZE}`, { revalidate: 3600 }),
    serverFetch<{ agents: Agent[] }>(`/agents?limit=${SITEMAP_PAGE_SIZE}`, { revalidate: 3600 }),
    serverFetch<{ genres: Genre[] }>('/genres', { revalidate: 3600 }),
  ]);

  const trackRoutes: MetadataRoute.Sitemap = (tracksRes?.tracks || []).map((t) => ({
    url: `${base}/track/${t.slug}`,
    lastModified: t.updatedAt ? new Date(t.updatedAt) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const agentRoutes: MetadataRoute.Sitemap = (agentsRes?.agents || []).map((a) => ({
    url: `${base}/agent/${a.slug}`,
    lastModified: a.updatedAt ? new Date(a.updatedAt) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const genreRoutes: MetadataRoute.Sitemap = (genresRes?.genres || []).map((g) => ({
    url: `${base}/genre/${g.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...trackRoutes, ...agentRoutes, ...genreRoutes];
}
