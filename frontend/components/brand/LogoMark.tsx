import { cn } from '@/lib/utils';

interface LogoMarkProps {
  className?: string;
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <>
      {/* Modern: aurora-gradient mark */}
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        className={cn('modern-only h-9 w-9 shrink-0', className)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="512" height="512" rx="112" fill="#0A0A0D" />
        <rect x="44" y="44" width="424" height="424" rx="96" fill="url(#mym-logo-gradient)" />
        <path
          d="M120 334V180L204 302L256 220L308 302L392 180V334"
          stroke="white"
          strokeWidth="42"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M156 354H356" stroke="white" strokeOpacity=".34" strokeWidth="26" strokeLinecap="round" />
        <circle cx="389" cy="139" r="24" fill="#2DD4BF" />
        <circle cx="389" cy="139" r="10" fill="white" fillOpacity=".72" />
        <defs>
          <linearGradient id="mym-logo-gradient" x1="76" y1="77" x2="443" y2="434" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset=".52" stopColor="#D946EF" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      {/* Vintage: cassette-shaped mark */}
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        className={cn('vintage-only h-9 w-9 shrink-0', className)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="512" height="512" rx="40" fill="#1a120a" stroke="#3e2614" strokeWidth="6" />
        {/* Top label stripe */}
        <rect x="60" y="80" width="392" height="14" fill="#c0392b" />
        {/* Paper label */}
        <rect x="60" y="100" width="392" height="120" fill="#fbf3df" />
        <rect x="80" y="125" width="220" height="10" fill="#2b1d10" />
        <rect x="80" y="150" width="160" height="6" fill="#2b1d10" opacity="0.6" />
        <rect x="350" y="120" width="80" height="80" fill="none" stroke="#2b1d10" strokeWidth="3" />
        {/* Tape window */}
        <rect x="60" y="240" width="392" height="180" fill="#0a0604" />
        {/* Reels */}
        <g transform="translate(150 330)">
          <circle r="58" fill="#3a2a1a" />
          <circle r="22" fill="#1a120a" />
          <circle r="6" fill="#0a0604" />
          <line x1="0" y1="0" x2="0" y2="-15" stroke="#2a1f12" strokeWidth="6" strokeLinecap="round" />
          <line x1="0" y1="0" x2="13" y2="7" stroke="#2a1f12" strokeWidth="6" strokeLinecap="round" />
          <line x1="0" y1="0" x2="-13" y2="7" stroke="#2a1f12" strokeWidth="6" strokeLinecap="round" />
        </g>
        <g transform="translate(362 330)">
          <circle r="58" fill="#3a2a1a" />
          <circle r="22" fill="#1a120a" />
          <circle r="6" fill="#0a0604" />
          <line x1="0" y1="0" x2="0" y2="-15" stroke="#2a1f12" strokeWidth="6" strokeLinecap="round" />
          <line x1="0" y1="0" x2="13" y2="7" stroke="#2a1f12" strokeWidth="6" strokeLinecap="round" />
          <line x1="0" y1="0" x2="-13" y2="7" stroke="#2a1f12" strokeWidth="6" strokeLinecap="round" />
        </g>
        {/* Tape thread */}
        <line x1="208" y1="330" x2="304" y2="330" stroke="#3a2a1a" strokeWidth="3" />
      </svg>
    </>
  );
}
