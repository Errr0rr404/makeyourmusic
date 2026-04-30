'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, BarChart3, ListMusic } from 'lucide-react';

const tabs = [
  { href: '/creator/payouts', label: 'Payouts', icon: Wallet },
  { href: '/creator/earnings', label: 'Earnings', icon: BarChart3 },
  { href: '/creator/playlists', label: 'Paid Playlists', icon: ListMusic },
];

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-1">Creator</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Manage payouts, see what you&apos;re earning, and price your playlists.
      </p>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-white text-black' : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
