'use client';

import { useEffect, useState, use } from 'react';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';

export default function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/tracks', { params: { genre: slug, limit: 30 } });
        setTracks(res.data.tracks || []);
      } catch {}
      setLoading(false);
    }
    load();
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
      ) : (
        <p className="text-center py-20 text-[hsl(var(--muted-foreground))]">No tracks in this genre yet</p>
      )}
    </div>
  );
}
