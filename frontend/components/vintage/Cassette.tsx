'use client';

import { cn } from '@/lib/utils';

interface CassetteProps {
  coverArt?: string | null;
  title?: string;
  artist?: string;
  side?: 'A' | 'B';
  /**
   * Tape grade — controls the J-card label color stripe.
   * `chrome` = TDK SA-X-style cobalt + gold (Creator)
   * `metal`  = black foil + brushed metal (Premium)
   * `ferric` = plain beige (Free / default)
   */
  grade?: 'ferric' | 'chrome' | 'metal';
  spinning?: boolean;
  /** Render fraction of tape on left reel (0..1). */
  progress?: number;
  className?: string;
  /** Width in px. Height is derived (cassette aspect ~1.6 : 1). */
  width?: number;
}

/**
 * Cassette tape illustration with optional cover art in the J-card window
 * and rotating reels. Used as the cassette-card metaphor and the player
 * progress visualization.
 */
export function Cassette({
  coverArt,
  title,
  artist,
  side = 'A',
  grade = 'ferric',
  spinning = false,
  progress = 0.5,
  className,
  width = 200,
}: CassetteProps) {
  const height = Math.round(width / 1.6);
  // Reel size shrinks/grows based on progress.
  // At progress=0, left reel is full (large), right reel empty (small).
  // At progress=1, inverted.
  const minR = 0.45;
  const maxR = 0.85;
  const leftR = maxR - (maxR - minR) * progress;
  const rightR = minR + (maxR - minR) * progress;

  const stripe =
    grade === 'chrome'
      ? 'linear-gradient(90deg, #1c3a8c 0%, #ffd95a 100%)'
      : grade === 'metal'
        ? 'linear-gradient(90deg, #1a1a1a 0%, #c8c4b8 100%)'
        : 'linear-gradient(90deg, #c5b692 0%, #e6d6a8 100%)';

  return (
    <div
      className={cn('relative inline-block select-none', className)}
      style={{ width, height }}
      aria-label={title ? `Cassette: ${title}` : 'Cassette'}
    >
      {/* Cassette body (vinyl black, slightly textured) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #2a2520 0%, #1a120a 50%, #0d0805 100%)',
          borderRadius: 4,
          boxShadow:
            'inset 0 1px 0 rgba(255, 235, 200, 0.10), inset 0 -2px 4px rgba(0, 0, 0, 0.75), 0 4px 12px rgba(0, 0, 0, 0.55)',
          border: '1px solid #050200',
        }}
      />

      {/* Top stripe (J-card label color band) */}
      <div
        className="absolute"
        style={{
          left: '6%',
          right: '6%',
          top: '6%',
          height: '4px',
          background: stripe,
        }}
      />

      {/* J-card label area (paper) */}
      <div
        className="absolute flex flex-col justify-between px-2 py-1.5"
        style={{
          left: '6%',
          right: '6%',
          top: 'calc(6% + 6px)',
          height: '34%',
          background: '#fbf3df',
          color: '#2b1d10',
          fontFamily: "'Special Elite', 'Courier New', monospace",
          fontSize: Math.max(8, Math.round(width * 0.05)),
          lineHeight: 1.15,
          boxShadow: 'inset 0 -1px 2px rgba(43, 29, 16, 0.15)',
        }}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <span className="font-bold truncate" style={{ fontSize: '1em' }}>
            {title ?? 'Untitled Tape'}
          </span>
          <span
            className="px-1 leading-none flex-shrink-0"
            style={{
              fontSize: '0.85em',
              border: '1px solid #2b1d10',
              fontWeight: 700,
            }}
          >
            {side}
          </span>
        </div>
        {artist && (
          <span className="truncate opacity-80" style={{ fontSize: '0.85em' }}>
            {artist}
          </span>
        )}
      </div>

      {/* Cover art window (small thumbnail tucked into the label corner) */}
      {coverArt && (
        <div
          className="absolute overflow-hidden"
          style={{
            right: '8%',
            top: '8%',
            width: '20%',
            height: '24%',
            border: '1px solid #2b1d10',
          }}
        >
          {/* Use img instead of Next/Image so the component can render statically. */}
          <img src={coverArt} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Reel window — bottom half of cassette */}
      <div
        className="absolute flex items-center justify-around px-3"
        style={{
          left: '6%',
          right: '6%',
          bottom: '8%',
          height: '46%',
          background: '#0a0604',
          borderRadius: 2,
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.85)',
        }}
      >
        {/* Left reel (with tape) */}
        <Reel size={Math.round(width * 0.16)} radiusFrac={leftR} spinning={spinning} />
        {/* Tape thread between reels */}
        <span
          className="absolute"
          style={{
            left: '20%',
            right: '20%',
            top: '50%',
            height: 2,
            background: '#3a2a1a',
            transform: 'translateY(-1px)',
          }}
        />
        {/* Right reel */}
        <Reel size={Math.round(width * 0.16)} radiusFrac={rightR} spinning={spinning} />
      </div>
    </div>
  );
}

function Reel({ size, radiusFrac, spinning }: { size: number; radiusFrac: number; spinning: boolean }) {
  // Hub fills the reel; tape sits on top of hub up to radiusFrac of the well.
  const wellR = 30;
  const tapeR = wellR * radiusFrac;
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn('animate-reel', !spinning && 'reel-paused')}
      >
        {/* Tape outer (the wound spool) */}
        <circle cx="32" cy="32" r={tapeR} fill="#3a2a1a" />
        {/* Hub */}
        <circle cx="32" cy="32" r="8" fill="#1a120a" stroke="#2a1f12" strokeWidth="1" />
        {/* Center hex hole */}
        <polygon
          points="32,28 35.5,30 35.5,34 32,36 28.5,34 28.5,30"
          fill="#0a0604"
        />
        {/* 3 spoke arms */}
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
          const x2 = 32 + Math.cos(angle) * 6.5;
          const y2 = 32 + Math.sin(angle) * 6.5;
          return (
            <line
              key={i}
              x1="32"
              y1="32"
              x2={x2}
              y2={y2}
              stroke="#2a1f12"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </span>
  );
}
