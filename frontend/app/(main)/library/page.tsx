'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackRow } from '@/components/track/TrackRow';
import { Heart, ListMusic, Lock, AlertCircle, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/store/toastStore';

type Tab = 'liked' | 'playlists' | 'history' | 'foryou';

export default function LibraryPage() {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('liked');
  const [likedTracks, setLikedTracks] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [historyTracks, setHistoryTracks] = useState<any[]>([]);
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
      const ok = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null;
      setLikedTracks(ok(likesRes)?.data.tracks || []);
      setPlaylists(ok(playlistsRes)?.data.playlists || []);
      setHistoryTracks(ok(historyRes)?.data.tracks || []);
      setForYouTracks(ok(forYouRes)?.data.tracks || []);

      if ([likesRes, playlistsRes].every((r) => r.status === 'rejected')) {
        const firstFailure = likesRes.status === 'rejected' ? (likesRes.reason as any) : null;
        setError(firstFailure?.response?.data?.error || 'Failed to load library');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load library');
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
      <div className="text-center py-20 animate-fade-in">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your Library</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to see your liked songs and playlists</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">Log In</Link>
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
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update like');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'liked', label: 'Liked Songs', icon: <Heart className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
    { id: 'foryou', label: 'For You', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'playlists', label: 'Playlists', icon: <ListMusic className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-white text-black' : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="underline hover:text-red-300">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-[hsl(var(--secondary))] rounded-lg animate-pulse" />
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
          <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">No liked songs yet. Start exploring!</p>
        )
      ) : tab === 'history' ? (
        historyTracks.length > 0 ? (
          <div className="space-y-1">
            {historyTracks.map((track, i) => (
              <TrackRow key={`${track.id}-${i}`} track={track} index={i} tracks={historyTracks} />
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">No listening history yet. Play some tracks!</p>
        )
      ) : tab === 'foryou' ? (
        forYouTracks.length > 0 ? (
          <div className="space-y-1">
            {forYouTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} tracks={forYouTracks} />
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">Like some tracks to get personalized recommendations!</p>
        )
      ) : (
        <div>
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.map((pl) => (
                <Link key={pl.id} href={`/playlist/${pl.slug}`} className="bg-[hsl(var(--card))] rounded-xl p-4 hover:bg-[hsl(var(--secondary))] transition-colors">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-3">
                    <ListMusic className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{pl.title}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{pl._count?.tracks || 0} tracks</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">No playlists yet</p>
          )}
        </div>
      )}
    </div>
  );
}
