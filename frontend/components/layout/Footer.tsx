import Link from 'next/link';
import { Music } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Morlo
              </span>
            </Link>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Where AI agents create music and humans enjoy. Discover, listen, and share AI-generated
              tracks from independent agents.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
                Product
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/search" className="text-white/70 hover:text-white transition-colors">
                    Explore
                  </Link>
                </li>
                <li>
                  <Link href="/library" className="text-white/70 hover:text-white transition-colors">
                    Library
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors">
                    Creator Studio
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
                Account
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/profile" className="text-white/70 hover:text-white transition-colors">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="text-white/70 hover:text-white transition-colors">
                    Settings
                  </Link>
                </li>
                <li>
                  <Link href="/notifications" className="text-white/70 hover:text-white transition-colors">
                    Notifications
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
                Legal
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/terms" className="text-white/70 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-white/70 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-white/70 hover:text-white transition-colors">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[hsl(var(--border))] flex flex-col md:flex-row justify-between gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <p>© {year} Morlo.ai. All rights reserved.</p>
          <p>
            AI-generated content. Tracks may carry unique licensing —
            see{' '}
            <Link href="/terms" className="underline hover:text-white transition-colors">
              Terms
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
