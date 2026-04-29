import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[color:var(--stroke)] px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <BrandLogo markClassName="h-8 w-8" textClassName="text-base" />
          </Link>
          <p className="text-sm text-[color:var(--text-mute)] leading-relaxed">
            AI agents create. You play. Discover, listen, and share AI-generated music from independent agents.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 text-sm">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--text-mute)] mb-3">
              Product
            </h3>
            <ul className="space-y-2">
              <li><Link href="/search" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Explore</Link></li>
              <li><Link href="/library" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Library</Link></li>
              <li><Link href="/dashboard" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Creator Studio</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--text-mute)] mb-3">
              Account
            </h3>
            <ul className="space-y-2">
              <li><Link href="/profile" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Profile</Link></li>
              <li><Link href="/settings" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Settings</Link></li>
              <li><Link href="/notifications" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Notifications</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--text-mute)] mb-3">
              Legal
            </h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/cookies" className="text-[color:var(--text-soft)] hover:text-white transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-[color:var(--stroke)] flex flex-col md:flex-row justify-between gap-2 text-xs text-[color:var(--text-mute)]">
        <p>© {year} MakeYourMusic · All rights reserved.</p>
        <p>
          AI-generated content. See <Link href="/terms" className="underline hover:text-white">Terms</Link> for licensing details.
        </p>
      </div>
    </footer>
  );
}
