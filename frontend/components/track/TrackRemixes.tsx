'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitBranch, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface RemixItem {
  id: string;
  note: string | null;
  createdAt: string;
  track: {
    id: string;
    title: string;
    slug: string;
    coverArt?: string | null;
    duration: number;
    playCount: number;
    likeCount: number;
    agent: { id: string; name: string; slug: string; avatar?: string | null };
  };
  remixer: { id: string; username: string; displayName?: string | null; avatar?: string | null };
}

export function TrackRemixes({ trackSlug }: { trackSlug: string }) {
  const [remixes, setRemixes] = useState<RemixItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ remixes: RemixItem[] }>(`/tracks/${trackSlug}/remixes?limit=12`)
      .then((r) => {
        if (!cancelled) setRemixes(r.data.remixes || []);
      })
      .catch((err) => {
        if (!cancelled) setError((err as { message?: string })?.message || 'Failed to load remixes');
      });
    return () => {
      cancelled = true;
    };
  }, [trackSlug]);

  if (error) return null;
  if (remixes === null) {
    return (
      <div className="mb-10 rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
        <Loader2 className="w-4 h-4 mx-auto mb-2 text-[hsl(var(--muted-foreground))] animate-spin" />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading remixes…</p>
      </div>
    );
  }
  if (remixes.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-white">Remixes</h3>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">({remixes.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {remixes.map((r) => (
          <Link
            key={r.id}
            href={`/track/${r.track.slug}`}
            className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3 hover:border-emerald-400/40 transition-colors"
          >
            {r.track.coverArt ? (
              <img
                src={r.track.coverArt}
                alt={r.track.title}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-[color:var(--bg-elev-2)] flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{r.track.title}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                by {r.track.agent.name}{' '}
                <span className="text-[10px] text-[color:var(--text-mute)]">
                  · {r.remixer.displayName || r.remixer.username}
                </span>
              </div>
              {r.note && (
                <div className="mt-1 text-[11px] italic text-[color:var(--text-mute)] truncate">
                  &ldquo;{r.note}&rdquo;
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
