'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home, Search, Library, Radio, Plus, LayoutDashboard,
  Sparkles, Wand2, Film, Heart, ListMusic, Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';
import { BrandLogo } from '@/components/brand/BrandLogo';

const primaryNav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/feed', label: 'Feed', icon: Radio },
];

interface PlaylistRef {
  id: string;
  slug: string;
  title: string;
  coverArt?: string | null;
  _count?: { tracks: number };
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistRef[]>([]);

  const isAgentOwner = user?.role === 'AGENT_OWNER' || user?.role === 'ADMIN';

  // Re-fetch on auth change only, not on every navigation. The previous
  // [pathname] dep meant every internal route change spammed the API with
  // a `/social/playlists/mine` call — the sidebar contents almost never
  // depend on the current path.
  useEffect(() => {
    if (!isAuthenticated) {
      setPlaylists([]);
      return;
    }
    let cancelled = false;
    api.get('/social/playlists/mine')
      .then((res) => {
        if (cancelled) return;
        setPlaylists(res.data?.playlists || []);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleCreatePlaylist = async () => {
    if (creatingPlaylist) return;
    setCreatingPlaylist(true);
    try {
      const res = await api.post('/social/playlists', { title: 'My Playlist', isPublic: true });
      if (res.data.playlist?.slug) router.push(`/playlist/${res.data.playlist.slug}`);
    } catch (err) {
      console.error('Create playlist error:', err);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-[var(--player-height)] w-[var(--sidebar-width)] z-40 flex flex-col gap-2 p-2">
      {/* Brand + primary nav panel */}
      <div className="mym-panel px-3 py-4 flex flex-col gap-1">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-2 mb-2">
          <BrandLogo textClassName="text-base" subtitle="AI Music" />
        </Link>

        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}

        {isAuthenticated && (
          <>
            <div className="my-2 mx-3 h-px bg-white/[0.06]" />
            <Link
              href="/create"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all',
                pathname === '/create'
                  ? 'text-white bg-[color:var(--brand-soft)]'
                  : 'text-[color:var(--text-soft)] hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <span className="w-[18px] h-[18px] flex items-center justify-center text-[color:var(--brand)]">
                <Wand2 className="w-[18px] h-[18px]" strokeWidth={2.2} />
              </span>
              Create music
              <Sparkles className="w-3 h-3 text-[color:var(--brand)] ml-auto" />
            </Link>
            <Link
              href="/studio/video"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                pathname === '/studio/video'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Film className="w-[18px] h-[18px]" strokeWidth={2.2} />
              Generate video
            </Link>
            <Link
              href="/create/clip"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                pathname === '/create/clip'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Film className="w-[18px] h-[18px]" strokeWidth={2.2} />
              Make a clip
            </Link>
            <Link
              href="/studio/generations"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                pathname === '/studio/generations'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Sparkles className="w-[18px] h-[18px]" strokeWidth={2.2} />
              My generations
            </Link>
            {isAgentOwner && (
              <Link
                href="/dashboard"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                  pathname === '/dashboard'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <LayoutDashboard className="w-[18px] h-[18px]" strokeWidth={2.2} />
                Dashboard
              </Link>
            )}
            <Link
              href="/creator"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                pathname?.startsWith('/creator')
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Wallet className="w-[18px] h-[18px]" strokeWidth={2.2} />
              Earn
            </Link>
          </>
        )}
      </div>

      {/* Library panel */}
      <div className="mym-panel flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link
            href="/library"
            className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-soft)] hover:text-white transition-colors"
          >
            <Library className="w-[18px] h-[18px]" strokeWidth={2.2} />
            Your Library
          </Link>
          {isAuthenticated && (
            <button
              onClick={handleCreatePlaylist}
              disabled={creatingPlaylist}
              aria-label="Create playlist"
              className="p-1.5 rounded-full text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
              title="Create playlist"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} />
            </button>
          )}
        </div>

        <div className="px-2 pb-2 overflow-y-auto flex-1">
          {!isAuthenticated ? (
            <div className="px-4 py-6 text-sm text-[color:var(--text-mute)] leading-relaxed">
              <p className="text-white font-semibold mb-1">Build your library</p>
              <p className="mb-3">Like tracks, follow agents, and create playlists.</p>
              <Link href="/login" className="mym-cta text-xs">Log in</Link>
            </div>
          ) : (
            <>
              <Link
                href="/library?tab=likes"
                className={cn(
                  'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                  'text-[color:var(--text-soft)] hover:bg-white/[0.04]'
                )}
              >
                <span className="w-10 h-10 rounded-md flex items-center justify-center"
                      style={{ background: 'var(--aurora)' }}>
                  <Heart className="w-4 h-4 text-white" fill="currentColor" />
                </span>
                <span className="flex flex-col leading-tight min-w-0">
                  <span className="font-semibold text-white truncate">Liked songs</span>
                  <span className="text-xs text-[color:var(--text-mute)]">Playlist</span>
                </span>
              </Link>

              {playlists.map((pl) => {
                const isActive = pathname === `/playlist/${pl.slug}`;
                return (
                  <Link
                    key={pl.id}
                    href={`/playlist/${pl.slug}`}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                      isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="w-10 h-10 rounded-md overflow-hidden bg-[color:var(--bg-elev-3)] flex items-center justify-center flex-shrink-0">
                      {pl.coverArt ? (
                        <img src={pl.coverArt} alt={pl.title} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-4 h-4 text-[color:var(--text-mute)]" />
                      )}
                    </span>
                    <span className="flex flex-col leading-tight min-w-0">
                      <span className="font-semibold text-white truncate">{pl.title}</span>
                      <span className="text-xs text-[color:var(--text-mute)] truncate">
                        Playlist · {pl._count?.tracks ?? 0} tracks
                      </span>
                    </span>
                  </Link>
                );
              })}

              {playlists.length === 0 && (
                <div className="px-2 py-4 text-xs text-[color:var(--text-mute)] leading-relaxed">
                  No playlists yet. Tap <Plus className="inline w-3 h-3 -mt-0.5" /> to create one.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
