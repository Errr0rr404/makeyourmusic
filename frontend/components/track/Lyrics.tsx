'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Mic2 } from 'lucide-react';
import api from '@/lib/api';
import { usePlayerStore } from '@/lib/store/playerStore';

interface LyricsProps {
  lyrics: string | null | undefined;
  defaultOpen?: boolean;
  // When provided, the component fetches karaoke timings and highlights the
  // current line as the player progresses. Without it, falls back to the
  // plain rendering used everywhere else in the app.
  trackId?: string;
}

interface KaraokeLine {
  text: string;
  startSec: number;
  endSec: number;
  isSection: boolean;
}

/**
 * Renders song lyrics. Plain mode shows section-tagged text. Karaoke mode
 * (when trackId is supplied AND the track is currently playing) syncs to
 * the player progress and highlights the active line.
 */
export function Lyrics({ lyrics, defaultOpen = false, trackId }: LyricsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [karaokeLines, setKaraokeLines] = useState<KaraokeLine[] | null>(null);
  const [loadingKaraoke, setLoadingKaraoke] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const progress = usePlayerStore((s) => s.progress);
  const isThisTrackPlaying = trackId != null && currentTrack?.id === trackId;

  // Invalidate the cached karaoke lines whenever the trackId changes — without
  // this, switching tracks while karaoke is on showed the previous track's
  // lines until the user toggled karaoke off and back on.
  useEffect(() => {
    setKaraokeLines(null);
  }, [trackId]);

  useEffect(() => {
    if (!karaokeMode || !trackId || karaokeLines) return;
    let cancelled = false;
    (async () => {
      setLoadingKaraoke(true);
      try {
        const { data } = await api.get<{ lines: KaraokeLine[] }>(
          `/tracks/${trackId}/karaoke`,
        );
        if (!cancelled) setKaraokeLines(data.lines || []);
      } catch {
        if (!cancelled) setKaraokeLines([]);
      } finally {
        if (!cancelled) setLoadingKaraoke(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [karaokeMode, trackId, karaokeLines]);

  // Auto-scroll the active line into view when karaoke is on.
  useEffect(() => {
    if (!karaokeMode || !karaokeLines || !containerRef.current) return;
    const t = progress || 0;
    const activeIndex = karaokeLines.findIndex(
      (l) => t >= l.startSec && t <= l.endSec,
    );
    if (activeIndex < 0) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-i='${activeIndex}']`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [progress, karaokeMode, karaokeLines]);

  if (!lyrics || !lyrics.trim()) return null;

  const renderPlain = () => {
    const lines = lyrics.split('\n');
    const visibleLines = open ? lines : lines.slice(0, 4);
    return (
      <>
        <div className={!open && lines.length > 4 ? 'relative' : ''}>
          <div className="space-y-1 font-sans">
            {visibleLines.map((line, i) => {
              const trimmed = line.trim();
              if (/^\[.+\]$/.test(trimmed)) {
                return (
                  <p
                    key={i}
                    className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))] mt-4 first:mt-0"
                  >
                    {trimmed}
                  </p>
                );
              }
              if (trimmed === '') return <div key={i} className="h-2" />;
              return (
                <p key={i} className="text-sm leading-relaxed text-white/85">
                  {trimmed}
                </p>
              );
            })}
          </div>
          {!open && lines.length > 4 && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[hsl(var(--card))] to-transparent pointer-events-none" />
          )}
        </div>
        {lines.length > 4 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-[hsl(var(--accent))] hover:underline"
          >
            {open ? 'Show less' : `Show all lyrics (${lines.length} lines)`}
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </>
    );
  };

  const renderKaraoke = () => {
    if (loadingKaraoke || !karaokeLines) {
      return <p className="text-sm text-[hsl(var(--muted-foreground))]">Building timings…</p>;
    }
    if (karaokeLines.length === 0) {
      return <p className="text-sm text-[hsl(var(--muted-foreground))]">No timings available.</p>;
    }
    const t = progress || 0;
    return (
      <div ref={containerRef} className="max-h-72 overflow-y-auto pr-1 space-y-1">
        {karaokeLines.map((l, i) => {
          const active = isThisTrackPlaying && t >= l.startSec && t <= l.endSec;
          if (l.isSection) {
            return (
              <p
                data-i={i}
                key={i}
                className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))] mt-4 first:mt-0"
              >
                {l.text}
              </p>
            );
          }
          return (
            <p
              data-i={i}
              key={i}
              className={`text-sm leading-relaxed transition-all duration-200 ${
                active
                  ? 'text-white font-medium scale-[1.02] origin-left'
                  : 'text-white/40'
              }`}
            >
              {l.text}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-[hsl(var(--card))] rounded-xl p-5 border border-[hsl(var(--border))]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[hsl(var(--accent))]" />
          <h3 className="text-sm font-semibold text-white">Lyrics</h3>
        </div>
        {trackId && (
          <button
            onClick={() => setKaraokeMode((v) => !v)}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
              karaokeMode
                ? 'bg-[hsl(var(--accent))] text-white'
                : 'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}
            title="Toggle karaoke mode"
          >
            <Mic2 className="w-3 h-3" />
            Karaoke
          </button>
        )}
      </div>

      {karaokeMode ? renderKaraoke() : renderPlain()}
    </section>
  );
}
