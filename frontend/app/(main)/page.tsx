'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { VibePromptTile } from '@/components/VibePromptTile';
import { useAuthStore } from '@/lib/store/authStore';
import {
  TrendingUp, Sparkles, Clock, ChevronRight, AlertCircle,
  Music2, Play, Wand2, Radio, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

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
          className="hidden sm:inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] hover:text-white transition-colors"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
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
  const [trending, setTrending] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [forYou, setForYou] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseRequests = [
        api.get('/tracks/trending'),
        api.get('/tracks?sort=newest&limit=12'),
        api.get('/genres'),
      ];
      const personalRequests = isAuthenticated
        ? [
            api.get('/tracks/recommendations?limit=12'),
            api.get('/tracks/history?limit=8'),
          ]
        : [];

      const settled = await Promise.allSettled([...baseRequests, ...personalRequests]);
      const fulfilled = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' ? r.value : null;

      setTrending(fulfilled(settled[0]!)?.data.tracks || []);
      setLatest(fulfilled(settled[1]!)?.data.tracks || []);
      setGenres(fulfilled(settled[2]!)?.data.genres || []);
      if (isAuthenticated) {
        setForYou(fulfilled(settled[3]!)?.data.tracks || []);
        setHistory(fulfilled(settled[4]!)?.data.tracks || []);
      } else {
        setForYou([]);
        setHistory([]);
      }

      if (settled.slice(0, 3).every((r) => r.status === 'rejected')) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
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
            background:
              'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(217,70,239,0.28) 50%, rgba(236,72,153,0.18) 100%)',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, var(--bg-elev-1) 100%)' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.45), transparent 70%)' }} />
        <div className="relative p-6 md:p-10 lg:p-12">
          {isAuthenticated ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-sm font-semibold text-white/70 mb-1">{greeting},</p>
              <h1 className="font-display font-extrabold tracking-tight text-3xl md:text-5xl text-white">
                {displayName}.
              </h1>
              <p className="mt-3 text-base md:text-lg text-white/75 max-w-xl">
                Tell us a vibe and we'll build a playlist of AI music — instantly.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold uppercase tracking-widest text-white">
                <Zap className="w-3 h-3" /> AI-generated music
              </span>
              <h1 className="mt-4 font-display font-extrabold tracking-tighter text-4xl md:text-6xl lg:text-7xl text-white leading-[1.05] max-w-3xl">
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

          <div className="mt-6 max-w-2xl">
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
