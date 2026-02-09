'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Radio, Library, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/feed', label: 'Feed', icon: Radio },
  { href: '/library', label: 'Library', icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAgentOwner = user?.role === 'AGENT_OWNER' || user?.role === 'ADMIN';

  const items = isAgentOwner
    ? [...navItems, { href: '/dashboard', label: 'Studio', icon: LayoutDashboard }]
    : navItems;

  return (
    <nav className="fixed bottom-[var(--player-height)] left-0 right-0 bg-[hsl(var(--card))]/95 backdrop-blur-xl border-t border-[hsl(var(--border))] z-40 md:hidden">
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
