'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { SplashLoader } from '@/components/SplashLoader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { TrendingUp, Sparkles, Clock, ChevronRight, AlertCircle, Music2, Play, Volume2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [error, setError] = useState<string | null>(null);
  const [isSplashComplete, setIsSplashComplete] = useState(() => {
    // Only show splash once per session
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('morlo-splash-shown') === '1';
    }
    return false;
  });

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendingRes, latestRes, genresRes] = await Promise.allSettled([
        api.get('/tracks/trending'),
        api.get('/tracks?sort=newest&limit=12'),
        api.get('/genres'),
      ]);
      const fulfilled = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' ? r.value : null;
      const anyFailed =
        [trendingRes, latestRes, genresRes].some((r) => r.status === 'rejected');

      setTrending(fulfilled(trendingRes)?.data.tracks || []);
      setLatest(fulfilled(latestRes)?.data.tracks || []);
      setGenres(fulfilled(genresRes)?.data.genres || []);

      if (anyFailed && [trendingRes, latestRes, genresRes].every((r) => r.status === 'rejected')) {
        setError('Could not load content. Check your connection and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const hasContent = trending.length > 0 || latest.length > 0;

  return (
    <div className="space-y-12 pb-20 selection:bg-blue-500/30">
      <AnimatePresence>
        {!isSplashComplete && (
          <SplashLoader
            logo="/icon.png"
            appName="Morlo"
            color="#3b82f6"
            onComplete={() => {
              sessionStorage.setItem('morlo-splash-shown', '1');
              setIsSplashComplete(true);
            }}
          />
        )}
      </AnimatePresence>


      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            onClick={loadContent}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <OnboardingBanner />

      {loading ? (
        <div className="space-y-8 animate-fade-in">
          <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Premium Hero Section */}
          {!hasContent && (
            <section className="relative overflow-hidden rounded-[40px] bg-slate-900/40 border border-white/5 p-12 md:p-20 mb-8 backdrop-blur-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/5" />
              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Sparkles size={14} />
                    Next-Gen Audio Synthesis
                  </motion.div>
                  <h1 className="text-7xl font-outfit font-black tracking-tighter leading-none text-white">
                    Sonics <br /> <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Reimagined</span>
                  </h1>
                  <p className="text-xl text-white/40 max-w-lg font-medium leading-relaxed">
                    Experience the world's first autonomous music engine. Morlo orchestrates infinite soundscapes through neural-link architecture.
                  </p>
                  <div className="flex gap-4">
                    <Link
                      href="/search"
                      className="btn-action"
                    >
                      <Play size={16} className="mr-2" /> Start Listening
                    </Link>
                    <Link
                      href="/register"
                      className="btn-premium"
                    >
                      <Zap size={16} /> Create Account
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
                  <div className="relative aspect-square glass-card flex items-center justify-center p-12 group">
                    <div className="relative">
                      <Music2 size={120} className="text-white/5 animate-pulse group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Volume2 size={40} className="text-blue-500 shadow-[0_0_20px_#3b82f6]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-outfit font-black tracking-tight text-white uppercase tracking-widest">Trending Now</h2>
                </div>
                <Link href="/search?sort=popular" className="btn-premium">
                  See all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {trending.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} tracks={trending} />
                ))}
              </div>
            </section>
          )}

          {/* Latest Releases */}
          {latest.length > 0 && (
            <section className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-outfit font-black tracking-tight text-white uppercase tracking-widest">Latest Releases</h2>
                </div>
                <Link href="/search?sort=newest" className="btn-premium">
                  See all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {latest.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} tracks={latest} />
                ))}
              </div>
            </section>
          )}

          {/* Browse by Genre */}
          {genres.length > 0 && (
            <section className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-outfit font-black tracking-tight text-white uppercase tracking-widest opacity-40">Sonic Architectures</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {genres.map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/${genre.slug}`}
                    className="group relative h-40 rounded-[32px] holographic border border-white/5 transition-all hover:border-white/20 flex flex-col justify-end p-8"
                  >
                    <div
                      className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                      style={{ background: `radial-gradient(circle at center, ${genre.color || '#3b82f6'}, transparent)` }}
                    />
                    <div className="relative z-10">
                      <h3 className="text-2xl font-outfit font-black text-white mb-1 group-hover:translate-x-1 transition-transform">{genre.name}</h3>
                      <div className="flex items-center gap-4">
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">{genre._count.tracks} Tracks</p>
                        <div className="h-[1px] flex-1 bg-white/5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
