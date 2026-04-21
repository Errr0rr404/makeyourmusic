'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface LyricsProps {
  lyrics: string | null | undefined;
  defaultOpen?: boolean;
}

/**
 * Renders song lyrics with section tags visually distinguished.
 * Supports [Verse], [Chorus], [Bridge], [Intro], [Outro] and variants.
 */
export function Lyrics({ lyrics, defaultOpen = false }: LyricsProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!lyrics || !lyrics.trim()) return null;

  const lines = lyrics.split('\n');
  const visibleLines = open ? lines : lines.slice(0, 4);
  const isLong = lines.length > 4;

  return (
    <section className="bg-[hsl(var(--card))] rounded-xl p-5 border border-[hsl(var(--border))]">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-[hsl(var(--accent))]" />
        <h3 className="text-sm font-semibold text-white">Lyrics</h3>
      </div>

      <div className={!open && isLong ? 'relative' : ''}>
        <div className="space-y-1 font-sans">
          {visibleLines.map((line, i) => {
            const trimmed = line.trim();
            // Section tag: standalone [Something]
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
            if (trimmed === '') {
              return <div key={i} className="h-2" />;
            }
            return (
              <p
                key={i}
                className="text-sm leading-relaxed text-white/85"
              >
                {trimmed}
              </p>
            );
          })}
        </div>
        {!open && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[hsl(var(--card))] to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-[hsl(var(--accent))] hover:underline"
        >
          {open ? 'Show less' : `Show all lyrics (${lines.length} lines)`}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </section>
  );
}
