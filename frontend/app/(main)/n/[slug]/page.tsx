'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { TrackCard } from '@/components/track/TrackCard';
import type { TrackItem } from '@makeyourmusic/shared';
import { Sparkles } from 'lucide-react';

interface NicheDef {
  slug: string;
  title: string;
  tagline: string;
  promptTemplates: string[];
  seedGenre?: string;
  seedMood?: string;
}

// Niche landing page. The strategy: pick one vertical (lo-fi/sleep/k-pop/kids),
// dominate it, then expand. This page gives newcomers a focused entry point
// and shows the prompt templates that produce great results in this niche.
export default function NichePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const [niche, setNiche] = useState<NicheDef | null>(null);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ niche: NicheDef; tracks: TrackItem[] }>(
          `/niches/${slug}`,
        );
        if (cancelled) return;
        setNiche(data.niche);
        setTracks(data.tracks);
      } catch {
        if (!cancelled) setNiche(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const useTemplate = (template: string) => {
    router.push(`/create?prompt=${encodeURIComponent(template)}`);
  };

  if (loading) {
    return <div className="p-8 text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>;
  }
  if (!niche) {
    return (
      <div className="p-8">
        <p>Niche not found.</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">{niche.title}</h1>
        <p className="text-lg text-[hsl(var(--muted-foreground))]">{niche.tagline}</p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3">
          One-tap starting points
        </h2>
        <div className="flex flex-wrap gap-2">
          {niche.promptTemplates.map((t) => (
            <button
              key={t}
              onClick={() => useTemplate(t)}
              className="text-sm px-3 py-2 rounded-md bg-[hsl(var(--bg-elev-2))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-elev-3))] inline-flex items-center gap-2 max-w-md text-left"
            >
              <Sparkles className="w-4 h-4 flex-shrink-0 text-[hsl(var(--primary))]" />
              <span className="line-clamp-2">{t}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Curated for this vibe</h2>
        {tracks.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No tracks here yet — be the first to publish in this niche.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t as any} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
