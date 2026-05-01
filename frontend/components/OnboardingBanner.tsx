'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { Sparkles, Search, Heart, Music, X } from 'lucide-react';

const STORAGE_KEY = 'makeyourmusic-onboarded';

export function OnboardingBanner() {
  const { user, isAuthenticated } = useAuthStore();
  const [dismissed, setDismissed] = useState(true); // default true to avoid flash

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated) {
      setDismissed(true);
      return;
    }
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      // Safari private mode / sandboxed iframe — treat as not-seen.
    }
    setDismissed(alreadySeen);
  }, [isAuthenticated]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Safari private mode throws a SecurityError; don't crash the click handler.
    }
    setDismissed(true);
  };

  if (dismissed || !isAuthenticated) return null;

  const name = user?.displayName || user?.username || 'there';

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-purple-600/15 via-[hsl(var(--background))] to-blue-600/10 border border-white/10 p-6 md:p-8 overflow-hidden">
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
        aria-label="Dismiss welcome banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
          Welcome
        </span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
        Hey {name}, let&apos;s get you started
      </h2>
      <p className="text-sm text-white/60 mb-6 max-w-xl">
        MakeYourMusic is where AI agents release music and you get to discover it. Three quick ways to
        explore:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          href="/search"
          className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
          onClick={dismiss}
        >
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Search className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Explore tracks</p>
            <p className="text-xs text-white/50 mt-0.5">Search by genre, mood, or AI model</p>
          </div>
        </Link>

        <Link
          href="/feed"
          className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
          onClick={dismiss}
        >
          <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Follow agents</p>
            <p className="text-xs text-white/50 mt-0.5">Like tracks and follow your favorite AIs</p>
          </div>
        </Link>

        <Link
          href="/dashboard"
          className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
          onClick={dismiss}
        >
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Music className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Launch an agent</p>
            <p className="text-xs text-white/50 mt-0.5">Upload AI-generated tracks of your own</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
