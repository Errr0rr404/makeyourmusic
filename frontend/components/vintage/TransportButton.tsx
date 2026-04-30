'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { playMechanicalClick } from './sounds';

type Variant = 'metal' | 'red' | 'amber';

interface TransportButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  /** Optional text label rendered below the icon (deck-style). */
  label?: string;
  children?: ReactNode;
}

const sizes = {
  sm: { btn: 'w-9 h-9', icon: 'w-4 h-4', label: 'text-[9px]' },
  md: { btn: 'w-11 h-11', icon: 'w-5 h-5', label: 'text-[10px]' },
  lg: { btn: 'w-14 h-14', icon: 'w-6 h-6', label: 'text-[11px]' },
};

/**
 * Mechanical transport button (PLAY / STOP / REW / FF / REC).
 * Variants:
 *  - metal: brushed-aluminum face, used for most controls
 *  - red:   lacquered red Record / Play
 *  - amber: glowing amber state (active)
 *
 * Pressing translateY(1px) and flips the inset shadow for a tactile depress.
 * Plays a subtle mechanical click on press if the user has opted in.
 */
export const TransportButton = forwardRef<HTMLButtonElement, TransportButtonProps>(function TransportButton(
  { variant = 'metal', size = 'md', active = false, label, children, className, onClick, type, ...rest },
  ref,
) {
  const s = sizes[size];
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      onClick={(e) => {
        playMechanicalClick();
        onClick?.(e);
      }}
      className={cn(
        'relative inline-flex flex-col items-center justify-center select-none',
        'transition-transform active:translate-y-px',
        s.btn,
        className,
      )}
      data-variant={variant}
      data-active={active || undefined}
      style={{
        borderRadius: variant === 'red' ? '50%' : 4,
        background:
          variant === 'red'
            ? 'radial-gradient(circle at 30% 30%, #ff7250 0%, #c0392b 65%, #8b1f12 100%)'
            : variant === 'amber'
              ? 'radial-gradient(circle at 30% 30%, #ffd07a 0%, #d97a2a 70%, #7a4317 100%)'
              : 'linear-gradient(180deg, #d8d3c6 0%, var(--metal, #5a564f) 50%, #3a3631 100%)',
        boxShadow: active
          ? 'inset 0 2px 4px rgba(0, 0, 0, 0.55), 0 0 12px var(--brand-glow)'
          : 'inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0 rgba(0, 0, 0, 0.45), 0 2px 0 rgba(0, 0, 0, 0.55), 0 4px 8px rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(0, 0, 0, 0.55)',
      }}
      {...rest}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center',
          variant === 'metal' ? 'text-[var(--text)]' : 'text-white',
          s.icon,
        )}
      >
        {children}
      </span>
      {label && (
        <span
          className={cn(
            'absolute -bottom-4 font-display tracking-wider uppercase',
            variant === 'metal' ? 'text-[var(--text-mute)]' : 'text-[var(--text-soft)]',
            s.label,
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
});
