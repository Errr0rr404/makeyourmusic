'use client';

import { cn } from '@/lib/utils';

interface DeckCassetteWindowProps {
  coverArt?: string | null;
  title?: string;
  artist?: string;
  side?: 'A' | 'B';
  /** 0..1 — drives reel sizes and the position of the tape head dot. */
  progress: number;
  /** Whether the reels should spin. */
  spinning?: boolean;
  /** Whether the deck is in PLAY (lights the REC/PLAY indicator). */
  playing?: boolean;
  className?: string;
}

/**
 * The signature element of a cassette deck: a recessed dark window with a
 * cassette tape sitting inside. The album art shows through as the J-card
 * label and the two reels are visible below, with tape moving between them.
 *
 * Designed to sit inline in the player bar (~70–80px tall, ~280–340px wide).
 */
export function DeckCassetteWindow({
  coverArt,
  title,
  artist,
  side = 'A',
  progress,
  spinning = false,
  playing = false,
  className,
}: DeckCassetteWindowProps) {
  const p = Math.max(0, Math.min(1, progress));
  // Reels: left starts large (full of tape), right starts small.
  const minR = 0.42;
  const maxR = 0.92;
  const leftR = maxR - (maxR - minR) * p;
  const rightR = minR + (maxR - minR) * p;

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      aria-label={title ? `Now playing: ${title}` : 'Cassette deck window'}
      style={{
        // Outer recessed bezel — dark glass window in the deck
        padding: 4,
        background:
          'linear-gradient(180deg, #0a0604 0%, #1a1009 50%, #0a0604 100%)',
        borderRadius: 3,
        border: '1px solid #050200',
        boxShadow:
          'inset 0 2px 5px rgba(0, 0, 0, 0.92), inset 0 -1px 0 rgba(255, 235, 200, 0.04), 0 1px 0 rgba(255, 235, 200, 0.06)',
      }}
    >
      {/* Inner glass tint — gives the window that smoky-plexi look */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 270,
          height: 72,
          background:
            'linear-gradient(180deg, rgba(20,12,6,0.55) 0%, rgba(0,0,0,0.20) 50%, rgba(20,12,6,0.55) 100%)',
          borderRadius: 2,
        }}
      >
        {/* The cassette body — slightly smaller than the window */}
        <div
          className="absolute inset-1 flex flex-col"
          style={{
            background:
              'linear-gradient(180deg, #2a2520 0%, #1a120a 60%, #0d0805 100%)',
            borderRadius: 2,
            boxShadow:
              'inset 0 1px 0 rgba(255, 235, 200, 0.10), inset 0 -2px 4px rgba(0, 0, 0, 0.75), 0 1px 4px rgba(0, 0, 0, 0.55)',
            border: '1px solid #050200',
          }}
        >
          {/* J-card label strip (top ~38%) */}
          <div
            className="relative flex items-stretch"
            style={{
              flex: '0 0 38%',
              margin: '3px 5px 0 5px',
              background: '#fbf3df',
              color: '#2b1d10',
              boxShadow: 'inset 0 -1px 2px rgba(43, 29, 16, 0.20)',
              minHeight: 0,
            }}
          >
            {/* Color stripe down the left edge of the label */}
            <span
              aria-hidden
              style={{
                width: 4,
                background:
                  'linear-gradient(180deg, #c0392b 0%, #ffb347 100%)',
                flexShrink: 0,
              }}
            />
            {/* Optional cover thumbnail */}
            {coverArt && (
              <span
                aria-hidden
                className="flex-shrink-0 block overflow-hidden"
                style={{
                  width: 22,
                  height: '100%',
                  borderRight: '1px solid #2b1d10',
                }}
              >
                <img
                  src={coverArt}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              </span>
            )}
            {/* Title / artist typed on the J-card */}
            <span
              className="flex flex-col justify-center min-w-0 flex-1 px-1.5"
              style={{
                fontFamily: "'Special Elite', 'Courier New', monospace",
                fontSize: 9,
                lineHeight: 1.1,
              }}
            >
              <span className="truncate font-bold uppercase" style={{ letterSpacing: '0.02em' }}>
                {title ?? 'Untitled Tape'}
              </span>
              {artist && (
                <span className="truncate" style={{ opacity: 0.8, fontSize: 8 }}>
                  {artist}
                </span>
              )}
            </span>
            {/* Side indicator (A / B) */}
            <span
              className="flex items-center justify-center flex-shrink-0 font-bold"
              style={{
                width: 14,
                fontFamily: "'Special Elite', 'Courier New', monospace",
                fontSize: 10,
                borderLeft: '1px solid #2b1d10',
                background: 'rgba(43, 29, 16, 0.06)',
              }}
            >
              {side}
            </span>
          </div>

          {/* Reel window — bottom portion of the cassette */}
          <div
            className="relative flex items-center justify-around"
            style={{
              flex: '1 1 auto',
              margin: '2px 8px 4px 8px',
              padding: '0 6px',
              background: '#070302',
              borderRadius: 1,
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.85)',
              minHeight: 0,
            }}
          >
            {/* Tape strand connecting the two reels */}
            <span
              aria-hidden
              className="absolute"
              style={{
                left: '18%',
                right: '18%',
                top: '50%',
                height: 1,
                background: 'linear-gradient(90deg, #1a0f06, #4a3520, #1a0f06)',
                transform: 'translateY(-0.5px)',
                opacity: 0.85,
              }}
            />
            {/* Subtle scanning glow indicating playhead position */}
            {playing && (
              <span
                aria-hidden
                className="absolute"
                style={{
                  left: `calc(18% + ${p * 64}%)`,
                  top: '50%',
                  width: 6,
                  height: 6,
                  background: 'var(--led-on, #ff5a3c)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 6px var(--led-on, #ff5a3c)',
                  opacity: 0.7,
                  transition: 'left 120ms linear',
                }}
              />
            )}
            <DeckReel radiusFrac={leftR} spinning={spinning} />
            <DeckReel radiusFrac={rightR} spinning={spinning} />
          </div>
        </div>

        {/* PLAY/REC indicator dot in the corner of the window */}
        <span
          aria-hidden
          className="absolute"
          style={{
            top: 4,
            right: 5,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: playing ? 'var(--led-on, #ff5a3c)' : 'rgba(120, 60, 40, 0.4)',
            boxShadow: playing ? '0 0 6px var(--led-on, #ff5a3c)' : 'inset 0 1px 1px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    </div>
  );
}

function DeckReel({ radiusFrac, spinning }: { radiusFrac: number; spinning: boolean }) {
  // Tape outer radius (the wound spool) within a 32-unit viewbox (well r=14).
  const tapeR = 14 * radiusFrac;
  return (
    <svg
      viewBox="0 0 32 32"
      width={28}
      height={28}
      className={cn('animate-reel relative z-[1]', !spinning && 'reel-paused')}
      aria-hidden
    >
      {/* Wound tape ring */}
      <circle cx="16" cy="16" r={tapeR} fill="#3a2a1a" />
      <circle cx="16" cy="16" r={tapeR} fill="none" stroke="#1a0f06" strokeWidth="0.4" opacity="0.6" />
      {/* Hub */}
      <circle cx="16" cy="16" r="4" fill="#0d0805" stroke="#2a1f12" strokeWidth="0.5" />
      {/* Hex drive hole */}
      <polygon
        points="16,13.4 18.2,14.7 18.2,17.3 16,18.6 13.8,17.3 13.8,14.7"
        fill="#050200"
      />
      {/* 6 spoke arms — recognizable cassette hub */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x2 = 16 + Math.cos(angle) * 3.4;
        const y2 = 16 + Math.sin(angle) * 3.4;
        return (
          <line
            key={i}
            x1="16"
            y1="16"
            x2={x2}
            y2={y2}
            stroke="#2a1f12"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
