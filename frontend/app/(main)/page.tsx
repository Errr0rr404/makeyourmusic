'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AxiosResponse } from 'axios';
import type { Track } from '@makeyourmusic/shared';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { VibePromptTile } from '@/components/VibePromptTile';
import { LandingPage } from '@/components/landing/LandingPage';
import { useAuthStore } from '@/lib/store/authStore';
import {
  TrendingUp, Sparkles, Clock, ChevronRight, AlertCircle,
  Music2, Radio,
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

  // Unauthenticated visitors get the public landing page.
  if (!isAuthenticated) return <LandingPage />;

  return <AuthenticatedHome user={user} />;
}

function AuthenticatedHome({ user }: { user: ReturnType<typeof useAuthStore.getState>['user'] }) {
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

      const [trendingResult, latestResult, genresResult, recommendationsResult, historyResult] =
        await Promise.allSettled([
          api.get<{ tracks: Track[] }>('/tracks/trending'),
          api.get<{ tracks: Track[] }>('/tracks?sort=newest&limit=12'),
          api.get<{ genres: Genre[] }>('/genres'),
          api.get<{ tracks: Track[] }>('/tracks/recommendations?limit=12'),
          api.get<{ tracks: Track[] }>('/tracks/history?limit=8'),
        ]);

      setTrending(getData(trendingResult)?.tracks || []);
      setLatest(getData(latestResult)?.tracks || []);
      setGenres(getData(genresResult)?.genres || []);
      setForYou(getData(recommendationsResult)?.tracks || []);
      setHistory(getData(historyResult)?.tracks || []);

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
     
  }, []);

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
    <div className="space-y-8 sm:space-y-12 pb-12">
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

      {/* Hero — personalized greeting + vibe prompt */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0" style={{ background: 'var(--hero-gradient), var(--hero-overlay)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, var(--bg-elev-1) 100%)' }} />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'var(--hero-grid)',
            backgroundSize: '42px 42px',
            maskImage: 'linear-gradient(90deg, transparent 0%, black 18%, black 82%, transparent 100%)',
          }}
        />
        <div className="relative grid gap-6 p-5 sm:gap-8 sm:p-6 md:p-10 lg:p-12">
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
          <div className="min-w-0 max-w-2xl">
            <VibePromptTile />
          </div>
        </div>
      </section>

      <OnboardingBanner />

      {loading ? (
        <section>
          <div className="h-8 w-56 rounded-md bg-white/5 mb-5 shimmer" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </section>
      ) : (
        <>
          {history.length > 0 && (
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

          {forYou.length > 0 && (
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
                        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-lg opacity-50 group-hover:opacity-80 transition-opacity"
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
        </>
      )}
    </div>
  );
}
