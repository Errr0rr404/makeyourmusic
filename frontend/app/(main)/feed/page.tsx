'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackCard } from '@/components/track/TrackCard';
import { ClipGrid, type ClipGridItem } from '@/components/clip/ClipGrid';
import { Radio, Lock, Music, Film } from 'lucide-react';
import Link from 'next/link';

type Tab = 'tracks' | 'clips';

export default function FeedPage() {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('tracks');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tracks, setTracks] = useState<any[]>([]);
  const [clips, setClips] = useState<ClipGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (tab === 'tracks') {
          const res = await api.get('/tracks?sort=newest&limit=30', { signal: controller.signal });
          if (controller.signal.aborted) return;
          setTracks(res.data.tracks || []);
        } else {
          const res = await api.get('/clips?feed=trending&limit=24', { signal: controller.signal });
          if (controller.signal.aborted) return;
          setClips(res.data.clips || []);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load feed');
      }
      if (!controller.signal.aborted) setLoading(false);
    }
    load();
    return () => controller.abort();
  }, [isAuthenticated, retryKey, tab]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your Feed</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to see your personalized feed</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">Log In</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-[hsl(var(--accent))]" />
        <h1 className="text-2xl font-bold text-white">Your Feed</h1>
      </div>

      <div className="flex gap-1 mb-5 border-b border-[hsl(var(--border))]">
        <button
          onClick={() => setTab('tracks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'tracks'
              ? 'text-white border-[hsl(var(--accent))]'
              : 'text-[hsl(var(--muted-foreground))] border-transparent hover:text-white'
          }`}
        >
          <Music className="w-4 h-4" /> Tracks
        </button>
        <button
          onClick={() => setTab('clips')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'clips'
              ? 'text-white border-[hsl(var(--accent))]'
              : 'text-[hsl(var(--muted-foreground))] border-transparent hover:text-white'
          }`}
        >
          <Film className="w-4 h-4" /> Clips
        </button>
      </div>

      {loading ? (
        tab === 'tracks' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square rounded-lg bg-[hsl(var(--secondary))] animate-pulse" />
                <div className="h-4 w-3/4 bg-[hsl(var(--secondary))] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-xl bg-[hsl(var(--secondary))] animate-pulse" />
            ))}
          </div>
        )
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => setRetryKey(k => k + 1)} className="text-[hsl(var(--accent))] hover:underline">Retry</button>
        </div>
      ) : tab === 'tracks' ? (
        tracks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} tracks={tracks} />
            ))}
          </div>
        ) : (
          <p className="text-center py-20 text-[hsl(var(--muted-foreground))]">Follow some AI agents to see their latest releases here</p>
        )
      ) : (
        <ClipGrid
          clips={clips}
          showAuthor
          emptyState={
            <>
              <Film className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-50" />
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">No clips yet</p>
              <Link
                href="/create/clip"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium"
              >
                <Film className="w-4 h-4" /> Make the first clip
              </Link>
            </>
          }
        />
      )}
    </div>
  );
}
