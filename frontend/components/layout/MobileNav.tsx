'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Wand2, Library, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/create', label: 'Create', icon: Wand2 },
  { href: '/library', label: 'Library', icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isAgentOwner = user?.role === 'AGENT_OWNER' || user?.role === 'ADMIN';
  const hasPlayer = !!currentTrack;

  const items = isAgentOwner
    ? [...navItems, { href: '/dashboard', label: 'Studio', icon: LayoutDashboard }]
    : navItems;

  return (
    <nav
      className={cn(
        'fixed left-0 right-0 z-40 md:hidden transition-[bottom] duration-300',
        hasPlayer ? 'bottom-[var(--player-height)]' : 'bottom-0'
      )}
    >
      <div className="bg-[color:var(--bg-elev-1)]/95 backdrop-blur-xl border-t border-[color:var(--stroke)]">
        <div className="flex items-center justify-around py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)]">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isCreate = item.href === '/create';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                  isActive
                    ? isCreate
                      ? 'text-[color:var(--brand)]'
                      : 'text-white'
                    : 'text-[color:var(--text-mute)] hover:text-white'
                )}
              >
                {isActive && (
                  <span
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                    style={{ background: isCreate ? 'var(--brand)' : 'var(--text)' }}
                  />
                )}
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
