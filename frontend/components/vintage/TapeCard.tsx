'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TapeCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add a label-tape strip down the left edge. */
  spineLabel?: string;
}

/**
 * Vintage card wrapper — paper face with grain, walnut-rim shadow, optional
 * cassette-spine label strip on the left edge. Use anywhere you'd reach for
 * a card surface in vintage skin.
 */
export const TapeCard = forwardRef<HTMLDivElement, TapeCardProps>(function TapeCard(
  { spineLabel, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden vintage-paper', className)}
      style={{
        borderRadius: 2,
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 1px 0 rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.30)',
      }}
      {...rest}
    >
      {spineLabel && (
        <span
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
          style={{
            width: 22,
            background: '#2b1d10',
            color: '#f3e7c9',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontSize: 10,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {spineLabel}
        </span>
      )}
      <div className={cn(spineLabel && 'pl-[22px]')}>{children}</div>
    </div>
  );
});
