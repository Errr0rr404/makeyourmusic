'use client';

import { useState, useEffect } from 'react';
import { Wand2, RefreshCw, Plus, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/lib/store/toastStore';
import { useRouter } from 'next/navigation';

interface Generation {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

/**
 * Owner-only "what would you like to do with this track?" toolbox. Surfaces
 * the existing /variation, /extend, /regenerate-section endpoints which are
 * already implemented on the backend but were not previously discoverable.
 *
 * The component is silent (renders nothing) when:
 *   - the viewer is not the track owner
 *   - the track has no linked MusicGeneration (e.g. an old track or one
 *     that was uploaded directly rather than AI-generated)
 *   - the linked generation isn't COMPLETED yet — variation/extend require
 *     a finished source
 */
export function TrackCreatorTools({
  trackId,
  trackSlug,
  isOwner,
}: {
  trackId: string;
  trackSlug: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<'variation' | 'extend' | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    api
      .get<{ generation: Generation }>(`/tracks/${trackSlug}/generation`)
      .then((r) => {
        if (!cancelled) {
          setGeneration(r.data?.generation || null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [trackSlug, isOwner]);

  if (!isOwner || !loaded || !generation || generation.status !== 'COMPLETED') {
    return null;
  }

  const runVariation = async () => {
    setBusy('variation');
    try {
      const r = await api.post<{ generation: { id: string } }>(
        `/ai/generations/${generation.id}/variation`,
        {}
      );
      toast.success('Variation queued — find it under your studio drafts.');
      // Send the user straight to the studio so they can watch it complete
      // and publish it once ready.
      router.push(`/studio?generation=${r.data?.generation?.id || ''}`);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to create variation');
    } finally {
      setBusy(null);
    }
  };

  const runExtend = async () => {
    setBusy('extend');
    try {
      const r = await api.post<{ generation: { id: string } }>(
        `/ai/generations/${generation.id}/extend`,
        {}
      );
      toast.success('Extension queued — your track will get a longer cut shortly.');
      router.push(`/studio?generation=${r.data?.generation?.id || ''}`);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to extend track');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
        <h3 className="text-sm font-bold text-white">Creator tools</h3>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Branch new variations, longer cuts, or regenerated sections.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={runVariation}
          disabled={busy !== null}
          className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]/40 bg-[color:var(--bg-elev-2)] p-3 text-left transition-colors disabled:opacity-50"
        >
          <Wand2 className="w-4 h-4 mt-0.5 text-[hsl(var(--accent))]" />
          <div>
            <div className="text-sm font-semibold text-white">
              {busy === 'variation' ? 'Queuing…' : 'New variation'}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Same lyrics, fresh arrangement.
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={runExtend}
          disabled={busy !== null}
          className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]/40 bg-[color:var(--bg-elev-2)] p-3 text-left transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mt-0.5 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-white">
              {busy === 'extend' ? 'Queuing…' : 'Extend the track'}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Add another verse / outro from the existing audio.
            </div>
          </div>
        </button>
        <a
          href={`/studio?generation=${generation.id}&action=regenerate-section`}
          className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]/40 bg-[color:var(--bg-elev-2)] p-3 text-left transition-colors"
        >
          <RefreshCw className="w-4 h-4 mt-0.5 text-pink-400" />
          <div>
            <div className="text-sm font-semibold text-white">Regenerate section</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Rewrite a verse / chorus / bridge while keeping the rest.
            </div>
          </div>
        </a>
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-[color:var(--text-mute)]">
        Tip: Hit your daily generation cap? Upgrade Premium for 500/day.
      </p>
      <input type="hidden" value={trackId} readOnly />
    </div>
  );
}
