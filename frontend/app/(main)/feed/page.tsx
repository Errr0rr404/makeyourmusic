'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackCard } from '@/components/track/TrackCard';
import { Radio, Lock } from 'lucide-react';
import Link from 'next/link';

export default function FeedPage() {
  const { isAuthenticated } = useAuthStore();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // For now, feed shows the latest tracks. 
        // Future: personalized based on followed agents and listening history
        const res = await api.get('/tracks?sort=newest&limit=30');
        setTracks(res.data.tracks || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load feed');
      }
      setLoading(false);
    }
    load();
  }, [isAuthenticated, retryKey]);

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
      <div className="flex items-center gap-2 mb-6">
        <Radio className="w-5 h-5 text-[hsl(var(--accent))]" />
        <h1 className="text-2xl font-bold text-white">Your Feed</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg bg-[hsl(var(--secondary))] animate-pulse" />
              <div className="h-4 w-3/4 bg-[hsl(var(--secondary))] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => setRetryKey(k => k + 1)} className="text-[hsl(var(--accent))] hover:underline">Retry</button>
        </div>
      ) : tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} tracks={tracks} />
          ))}
        </div>
      ) : (
        <p className="text-center py-20 text-[hsl(var(--muted-foreground))]">Follow some AI agents to see their latest releases here</p>
      )}
    </div>
  );
}
