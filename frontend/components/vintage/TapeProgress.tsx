'use client';

import { cn } from '@/lib/utils';

interface TapeProgressProps {
  /** 0..1 */
  progress: number;
  className?: string;
  spinning?: boolean;
  /** Render as a thin LED bar instead of two-reel visualization. */
  compact?: boolean;
}

/**
 * Cassette progress: two reels with the left reel shrinking and the right
 * reel growing as the tape plays. Falls back to a thin LED bar when
 * `compact` is true (used in cramped layouts like the mobile mini-player).
 */
export function TapeProgress({ progress, className, spinning = false, compact = false }: TapeProgressProps) {
  const p = Math.max(0, Math.min(1, progress));

  if (compact) {
    return (
      <div
        className={cn('relative w-full overflow-hidden', className)}
        style={{
          height: 4,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 0,
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.55)',
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p * 100)}
      >
        <div
          style={{
            width: `${p * 100}%`,
            height: '100%',
            background: 'var(--led-on)',
            boxShadow: '0 0 6px var(--led-on)',
            transition: 'width 60ms linear',
          }}
        />
      </div>
    );
  }

  // Reel sizes scale with progress.
  const minR = 0.45;
  const maxR = 0.95;
  const leftR = maxR - (maxR - minR) * p;
  const rightR = minR + (maxR - minR) * p;

  return (
    <div
      className={cn('relative w-full flex items-center justify-between px-4 py-1.5', className)}
      style={{
        background: '#0a0604',
        borderRadius: 2,
        boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.85)',
        minHeight: 32,
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <ProgressReel radiusFrac={leftR} spinning={spinning} />
      <span
        className="absolute left-[15%] right-[15%] top-1/2"
        style={{ height: 2, background: '#3a2a1a', transform: 'translateY(-1px)' }}
      />
      <ProgressReel radiusFrac={rightR} spinning={spinning} />
    </div>
  );
}

function ProgressReel({ radiusFrac, spinning }: { radiusFrac: number; spinning: boolean }) {
  const tapeR = 12 * radiusFrac;
  return (
    <svg
      viewBox="0 0 32 32"
      width={28}
      height={28}
      className={cn('animate-reel', !spinning && 'reel-paused')}
    >
      <circle cx="16" cy="16" r={tapeR} fill="#3a2a1a" />
      <circle cx="16" cy="16" r="3.5" fill="#1a120a" stroke="#2a1f12" strokeWidth="0.5" />
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const x2 = 16 + Math.cos(angle) * 3;
        const y2 = 16 + Math.sin(angle) * 3;
        return (
          <line key={i} x1="16" y1="16" x2={x2} y2={y2} stroke="#2a1f12" strokeWidth="1" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}
