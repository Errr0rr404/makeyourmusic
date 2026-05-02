'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic2, X } from 'lucide-react';
import api from '@/lib/api';
import { usePlayerStore } from '@/lib/store/playerStore';

interface KaraokeLine {
  text: string;
  startSec: number;
  endSec: number;
  isSection: boolean;
}

/**
 * Player-overlay karaoke view. Opens as a full-screen sheet with synced
 * lyric lines. Closes on Escape, backdrop click, or the X button.
 *
 * The Lyrics component on the track page already handles karaoke locally
 * — this overlay exists so karaoke is accessible from anywhere in the app
 * without first navigating to /track/[slug].
 */
export function KaraokeOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const progress = usePlayerStore((s) => s.progress);
  const [lines, setLines] = useState<KaraokeLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !currentTrack?.id) {
      setLines(null);
      return;
    }
    let cancelled = false;
    setError(null);
    api
      .get<{ lines: KaraokeLine[] }>(`/tracks/${currentTrack.id}/karaoke`)
      .then((r) => {
        if (!cancelled) setLines(r.data.lines || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              'No lyrics available for this track.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentTrack?.id]);

  // Auto-scroll active line into view.
  useEffect(() => {
    if (!open || !lines || !containerRef.current) return;
    const t = progress || 0;
    const activeIndex = lines.findIndex((l) => t >= l.startSec && t <= l.endSec);
    if (activeIndex < 0) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-i='${activeIndex}']`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [progress, lines, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/85 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl mx-auto flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-[hsl(var(--accent))]" />
            <span className="text-sm font-bold text-white">Karaoke</span>
            {currentTrack && (
              <span className="text-xs text-white/60 truncate max-w-[280px]">
                · {currentTrack.title}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close karaoke"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-12 space-y-2">
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {!error && !lines && <p className="text-sm text-white/60">Loading…</p>}
          {!error && lines && lines.length === 0 && (
            <p className="text-sm text-white/60">This track has no lyrics.</p>
          )}
          {lines &&
            lines.map((l, i) => {
              const t = progress || 0;
              const active = t >= l.startSec && t <= l.endSec;
              if (l.isSection) {
                return (
                  <p
                    data-i={i}
                    key={i}
                    className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))] mt-6 first:mt-0"
                  >
                    {l.text}
                  </p>
                );
              }
              return (
                <p
                  data-i={i}
                  key={i}
                  className={`text-2xl leading-snug font-semibold transition-all duration-200 ${
                    active ? 'text-white scale-[1.02] origin-left' : 'text-white/35'
                  }`}
                >
                  {l.text}
                </p>
              );
            })}
        </div>
      </div>
    </div>
  );
}
