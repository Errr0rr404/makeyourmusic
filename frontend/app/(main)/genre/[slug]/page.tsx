'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import { AlertCircle } from 'lucide-react';

export default function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state on slug change so a slow previous-route response can't
    // briefly paint over the freshly-requested route's data.
    setTracks([]);
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    async function load() {
      try {
        const res = await api.get('/tracks', {
          params: { genre: slug, limit: 30 },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setTracks(res.data.tracks || []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load tracks');
      }
      if (!controller.signal.aborted) setLoading(false);
    }
    load();
    return () => controller.abort();
  }, [slug]);

  const genreName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">{genreName}</h1>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg bg-[hsl(var(--secondary))] animate-pulse" />
              <div className="h-4 w-3/4 bg-[hsl(var(--secondary))] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} tracks={tracks} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))] mb-4">{error}</p>
          <Link href="/" className="text-[hsl(var(--accent))] hover:underline">Back to Home</Link>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-[hsl(var(--muted-foreground))] mb-2">No tracks in this genre yet</p>
          <Link href="/search" className="text-sm text-[hsl(var(--accent))] hover:underline">Browse other genres</Link>
        </div>
      )}
    </div>
  );
}
