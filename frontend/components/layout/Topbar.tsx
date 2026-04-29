'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Search, User, LogOut, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!user && !isAuthenticated) fetchUser();
  }, [user, isAuthenticated, fetchUser]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showUserMenu]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [router, searchQuery]);

  const onSearchPage = pathname === '/search';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-2 md:gap-4 px-3 sm:px-4 md:px-6 h-16 transition-colors',
        scrolled ? 'mym-topbar-frost' : 'bg-transparent'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="hidden md:inline-flex w-8 h-8 items-center justify-center rounded-full bg-black/30 text-[color:var(--text-soft)] hover:text-white transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
        </button>
        <button
          onClick={() => router.forward()}
          aria-label="Go forward"
          className="hidden md:inline-flex w-8 h-8 items-center justify-center rounded-full bg-black/30 text-[color:var(--text-soft)] hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
        </button>

        <form onSubmit={handleSearch} className="md:ml-2 flex-1 max-w-[420px] min-w-0 sm:min-w-[160px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-mute)]" />
            <input
              type="text"
              placeholder={onSearchPage ? 'Search tracks, agents, genres…' : 'Search MakeYourMusic'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white/[0.06] text-sm text-white placeholder:text-[color:var(--text-mute)] border border-transparent focus:bg-white/[0.1] focus:border-[color:var(--brand)]/50 focus:outline-none transition-colors"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <Link href="/create" className="hidden md:inline-flex mym-pill">
              <span className="text-[color:var(--brand)] mr-1">●</span> Create
            </Link>
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-black/30 hover:bg-white/[0.08] transition-colors"
                aria-label="User menu"
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'var(--aurora)' }}>
                  {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="hidden sm:inline text-xs font-semibold text-white max-w-[100px] truncate">
                  {user?.displayName || user?.username}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-12 w-60 bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)] rounded-xl shadow-2xl shadow-black/40 z-50 py-2 animate-fade-in">
                    <div className="px-4 py-2 border-b border-[color:var(--stroke)]">
                      <p className="text-sm font-semibold text-white truncate">{user?.displayName || user?.username}</p>
                      <p className="text-xs text-[color:var(--text-mute)] truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--text-soft)] hover:text-white hover:bg-white/[0.06] transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--text-soft)] hover:text-white hover:bg-white/[0.06] transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-white/[0.06] transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="hidden min-[430px]:inline-flex whitespace-nowrap text-sm font-semibold text-[color:var(--text-soft)] hover:text-white transition-colors px-3 py-2">
              Log in
            </Link>
            <Link href="/register" className="mym-cta mym-cta-sm text-sm">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
