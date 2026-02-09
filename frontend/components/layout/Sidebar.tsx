'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Library, Radio, TrendingUp, Music, Plus, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/feed', label: 'Feed', icon: Radio },
  { href: '/library', label: 'Library', icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const isAgentOwner = user?.role === 'AGENT_OWNER' || user?.role === 'ADMIN';

  const handleCreatePlaylist = async () => {
    if (creatingPlaylist) return;
    setCreatingPlaylist(true);
    try {
      const res = await api.post('/social/playlists', { title: 'My Playlist', isPublic: true });
      if (res.data.playlist?.slug) {
        router.push('/library');
      }
    } catch (err) {
      console.error('Create playlist error:', err);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-[var(--player-height)] w-[var(--sidebar-width)] bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col z-40">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Morlo
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[hsl(var(--accent))] text-white'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Agent Dashboard Link */}
        {isAgentOwner && (
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
            <p className="px-3 mb-2 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
              Creator Studio
            </p>
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard'
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5'
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        {isAuthenticated && (
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
            <p className="px-3 mb-2 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
              Playlists
            </p>
            <button
              onClick={handleCreatePlaylist}
              disabled={creatingPlaylist}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors w-full disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              {creatingPlaylist ? 'Creating...' : 'Create Playlist'}
            </button>
            <Link
              href="/library"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              Liked Songs
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 text-xs text-[hsl(var(--muted-foreground))]">
        <p>&copy; 2026 Morlo.ai</p>
      </div>
    </aside>
  );
}
