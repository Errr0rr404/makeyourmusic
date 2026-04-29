import { cn } from '@/lib/utils';

interface LogoMarkProps {
  className?: string;
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn('h-9 w-9 shrink-0', className)}
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
  );
}
