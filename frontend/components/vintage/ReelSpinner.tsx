'use client';

import { cn } from '@/lib/utils';

interface ReelSpinnerProps {
  size?: number;
  spinning?: boolean;
  className?: string;
  /** Render two reels with a tape thread between them (mini-cassette look). */
  pair?: boolean;
}

/**
 * One or two cassette reels rotating. Used as a generic loader and inside
 * the cassette progress bar / now-playing surface.
 *
 * Style-agnostic — looks reasonable in modern skin too, but really shines
 * in vintage with the warm cream + walnut palette.
 */
export function ReelSpinner({ size = 48, spinning = true, className, pair = false }: ReelSpinnerProps) {
  if (pair) {
    return (
      <div className={cn('inline-flex items-center gap-1.5', className)} aria-hidden>
        <Reel size={size} spinning={spinning} />
        <span
          className="h-[3px] flex-shrink-0"
          style={{
            width: size * 0.35,
            background: 'linear-gradient(to right, var(--metal-shadow), var(--metal), var(--metal-shadow))',
            boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.4)',
          }}
        />
        <Reel size={size} spinning={spinning} />
      </div>
    );
  }
  return <Reel size={size} spinning={spinning} className={className} />;
}

function Reel({ size, spinning, className }: { size: number; spinning: boolean; className?: string }) {
  return (
    <span
      className={cn('inline-block relative shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn('animate-reel', !spinning && 'reel-paused')}
      >
        <defs>
          <radialGradient id="reel-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--bg-paper)" />
            <stop offset="60%" stopColor="var(--bg-elev-2)" />
            <stop offset="100%" stopColor="var(--bg-canvas)" />
          </radialGradient>
        </defs>
        {/* Outer rim */}
        <circle cx="32" cy="32" r="30" fill="url(#reel-grad)" stroke="var(--stroke-strong)" strokeWidth="1" />
        {/* Hub */}
        <circle cx="32" cy="32" r="8" fill="var(--metal-shadow)" stroke="var(--stroke-strong)" strokeWidth="1" />
        <circle cx="32" cy="32" r="3" fill="var(--bg-canvas)" />
        {/* 6 spoke holes */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const cx = 32 + Math.cos(angle) * 18;
          const cy = 32 + Math.sin(angle) * 18;
          return (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill="var(--bg-canvas)" stroke="var(--stroke)" strokeWidth="0.5" />
          );
        })}
      </svg>
    </span>
  );
}
