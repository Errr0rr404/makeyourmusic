'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AudioPlayer } from '@/components/player/AudioPlayer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { usePlayerStore } from '@/lib/store/playerStore';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const hasPlayer = !!currentTrack;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <Topbar />
      <main
        className={
          hasPlayer
            ? 'md:ml-[var(--sidebar-width)] mt-16 pb-[calc(var(--player-height)+56px)] md:pb-[var(--player-height)] min-h-[calc(100vh-64px-var(--player-height))]'
            : 'md:ml-[var(--sidebar-width)] mt-16 pb-14 md:pb-0 min-h-[calc(100vh-64px)]'
        }
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
        <div className="md:ml-0">
          <Footer />
        </div>
      </main>
      <MobileNav />
      <AudioPlayer />
    </div>
  );
}
