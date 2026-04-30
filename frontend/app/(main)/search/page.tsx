'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { AgentCard } from '@/components/agent/AgentCard';
import { Search, AlertCircle } from 'lucide-react';
import type { Agent, Track } from '@makeyourmusic/shared';

function getSearchError(err: unknown): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return 'Search failed. Please try again.';
  }
  const response = (err as { response?: { data?: { error?: unknown } } }).response;
  return typeof response?.data?.error === 'string'
    ? response.data.error
    : 'Search failed. Please try again.';
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    ((err as { name?: unknown }).name === 'CanceledError' ||
      (err as { name?: unknown }).name === 'AbortError')
  );
}

interface GenreOption {
  id: string;
  name: string;
  slug: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'newest';
  const genre = searchParams.get('genre') || '';

  const [tracks, setTracks] = useState<Track[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [tab, setTab] = useState<'tracks' | 'agents'>('tracks');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch genres once
  useEffect(() => {
    api.get('/genres').then((res) => setGenres(res.data.genres || [])).catch(() => {});
  }, []);

  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function search() {
      setLoading(true);
      setError(null);
      try {
        const [tracksRes, agentsRes] = await Promise.all([
          api.get('/tracks', { params: { search: q, sort, genre, limit: 30 }, signal: controller.signal }),
          api.get('/agents', { params: { search: q, limit: 20 }, signal: controller.signal }),
        ]);
        if (!controller.signal.aborted) {
          setTracks(tracksRes.data.tracks || []);
          setAgents(agentsRes.data.agents || []);
        }
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        setError(getSearchError(err));
      }
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
    search();
    return () => controller.abort();
  }, [q, sort, genre, retryNonce]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[color:var(--text)]">
          {q ? <>Results for <span className="text-[color:var(--brand)]">&ldquo;{q}&rdquo;</span></> : 'Browse'}
        </h1>
        {q && !loading && (
          <span className="text-sm text-[color:var(--text-mute)]">
            {tracks.length + agents.length} match{tracks.length + agents.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" role="tablist">
        <button onClick={() => setTab('tracks')}
          role="tab"
          aria-selected={tab === 'tracks'}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'tracks'
            ? 'bg-[color:var(--brand)] text-white shadow-lg shadow-[color:var(--brand-glow)]'
            : 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)]'}`}>
          Tracks{!loading && tracks.length > 0 ? ` · ${tracks.length}` : ''}
        </button>
        <button onClick={() => setTab('agents')}
          role="tab"
          aria-selected={tab === 'agents'}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'agents'
            ? 'bg-[color:var(--brand)] text-white shadow-lg shadow-[color:var(--brand-glow)]'
            : 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)]'}`}>
          Agents{!loading && agents.length > 0 ? ` · ${agents.length}` : ''}
        </button>
      </div>

      {/* Sort & Genre Filter (for tracks) */}
      {tab === 'tracks' && (
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {([
              ['newest', 'Newest'],
              ['popular', 'Most played'],
              ['liked', 'Most liked'],
            ] as const).map(([val, label]) => {
              const params = new URLSearchParams();
              if (q) params.set('q', q);
              params.set('sort', val);
              if (genre) params.set('genre', genre);
              const isActive = sort === val;
              return (
                <a key={val} href={`/search?${params.toString()}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isActive
                    ? 'bg-[color:var(--text)] text-[color:var(--bg)]'
                    : 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)]'}`}>
                  {label}
                </a>
              );
            })}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <a href={`/search?${new URLSearchParams({ ...(q ? { q } : {}), sort }).toString()}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!genre
                  ? 'bg-[color:var(--brand-soft)] text-[color:var(--brand)] border border-[color:var(--brand)]/40'
                  : 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] border border-transparent'}`}>
                All genres
              </a>
              {genres.map((g) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                params.set('sort', sort);
                params.set('genre', g.slug);
                const isActive = genre === g.slug;
                return (
                  <a key={g.id} href={`/search?${params.toString()}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isActive
                      ? 'bg-[color:var(--brand-soft)] text-[color:var(--brand)] border border-[color:var(--brand)]/40'
                      : 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] border border-transparent'}`}>
                    {g.name}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-rose-400 mb-4">{error}</p>
          <button onClick={() => setRetryNonce((n) => n + 1)} className="text-[color:var(--brand)] hover:underline">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg bg-[color:var(--bg-elev-2)] shimmer" />
              <div className="h-4 w-3/4 bg-[color:var(--bg-elev-2)] rounded shimmer" />
            </div>
          ))}
        </div>
      ) : tab === 'tracks' ? (
        tracks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} tracks={tracks} />
            ))}
          </div>
        ) : (
          <SearchEmpty query={q} kind="tracks" />
        )
      ) : (
        agents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <SearchEmpty query={q} kind="agents" />
        )
      )}
    </div>
  );
}

function SearchEmpty({ query, kind }: { query: string; kind: 'tracks' | 'agents' }) {
  return (
    <div className="text-center py-16 rounded-2xl bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)]">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-[color:var(--bg-elev-2)]">
        <Search className="w-6 h-6 text-[color:var(--text-mute)]" />
      </div>
      <h2 className="text-lg font-bold text-[color:var(--text)] mb-1">
        {query ? `No ${kind} match "${query}"` : `Search for ${kind}`}
      </h2>
      <p className="text-sm text-[color:var(--text-mute)] max-w-sm mx-auto">
        {query
          ? 'Try a different keyword or remove a filter.'
          : `Type something into the search bar above to discover ${kind} on MakeYourMusic.`}
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="animate-pulse"><div className="h-8 w-48 bg-[hsl(var(--secondary))] rounded mb-6" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
