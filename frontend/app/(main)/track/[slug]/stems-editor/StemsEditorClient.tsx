'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Play, Pause, RotateCcw, Download, Drum, Music, Mic, Volume2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const STEM_KEYS = ['drums', 'bass', 'vocals', 'other'] as const;
type StemKey = typeof STEM_KEYS[number];

const STEM_META: Record<StemKey, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  drums: { label: 'Drums', Icon: Drum },
  bass: { label: 'Bass', Icon: Music },
  vocals: { label: 'Vocals', Icon: Mic },
  other: { label: 'Other', Icon: Volume2 },
};

interface Stems {
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  drumsUrl?: string | null;
  bassUrl?: string | null;
  vocalsUrl?: string | null;
  otherUrl?: string | null;
}

interface TrackData {
  id: string;
  slug: string;
  title: string;
  duration: number;
  agent?: { ownerId: string; name: string; slug: string };
}

export function StemsEditorClient({ slug }: { slug: string }) {
  const { user, isAuthenticated } = useAuthStore();
  const [track, setTrack] = useState<TrackData | null>(null);
  const [stems, setStems] = useState<Stems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [levels, setLevels] = useState<Record<StemKey, number>>({ drums: 100, bass: 100, vocals: 100, other: 100 });
  const [mutes, setMutes] = useState<Record<StemKey, boolean>>({ drums: false, bass: false, vocals: false, other: false });
  const [solos, setSolos] = useState<Record<StemKey, boolean>>({ drums: false, bass: false, vocals: false, other: false });
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [exporting, setExporting] = useState(false);

  const audioRefs = useRef<Record<StemKey, HTMLAudioElement | null>>({
    drums: null, bass: null, vocals: null, other: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tr, sr] = await Promise.all([
          api.get(`/tracks/${encodeURIComponent(slug)}`),
          // The slug-based stems lookup hits the controller's :trackId param —
          // backend resolves either id or slug.
          api.get(`/tracks/${encodeURIComponent(slug)}`).then((r) => api.get(`/licenses/tracks/${r.data?.track?.id}/stems`)),
        ]);
        if (cancelled) return;
        setTrack(tr.data?.track || null);
        setStems(sr.data?.stems || null);
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to load track or stems'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Apply levels + mute/solo to the four <audio> elements every render. We
  // keep the DOM elements as our source of truth for time; volumes are pulled
  // from React state via this effect.
  useEffect(() => {
    const anySolo = Object.values(solos).some(Boolean);
    for (const key of STEM_KEYS) {
      const el = audioRefs.current[key];
      if (!el) continue;
      const baseLevel = Math.max(0, Math.min(150, levels[key])) / 100;
      const muted = mutes[key];
      const solo = anySolo ? solos[key] : true;
      el.volume = solo && !muted ? Math.min(1, baseLevel) : 0;
    }
  }, [levels, mutes, solos]);

  // Keep all four audio elements in lockstep — when one drifts more than
  // 60ms from the master (drums by convention), nudge it.
  const SYNC_THRESHOLD_SEC = 0.06;
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const master = audioRefs.current.drums;
      if (master) {
        setPositionSec(master.currentTime);
        for (const key of STEM_KEYS) {
          if (key === 'drums') continue;
          const el = audioRefs.current[key];
          if (!el) continue;
          if (Math.abs(el.currentTime - master.currentTime) > SYNC_THRESHOLD_SEC) {
            el.currentTime = master.currentTime;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const togglePlay = async () => {
    const playable = STEM_KEYS.map((k) => audioRefs.current[k]).filter((el): el is HTMLAudioElement => !!el);
    if (playable.length === 0) return;
    if (!isPlaying) {
      // Sync everyone to drums' position first to avoid initial stagger.
      const master = audioRefs.current.drums;
      const t = master?.currentTime ?? 0;
      for (const el of playable) el.currentTime = t;
      try {
        await Promise.all(playable.map((el) => el.play()));
        setIsPlaying(true);
      } catch {
        toast.error('Could not start playback. Click play again or check audio permissions.');
        for (const el of playable) el.pause();
      }
    } else {
      for (const el of playable) el.pause();
      setIsPlaying(false);
    }
  };

  const seek = (sec: number) => {
    const t = Math.max(0, Math.min(track?.duration ?? 1, sec));
    for (const key of STEM_KEYS) {
      const el = audioRefs.current[key];
      if (el) el.currentTime = t;
    }
    setPositionSec(t);
  };

  const restart = () => seek(0);

  const exportMix = async () => {
    if (!track) return;
    setExporting(true);
    try {
      const r = await api.post(`/licenses/tracks/${track.id}/stems/mix-export`, {
        levels,
        mutes: Object.entries(mutes).filter(([, v]) => v).map(([k]) => k),
        solos: Object.entries(solos).filter(([, v]) => v).map(([k]) => k),
      });
      const url = r.data?.url as string | undefined;
      if (!url) {
        toast.error('Server did not return a mix URL');
        return;
      }
      // Open in a new tab so the browser triggers download / playback. Safari
      // sometimes blocks programmatic downloads of cross-origin URLs; new tab
      // is the most reliable cross-browser path.
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Mix ready — opened in a new tab');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to export mix'
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto mb-3" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading stems…</p>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{error || 'Track not found'}</p>
        <Link href="/" className="text-purple-300 hover:underline">Back home</Link>
      </div>
    );
  }

  if (!isAuthenticated || !user || track.agent?.ownerId !== user.id) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Owner only</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          The stems editor is available to track owners. Open a track you created.
        </p>
        <Link href={`/track/${track.slug}`} className="text-purple-300 hover:underline">Back to track</Link>
      </div>
    );
  }

  if (!stems || stems.status !== 'READY') {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Music className="w-12 h-12 text-purple-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Stems aren&apos;t ready</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Generate stems on the track page first. They take 1–3 minutes after payment.
        </p>
        <Link href={`/track/${track.slug}`} className="text-purple-300 hover:underline">Back to track</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link
        href={`/track/${track.slug}`}
        className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to track
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Stems editor</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 truncate">
        {track.title} · {track.agent?.name}
      </p>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-6">
        {/* Hidden <audio> elements — one per stem. crossOrigin="anonymous" is
            required for Cloudinary to send CORS headers. */}
        {STEM_KEYS.map((key) => {
          const url = (stems as unknown as Record<string, unknown>)[`${key}Url`] as string | null;
          if (!url) return null;
          return (
            <audio
              key={key}
              ref={(el) => { audioRefs.current[key] = el; }}
              src={url}
              preload="auto"
              crossOrigin="anonymous"
              onEnded={() => setIsPlaying(false)}
            />
          );
        })}

        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-400 flex items-center justify-center text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={restart}
            aria-label="Restart"
            className="w-10 h-10 rounded-full border border-[hsl(var(--border))] flex items-center justify-center text-white hover:bg-[hsl(var(--accent))]/20"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(1, track.duration)}
            step={0.5}
            value={Math.min(positionSec, track.duration)}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums w-20 text-right">
            {fmt(positionSec)} / {fmt(track.duration)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STEM_KEYS.map((key) => {
            const meta = STEM_META[key];
            const Icon = meta.Icon;
            const isSolo = solos[key];
            const isMute = mutes[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 flex flex-col items-center gap-2"
              >
                <Icon className="w-5 h-5 text-purple-300" />
                <span className="text-xs font-medium text-white">{meta.label}</span>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={levels[key]}
                  onChange={(e) => setLevels((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  // Vertical-ish slider via CSS; horizontal is fine for v1.
                  className="w-full"
                  aria-label={`${meta.label} level`}
                />
                <span className="text-xs tabular-nums text-[hsl(var(--muted-foreground))]">{levels[key]}%</span>
                <div className="flex gap-1 w-full">
                  <button
                    onClick={() => setMutes((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`flex-1 h-7 text-xs rounded-md border transition-colors ${
                      isMute
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                        : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setSolos((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`flex-1 h-7 text-xs rounded-md border transition-colors ${
                      isSolo
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Solo overrides mute. Levels go up to 150% for stems that come through quiet.
          </p>
          <button
            onClick={exportMix}
            disabled={exporting}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition-transform"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export mix
          </button>
        </div>
      </div>
    </div>
  );
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}
