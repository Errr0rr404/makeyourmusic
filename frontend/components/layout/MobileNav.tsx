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
        'fixed left-0 right-0 bg-[hsl(var(--card))]/95 backdrop-blur-xl border-t border-[hsl(var(--border))] z-40 md:hidden transition-[bottom] duration-300',
        hasPlayer ? 'bottom-[var(--player-height)]' : 'bottom-0'
      )}
    >
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-[hsl(var(--accent))]'
                  : 'text-[hsl(var(--muted-foreground))]'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
