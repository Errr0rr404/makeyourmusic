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
        <span className={cn('font-display font-extrabold text-white tracking-tight', textClassName)}>
          MakeYourMusic
        </span>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
