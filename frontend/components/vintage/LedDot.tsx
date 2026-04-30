'use client';

import { cn } from '@/lib/utils';

interface LedDotProps {
  on?: boolean;
  color?: 'red' | 'amber' | 'green';
  size?: number;
  pulse?: boolean;
  className?: string;
}

const colorVar = {
  red: 'var(--led-on, #ff5a3c)',
  amber: 'var(--led-amber, #ffb347)',
  green: 'var(--led-green, #5b8a3a)',
};

export function LedDot({ on = true, color = 'red', size = 8, pulse = false, className }: LedDotProps) {
  return (
    <span
      aria-hidden
      className={cn('inline-block rounded-full flex-shrink-0', pulse && on && 'animate-pulse-glow', className)}
      style={{
        width: size,
        height: size,
        background: on ? colorVar[color] : 'rgba(0, 0, 0, 0.5)',
        boxShadow: on
          ? `0 0 ${size * 0.8}px ${colorVar[color]}, inset 0 1px 0 rgba(255, 255, 255, 0.55)`
          : 'inset 0 1px 2px rgba(0, 0, 0, 0.55)',
      }}
    />
  );
}
