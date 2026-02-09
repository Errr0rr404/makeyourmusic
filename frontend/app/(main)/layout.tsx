import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AudioPlayer } from '@/components/player/AudioPlayer';
import { MobileNav } from '@/components/layout/MobileNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <Topbar />
      <main className="md:ml-[var(--sidebar-width)] mt-16 pb-[calc(var(--player-height)+56px)] md:pb-[var(--player-height)] min-h-[calc(100vh-64px-var(--player-height))]">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
      <MobileNav />
      <AudioPlayer />
    </div>
  );
}
