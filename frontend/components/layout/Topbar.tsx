'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';

export function Topbar() {
  const router = useRouter();
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Close user menu on Escape key
  useEffect(() => {
    if (!showUserMenu) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showUserMenu]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 md:left-[var(--sidebar-width)] right-0 h-16 bg-[hsl(var(--background))]/80 backdrop-blur-xl border-b border-[hsl(var(--border))] flex items-center justify-between px-4 md:px-6 z-30">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search tracks, agents, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-[hsl(var(--secondary))] text-sm text-white placeholder:text-[hsl(var(--muted-foreground))] border border-transparent focus:border-[hsl(var(--accent))] focus:outline-none transition-colors"
          />
        </div>
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-3 ml-4">
        {isAuthenticated ? (
          <>
            <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                  {user?.displayName?.[0] || user?.username?.[0] || 'U'}
                </div>
                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-12 w-56 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-xl z-50 py-2">
                    <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
                      <p className="text-sm font-medium text-white">{user?.displayName || user?.username}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.email}</p>
                    </div>
                    <Link
                      href="/library"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/library"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-white transition-colors px-4 py-2"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 px-5 py-2 rounded-full transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
