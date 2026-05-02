'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/lib/store/toastStore';
import { Film, Loader2, Sparkles, AlertCircle, Download } from 'lucide-react';

type Status = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
interface MusicVideoGen {
  id: string;
  status: Status;
  videoUrl?: string | null;
  errorMessage?: string | null;
}

interface Props {
  trackId: string;
  isOwner: boolean;
  // When the track row already has a finished URL, we use it directly to
  // avoid an extra fetch on every track-page load.
  initialVideoUrl?: string | null;
}

export function TrackMusicVideo({ trackId, isOwner, initialVideoUrl }: Props) {
  const [gen, setGen] = useState<MusicVideoGen | null>(
    initialVideoUrl ? { id: 'cached', status: 'COMPLETED', videoUrl: initialVideoUrl } : null
  );
  const [loading, setLoading] = useState(!initialVideoUrl);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (initialVideoUrl) return;
    let cancelled = false;
    let timerId: number | null = null;
    const load = async () => {
      try {
        const r = await api.get(`/ai/music-video/${trackId}`);
        if (cancelled) return;
        const next: MusicVideoGen | null = r.data?.generation || null;
        setGen(next);
        if (next && (next.status === 'PENDING' || next.status === 'PROCESSING')) {
          timerId = window.setTimeout(load, 8000);
        }
      } catch {
        // Silent: 404 just means no music video exists yet for this track.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [trackId, initialVideoUrl]);

  const startGenerate = async () => {
    setRequesting(true);
    try {
      const r = await api.post(`/ai/music-video/${trackId}`);
      const next: MusicVideoGen = r.data.generation;
      setGen(next);
      toast.success('Music video generation started — usually 1–3 minutes');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        toast.error('Daily AI limit reached. Try again tomorrow or upgrade.');
      } else {
        toast.error(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to start music video'
        );
      }
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return null;

  // Public-facing: if the video is ready, render it. Hide the owner-only CTA
  // for non-owners.
  if (gen?.status === 'COMPLETED' && gen.videoUrl) {
    return (
      <div className="rounded-2xl overflow-hidden bg-black border border-[hsl(var(--border))] mb-8">
        <video
          src={gen.videoUrl}
          controls
          playsInline
          className="w-full aspect-[9/16] sm:aspect-video bg-black object-contain"
        />
      </div>
    );
  }

  if (!isOwner) return null;

  // Owner CTA — generate / status / retry.
  return (
    <div className="bg-[hsl(var(--card))] rounded-xl p-5 mb-8 border border-[hsl(var(--border))]">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Film className="w-4 h-4 text-purple-300" />
        AI music video
      </h3>

      {!gen && (
        <>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Generate a vertical AI music video from this track's cover art and metadata.
            Counts against your daily generation limit.
          </p>
          <button
            onClick={startGenerate}
            disabled={requesting}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition-transform"
          >
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate music video
          </button>
        </>
      )}

      {gen && (gen.status === 'PENDING' || gen.status === 'PROCESSING') && (
        <div className="flex items-center gap-3 text-sm text-purple-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Rendering video… 1–3 minutes typical.</span>
        </div>
      )}

      {gen?.status === 'FAILED' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{gen.errorMessage || 'Music video generation failed'}</span>
          </div>
          <button
            onClick={startGenerate}
            disabled={requesting}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-[hsl(var(--border))] text-sm font-medium text-white hover:bg-[hsl(var(--accent))]/20"
          >
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Try again
          </button>
        </div>
      )}

      {gen?.status === 'COMPLETED' && gen.videoUrl && (
        <a
          href={gen.videoUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 hover:text-purple-200"
        >
          <Download className="w-4 h-4" /> Download video
        </a>
      )}
    </div>
  );
}
