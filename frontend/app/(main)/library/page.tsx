'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackRow } from '@/components/track/TrackRow';
import { Heart, ListMusic, Lock, AlertCircle, Clock, Sparkles, Music } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/store/toastStore';

type Tab = 'liked' | 'playlists' | 'history' | 'foryou';

// Sidebar uses `?tab=likes` and the home page uses `?tab=foryou`/`?tab=history`.
// Map each accepted alias to a canonical Tab so external links resolve to the
// right pane regardless of how they spell it.
const TAB_ALIAS: Record<string, Tab> = {
  likes: 'liked',
  liked: 'liked',
  playlists: 'playlists',
  history: 'history',
  foryou: 'foryou',
  'for-you': 'foryou',
};

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = TAB_ALIAS[searchParams.get('tab') ?? ''] ?? 'liked';
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Keep the active tab in sync if the URL changes (back/forward, sidebar click).
  // Depend on the serialized querystring rather than the URLSearchParams object
  // reference — the latter is a fresh instance on every render, so the effect
  // re-ran on every render even when the URL didn't change.
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    const next = TAB_ALIAS[searchParams.get('tab') ?? ''];
    if (next && next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  const switchTab = (next: Tab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/library?${params.toString()}`, { scroll: false });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [likedTracks, setLikedTracks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [playlists, setPlaylists] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [historyTracks, setHistoryTracks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [forYouTracks, setForYouTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [likesRes, playlistsRes, historyRes, forYouRes] = await Promise.allSettled([
        api.get('/social/likes'),
        api.get('/social/playlists/mine'),
        api.get('/tracks/history?limit=30'),
        api.get('/tracks/recommendations?limit=20'),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ok = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null;
      setLikedTracks(ok(likesRes)?.data?.tracks || []);
      setPlaylists(ok(playlistsRes)?.data?.playlists || []);
      setHistoryTracks(ok(historyRes)?.data?.tracks || []);
      setForYouTracks(ok(forYouRes)?.data?.tracks || []);

      if ([likesRes, playlistsRes].every((r) => r.status === 'rejected')) {
        const firstFailure = likesRes.status === 'rejected' ? (likesRes.reason as { response?: { data?: { error?: string } } }) : null;
        setError(firstFailure?.response?.data?.error || 'Failed to load library');
      }
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon={<Lock className="w-10 h-10" />}
          title="Your Library is private"
          body="Log in to see your liked songs, playlists, and listening history."
          cta={{ href: '/login', label: 'Log in' }}
        />
      </div>
    );
  }

  const handleLike = async (trackId: string) => {
    try {
      const res = await api.post(`/social/likes/${trackId}`);
      if (!res.data.liked) {
        setLikedTracks(prev => prev.filter(t => t.id !== trackId));
      }
      toast.success(res.data.liked ? 'Added to liked tracks' : 'Removed from liked tracks');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update like');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'liked', label: 'Liked Songs', icon: <Heart className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
    { id: 'foryou', label: 'For You', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'playlists', label: 'Playlists', icon: <ListMusic className="w-4 h-4" /> },
  ];

  const counts: Record<Tab, number> = {
    liked: likedTracks.length,
    history: historyTracks.length,
    foryou: forYouTracks.length,
    playlists: playlists.length,
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[color:var(--text)] mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] ${
              tab === t.id
                ? 'bg-[color:var(--brand)] text-white shadow-lg shadow-[color:var(--brand-glow)]'
                : 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)]'
            }`}
          >
            {t.icon} {t.label}
            {!loading && counts[t.id] > 0 && (
              <span className={`ml-1 text-[10px] tabular-nums opacity-70`}>{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="underline hover:text-rose-300">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-[color:var(--bg-elev-2)] rounded-lg shimmer" />
          ))}
        </div>
      ) : tab === 'liked' ? (
        likedTracks.length > 0 ? (
          <div className="space-y-1">
            {likedTracks.map((track, i) => (
              <TrackRow key={track.id} track={{ ...track, isLiked: true }} index={i} tracks={likedTracks} onLike={handleLike} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Heart className="w-10 h-10" />}
            title="No liked songs yet"
            body="Tap the heart on any track to save it here."
            cta={{ href: '/search', label: 'Browse music' }}
          />
        )
      ) : tab === 'history' ? (
        historyTracks.length > 0 ? (
          <div className="space-y-1">
            {historyTracks.map((track, i) => (
              <TrackRow key={`${track.id}-${i}`} track={track} index={i} tracks={historyTracks} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Clock className="w-10 h-10" />}
            title="No listening history yet"
            body="Play a few tracks and they'll show up here."
            cta={{ href: '/', label: 'Discover tracks' }}
          />
        )
      ) : tab === 'foryou' ? (
        forYouTracks.length > 0 ? (
          <div className="space-y-1">
            {forYouTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} tracks={forYouTracks} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles className="w-10 h-10" />}
            title="We're still learning your taste"
            body="Like a few tracks and we'll start tailoring recommendations."
            cta={{ href: '/search', label: 'Browse music' }}
          />
        )
      ) : (
        <div>
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.map((pl) => (
                <PlaylistTile key={pl.id} playlist={pl} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ListMusic className="w-10 h-10" />}
              title="No playlists yet"
              body="Tap the + in the sidebar to create your first playlist."
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

interface PlaylistRecord {
  id: string;
  slug: string;
  title: string;
  coverArt?: string | null;
  // Some endpoints return a tracks preview; we use it for stacked covers.
  tracks?: { track?: { coverArt?: string | null } }[];
  _count?: { tracks: number };
}

function PlaylistTile({ playlist }: { playlist: PlaylistRecord }) {
  // Build up to four cover thumbnails from the playlist's items so the tile
  // looks like a small mosaic when there's no dedicated cover. Falls back to
  // the brand aurora gradient + icon when the playlist is empty.
  const previewCovers: string[] = [];
  if (playlist.tracks?.length) {
    for (const item of playlist.tracks) {
      const cover = item?.track?.coverArt;
      if (cover && !previewCovers.includes(cover)) previewCovers.push(cover);
      if (previewCovers.length >= 4) break;
    }
  }
  const trackCount = playlist._count?.tracks ?? 0;

  return (
    <Link
      href={`/playlist/${playlist.slug}`}
      className="group block p-3 rounded-xl bg-[color:var(--bg-elev-2)] hover:bg-[color:var(--bg-elev-3)] transition-colors"
    >
      <div className="aspect-square rounded-lg mb-3 overflow-hidden relative bg-[color:var(--bg-elev-3)]">
        {playlist.coverArt ? (
          <img src={playlist.coverArt} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : previewCovers.length >= 2 ? (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {[0, 1, 2, 3].map((i) => {
              const url = previewCovers[i] ?? previewCovers[i % previewCovers.length];
              return url ? (
                <img key={i} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div key={i} className="w-full h-full" style={{ background: 'var(--aurora)', opacity: 0.5 }} />
              );
            })}
          </div>
        ) : previewCovers[0] ? (
          <img src={previewCovers[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--aurora)', opacity: 0.55 }}>
            <ListMusic className="w-10 h-10 text-white/80" />
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-[color:var(--text)] truncate">{playlist.title}</h3>
      <p className="text-xs text-[color:var(--text-mute)]">
        {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
      </p>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="text-center py-16 rounded-2xl bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)]">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
           style={{ background: 'var(--aurora)', opacity: 0.2 }}>
        <span className="text-[color:var(--brand)]">{icon}</span>
      </div>
      <h2 className="text-lg font-bold text-[color:var(--text)] mb-1">{title}</h2>
      <p className="text-sm text-[color:var(--text-mute)] max-w-sm mx-auto mb-5">{body}</p>
      {cta && (
        <Link href={cta.href} className="mym-cta mym-cta-sm">
          <Music className="w-4 h-4" /> {cta.label}
        </Link>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-[color:var(--bg-elev-2)] rounded mb-6" />
        <div className="h-10 w-64 bg-[color:var(--bg-elev-2)] rounded-full mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-[color:var(--bg-elev-2)] rounded-lg shimmer" />
          ))}
        </div>
      </div>
    }>
      <LibraryContent />
    </Suspense>
  );
}
