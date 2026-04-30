'use client';

import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/lib/audioEngine';

interface VUMeterProps {
  /** Number of LED segments (default 12). */
  segments?: number;
  /** Visual orientation. */
  orientation?: 'horizontal' | 'vertical';
  /** Height (horizontal) or width (vertical) of each segment in px. */
  thickness?: number;
  className?: string;
  /** Animate even with no live signal (idle preview). */
  idle?: boolean;
}

/**
 * LED-ladder VU meter driven by the AudioEngine's analyser. Falls back to a
 * subtle idle pulse when there's no signal (cross-origin or paused).
 *
 * Color zones: green 0–7, amber 8–10, red 11+.
 */
export function VUMeter({
  segments = 12,
  orientation = 'horizontal',
  thickness = 4,
  className,
  idle = false,
}: VUMeterProps) {
  const [lit, setLit] = useState(0);
  const peakRef = useRef(0);
  const peakHoldRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      let raw = audioEngine.getLevel();
      if (idle && raw < 0.04) {
        // Gentle idle pulse so the meter isn't dead in cross-origin/paused state.
        raw = 0.08 + Math.sin(now / 700) * 0.04;
      }
      // Ballistic integrator: fast attack, slower release (300ms attack, 1.5s release).
      const target = raw;
      const attack = 1 - Math.exp(-dt / 0.3);
      const release = 1 - Math.exp(-dt / 1.5);
      peakRef.current =
        target > peakRef.current
          ? peakRef.current + (target - peakRef.current) * attack
          : peakRef.current + (target - peakRef.current) * release;

      // Peak hold for the highest LED — sticks for ~700ms then drops.
      if (peakRef.current > peakHoldRef.current) peakHoldRef.current = peakRef.current;
      else peakHoldRef.current = Math.max(0, peakHoldRef.current - dt * 0.45);

      const next = Math.round(peakRef.current * segments);
      setLit((prev) => (prev === next ? prev : next));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [segments, idle]);

  const items = Array.from({ length: segments }).map((_, i) => {
    const isLit = i < lit;
    const isRed = i >= Math.floor(segments * 0.85);
    const isAmber = !isRed && i >= Math.floor(segments * 0.66);
    const color = isRed
      ? 'var(--led-on, #ff5a3c)'
      : isAmber
        ? 'var(--led-amber, #ffb347)'
        : 'var(--led-green, #5b8a3a)';
    return (
      <span
        key={i}
        style={{
          width: orientation === 'horizontal' ? `calc((100% - ${(segments - 1) * 2}px) / ${segments})` : thickness,
          height: orientation === 'horizontal' ? thickness : `calc((100% - ${(segments - 1) * 2}px) / ${segments})`,
          background: isLit ? color : 'rgba(0, 0, 0, 0.55)',
          boxShadow: isLit ? `0 0 4px ${color}` : 'inset 0 1px 1px rgba(0,0,0,0.55)',
          borderRadius: 1,
          transition: 'background 60ms linear, box-shadow 60ms linear',
        }}
      />
    );
  });

  return (
    <div
      role="meter"
      aria-label="Audio level"
      aria-valuemin={0}
      aria-valuemax={segments}
      aria-valuenow={Math.max(0, Math.min(lit, segments))}
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column-reverse',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        background: '#0a0805',
        borderRadius: 2,
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.85)',
      }}
    >
      {items}
    </div>
  );
}

/** Two-channel VU stack (L over R). */
export function VUMeterStereo({ segments = 12, thickness = 4, className }: { segments?: number; thickness?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: '#0a0805',
        padding: 4,
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-[var(--text-mute)] w-3">L</span>
        <VUMeter segments={segments} thickness={thickness} className="!p-0 !bg-transparent !shadow-none flex-1 w-full" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-[var(--text-mute)] w-3">R</span>
        <VUMeter segments={segments} thickness={thickness} className="!p-0 !bg-transparent !shadow-none flex-1 w-full" />
      </div>
    </div>
  );
}
