'use client';

import { cn } from '@/lib/utils';

interface ReadoutProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  glow?: 'red' | 'amber' | 'green';
}

const sizes = {
  sm: 'text-[14px] px-2 py-0.5',
  md: 'text-[18px] px-2.5 py-1',
  lg: 'text-[26px] px-3 py-1.5',
};

const glowColor = {
  red: 'var(--led-on, #ff5a3c)',
  amber: 'var(--led-amber, #ffb347)',
  green: 'var(--led-green, #5b8a3a)',
};

/**
 * LED-style digital readout (tape counter / time display). Defaults to red.
 */
export function Readout({ children, className, size = 'md', glow = 'red' }: ReadoutProps) {
  return (
    <span
      className={cn('inline-flex items-center font-mono', sizes[size], className)}
      style={{
        color: glowColor[glow],
        textShadow: `0 0 6px ${glowColor[glow]}`,
        background: '#0a0805',
        borderRadius: 2,
        boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(0, 0, 0, 0.85)',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-mono, "VT323", monospace)',
      }}
    >
      {children}
    </span>
  );
}
