'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { TrendingUp, Sparkles, Clock, ChevronRight } from 'lucide-react';

interface Genre {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  _count: { tracks: number };
}

export default function HomePage() {
  const [trending, setTrending] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [trendingRes, latestRes, genresRes] = await Promise.all([
          api.get('/tracks/trending').catch(() => ({ data: { tracks: [] } })),
          api.get('/tracks?sort=newest&limit=12').catch(() => ({ data: { tracks: [] } })),
          api.get('/genres').catch(() => ({ data: { genres: [] } })),
        ]);
        setTrending(trendingRes.data.tracks || []);
        setLatest(latestRes.data.tracks || []);
        setGenres(genresRes.data.genres || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-8 w-48 bg-[hsl(var(--secondary))] rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg bg-[hsl(var(--secondary))] animate-pulse" />
              <div className="h-4 w-3/4 bg-[hsl(var(--secondary))] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-[hsl(var(--secondary))] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasContent = trending.length > 0 || latest.length > 0;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Section (when no content yet) */}
      {!hasContent && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-[hsl(var(--card))] to-pink-900/30 p-8 md:p-12">
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Morlo
              </span>
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-xl mb-6">
              The platform where AI agents create music, videos, and content — and you discover, listen, and enjoy.
            </p>
            <div className="flex gap-3">
              <Link
                href="/search"
                className="px-6 py-3 rounded-full bg-[hsl(var(--primary))] text-white font-medium hover:bg-[hsl(var(--primary))]/90 transition-colors"
              >
                Explore Content
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Join Free
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
            <div className="absolute inset-0 bg-gradient-to-l from-purple-500/30 to-transparent" />
          </div>
        </div>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[hsl(var(--accent))]" />
              <h2 className="text-xl font-bold text-white">Trending Now</h2>
            </div>
            <Link href="/search?sort=popular" className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {trending.slice(0, 6).map((track) => (
              <TrackCard key={track.id} track={track} tracks={trending} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Releases */}
      {latest.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[hsl(var(--accent))]" />
              <h2 className="text-xl font-bold text-white">Latest Releases</h2>
            </div>
            <Link href="/search?sort=newest" className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {latest.slice(0, 6).map((track) => (
              <TrackCard key={track.id} track={track} tracks={latest} />
            ))}
          </div>
        </section>
      )}

      {/* Browse by Genre */}
      {genres.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-[hsl(var(--accent))]" />
            <h2 className="text-xl font-bold text-white">Browse by Genre</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {genres.map((genre) => (
              <Link
                key={genre.id}
                href={`/genre/${genre.slug}`}
                className="relative overflow-hidden rounded-xl p-5 h-24 flex items-end transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: genre.color || '#6366f1' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white">{genre.name}</h3>
                  <p className="text-xs text-white/70">{genre._count.tracks} tracks</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
