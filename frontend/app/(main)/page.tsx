'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AxiosResponse } from 'axios';
import type { Track } from '@makeyourmusic/shared';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { VibePromptTile } from '@/components/VibePromptTile';
import { useAuthStore } from '@/lib/store/authStore';
import {
  TrendingUp, Sparkles, Clock, ChevronRight, AlertCircle,
  Music2, Play, Wand2, Radio, Zap,
} from 'lucide-react';
import { motion } from 'motion/react';

interface Genre {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  _count: { tracks: number };
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ReactNode;
}

function SectionHeader({ title, subtitle, href, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {icon && <span className="text-[color:var(--brand)]">{icon}</span>}
          <h2 className="mym-section-title">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-[color:var(--text-mute)]">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          aria-label={`See all ${title}`}
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] hover:text-white transition-colors whitespace-nowrap"
        >
          <span className="hidden sm:inline">See all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-[color:var(--bg-elev-2)]">
      <div className="aspect-square rounded-lg bg-white/5 mb-3 shimmer" />
      <div className="h-3.5 w-3/4 rounded bg-white/5 mb-2 shimmer" />
      <div className="h-3 w-1/2 rounded bg-white/5 shimmer" />
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [trending, setTrending] = useState<Track[]>([]);
  const [latest, setLatest] = useState<Track[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [forYou, setForYou] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const getData = <T,>(result: PromiseSettledResult<AxiosResponse<T>>) =>
        result.status === 'fulfilled' ? result.value.data : null;

      const [trendingResult, latestResult, genresResult] = await Promise.allSettled([
        api.get<{ tracks: Track[] }>('/tracks/trending'),
        api.get<{ tracks: Track[] }>('/tracks?sort=newest&limit=12'),
        api.get<{ genres: Genre[] }>('/genres'),
      ]);

      setTrending(getData(trendingResult)?.tracks || []);
      setLatest(getData(latestResult)?.tracks || []);
      setGenres(getData(genresResult)?.genres || []);

      if (isAuthenticated) {
        const [recommendationsResult, historyResult] = await Promise.allSettled([
          api.get<{ tracks: Track[] }>('/tracks/recommendations?limit=12'),
          api.get<{ tracks: Track[] }>('/tracks/history?limit=8'),
        ]);
        setForYou(getData(recommendationsResult)?.tracks || []);
        setHistory(getData(historyResult)?.tracks || []);
      } else {
        setForYou([]);
        setHistory([]);
      }

      if ([trendingResult, latestResult, genresResult].every((r) => r.status === 'rejected')) {
        setError('Could not load content. Check your connection and try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Compute greeting after mount so the server-rendered HTML doesn't
  // disagree with the client's local hour. SSR happens in the server's
  // timezone; the client renders in the visitor's timezone; if the two
  // straddle a noon/6pm boundary the React hydration warning fires. Empty
  // string on first paint is harmless — the hero hides until authed.
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);
  const displayName = user?.displayName || user?.username || 'there';

  return (
    <div className="space-y-12 pb-12">
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
          <button
            onClick={loadContent}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'linear-gradient(135deg, rgba(139,92,246,0.38) 0%, rgba(217,70,239,0.24) 48%, rgba(20,184,166,0.14) 100%)',
              'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 48%)',
            ].join(', '),
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, var(--bg-elev-1) 100%)' }} />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
            maskImage: 'linear-gradient(90deg, transparent 0%, black 18%, black 82%, transparent 100%)',
          }}
        />
        <div className="relative grid gap-6 p-5 sm:gap-8 sm:p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:p-12">
          {isAuthenticated ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="min-w-0"
            >
              <p className="text-sm font-semibold text-white/70 mb-1">{greeting},</p>
              <h1 className="font-display font-extrabold tracking-tight text-3xl md:text-5xl text-white">
                {displayName}.
              </h1>
              <p className="mt-3 text-base md:text-lg text-white/75 max-w-xl">
                Tell us a vibe and we will build a playlist of AI music — instantly.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="min-w-0"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold uppercase tracking-widest text-white">
                <Zap className="w-3 h-3" /> AI-generated music
              </span>
              <h1 className="mt-4 font-display font-extrabold tracking-tighter text-[2.6rem] md:text-6xl lg:text-7xl text-white leading-[1.05] max-w-3xl">
                Sound that <span className="aurora-text">writes itself.</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-white/75 max-w-xl">
                Discover tracks crafted by AI agents. Hit play, ride the algorithm.
              </p>
              <div className="mt-6 flex gap-3">
                <Link href="/search" className="mym-cta">
                  <Play className="w-4 h-4" fill="currentColor" /> Start listening
                </Link>
                <Link href="/register" className="mym-ghost">
                  Sign up free
                </Link>
              </div>
            </motion.div>
          )}

          <div className="hidden lg:block relative">
            <div className="rounded-2xl border border-white/15 bg-black/25 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Agent session</p>
                  <p className="mt-1 text-sm font-bold text-white">Midnight Lo-Fi Engine</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-400/15 text-teal-200">
                  <Radio className="w-4 h-4" />
                </span>
              </div>

              <div className="rounded-xl bg-white/[0.06] p-4">
                <div className="flex items-end gap-1 h-24">
                  {Array.from({ length: 34 }).map((_, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${24 + ((i * 17) % 68)}%`,
                        background: i % 5 === 0 ? '#2dd4bf' : i % 3 === 0 ? '#f472b6' : '#a78bfa',
                        opacity: 0.72,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  ['01', 'Rain on Neon Glass', 'cinematic synthwave'],
                  ['02', 'Coffee After Orbit', 'mellow jazz'],
                  ['03', 'Focus Loop 88', 'lo-fi with rain'],
                ].map(([number, title, mood]) => (
                  <div key={title} className="flex items-center gap-3 rounded-lg bg-white/[0.055] px-3 py-2.5">
                    <span className="text-xs tabular-nums text-white/35">{number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{title}</span>
                      <span className="block truncate text-[11px] text-white/45">{mood}</span>
                    </span>
                    <span className="flex gap-0.5">
                      <span className="eq-bar" />
                      <span className="eq-bar" />
                      <span className="eq-bar" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 max-w-2xl lg:col-span-2">
            <VibePromptTile />
          </div>
        </div>
      </section>

      <OnboardingBanner />

      {/* Loading state */}
      {loading ? (
        <div className="space-y-12">
          <section>
            <div className="h-8 w-56 rounded-md bg-white/5 mb-5 shimmer" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* Jump back in (history) */}
          {isAuthenticated && history.length > 0 && (
            <section>
              <SectionHeader
                title="Jump back in"
                subtitle="Pick up where you left off"
                href="/library?tab=history"
                icon={<Clock className="w-5 h-5" />}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {history.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} tracks={history} />
                ))}
              </div>
            </section>
          )}

          {/* Made for You */}
          {isAuthenticated && forYou.length > 0 && (
            <section>
              <SectionHeader
                title="Made for you"
                subtitle="Picks shaped by what you love"
                href="/library?tab=foryou"
                icon={<Sparkles className="w-5 h-5" />}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {forYou.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} tracks={forYou} />
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <section>
              <SectionHeader
                title="Trending now"
                subtitle="Most played this week"
                href="/search?sort=popular"
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {trending.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} tracks={trending} />
                ))}
              </div>
            </section>
          )}

          {/* Latest */}
          {latest.length > 0 && (
            <section>
              <SectionHeader
                title="Fresh drops"
                subtitle="Just published by AI agents"
                href="/search?sort=newest"
                icon={<Music2 className="w-5 h-5" />}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {latest.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} tracks={latest} />
                ))}
              </div>
            </section>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <section>
              <SectionHeader
                title="Browse by mood"
                subtitle="Genre-curated AI sets"
                icon={<Radio className="w-5 h-5" />}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {genres.map((genre, i) => {
                  const color = genre.color || '#d946ef';
                  return (
                    <Link
                      key={genre.id}
                      href={`/genre/${genre.slug}`}
                      className="group relative h-32 md:h-36 rounded-xl overflow-hidden p-5 flex flex-col justify-between transition-transform hover:-translate-y-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${color}88 0%, ${color}22 60%, transparent 100%), var(--bg-elev-2)`,
                      }}
                    >
                      <div
                        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-lg opacity-50 group-hover:opacity-80 transition-opacity rotate-[18deg]"
                        style={{ background: color, transform: `rotate(${(i * 22) % 60 - 18}deg)` }}
                      />
                      <h3 className="relative font-display font-extrabold text-xl md:text-2xl text-white tracking-tight">
                        {genre.name}
                      </h3>
                      <p className="relative text-[11px] font-bold uppercase tracking-widest text-white/70">
                        {genre._count.tracks} tracks
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* CTA for guests */}
          {!isAuthenticated && (
            <section className="rounded-2xl p-8 md:p-12 text-center"
                     style={{ background: 'var(--aurora)' }}>
              <Wand2 className="w-10 h-10 mx-auto mb-4 text-white" />
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                Make your own AI track.
              </h2>
              <p className="mt-2 text-white/85 max-w-xl mx-auto">
                Sign up free to spin up agents, generate music, and publish to listeners worldwide.
              </p>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors"
              >
                Create your free account
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
