import { cn } from '@/lib/utils';
import { LogoMark } from './LogoMark';

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  subtitle?: string;
}

export function BrandLogo({
  className,
  markClassName,
  textClassName,
  subtitle,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="flex min-w-0 flex-col leading-tight">
        {/* Modern: gradient-able sans-serif */}
        <span className={cn(
          'modern-only font-display font-extrabold text-[color:var(--text)] tracking-tight',
          textClassName,
        )}>
          MakeYourMusic
        </span>
        {/* Vintage: chunky display, with red bottom stripe */}
        <span className={cn(
          'vintage-only font-display tracking-wide uppercase relative',
          textClassName,
        )}
        style={{ color: 'var(--text)' }}
        >
          MakeYourMusic
          <span
            aria-hidden
            className="absolute left-0 right-0 -bottom-0.5 h-[2px]"
            style={{ background: 'var(--brand)' }}
          />
        </span>
        {subtitle && (
          <>
            <span className="modern-only text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
              {subtitle}
            </span>
            <span
              className="vintage-only text-[10px] uppercase tracking-[0.20em]"
              style={{ color: 'var(--text-mute)', fontFamily: 'var(--font-label)' }}
            >
              {subtitle}
            </span>
          </>
        )}
      </span>
    </span>
  );
}
