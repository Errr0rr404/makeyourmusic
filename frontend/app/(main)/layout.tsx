'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AudioPlayer } from '@/components/player/AudioPlayer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useAuthStore } from '@/lib/store/authStore';
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  const hasPlayer = !!currentTrack;
  const isPublicLanding = pathname === '/' && !isAuthenticated;

  if (isPublicLanding) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--bg)]">
        <div className="mym-aurora" />
        <div className="relative z-10">
          {children}
          <Footer />
        </div>
        <AudioPlayer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Aurora — MakeYourMusic's signature ambient backdrop */}
      <div className="mym-aurora" />

      {/* Desktop: floating sidebar to the left */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main shell — rounded panel like modern Spotify */}
      <div
        className={`md:pl-[var(--sidebar-width)] relative z-10 ${
          hasPlayer
            ? 'pb-[calc(var(--player-height)+var(--mobile-nav-height)+24px+env(safe-area-inset-bottom))] md:pb-[calc(var(--player-height)+56px)]'
            : 'pb-[calc(var(--mobile-nav-height)+24px+env(safe-area-inset-bottom))] md:pb-14'
        }`}
      >
        <div className="md:pr-2 md:py-2">
          {/* Panel wraps the content visually but does NOT set overflow-hidden
              so the topbar inside can stick relative to the page scroll. */}
          <div className="md:mym-panel">
            <Topbar />
            <main
              className="px-4 md:px-8 pt-4 pb-12"
              style={{ minHeight: hasPlayer ? `calc(100vh - 64px - var(--player-height))` : `calc(100vh - 64px)` }}
            >
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </div>

      <MobileNav />
      <AudioPlayer />
    </div>
  );
}
