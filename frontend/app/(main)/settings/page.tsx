'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { Settings, Volume2, Sliders, Moon, LogOut, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const { volume, setVolume, crossfade, setCrossfade, eqEnabled, toggleEQ } = usePlayerStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Settings</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to access settings</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">Log In</Link>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success('Logged out');
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-[hsl(var(--accent))]" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Audio Settings */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Audio</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          {/* Volume */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-white font-medium">Default Volume</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{Math.round(volume * 100)}%</p>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-32 accent-[hsl(var(--accent))]"
              aria-label="Volume"
            />
          </div>

          {/* Crossfade */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-white font-medium">Crossfade</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{crossfade === 0 ? 'Off' : `${crossfade}s`}</p>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={crossfade}
              onChange={(e) => setCrossfade(parseInt(e.target.value))}
              className="w-32 accent-[hsl(var(--accent))]"
              aria-label="Crossfade duration"
            />
          </div>

          {/* EQ */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-white font-medium">Equalizer</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{eqEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            <button
              onClick={toggleEQ}
              className={`w-11 h-6 rounded-full transition-colors relative ${eqEnabled ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))]'}`}
              role="switch"
              aria-checked={eqEnabled}
              aria-label="Toggle equalizer"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${eqEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Account Settings */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Account</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          <Link href="/profile" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-white">Edit Profile</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/library" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-white">Your Library</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">About</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] px-5 py-4">
          <p className="text-sm text-white font-medium">Morlo.ai</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            AI-Generated Music Platform &mdash; Version 1.0.0
          </p>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-sm font-semibold uppercase text-red-400/70 mb-3 px-1">Danger Zone</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400">Log Out</span>
          </button>
        </div>
      </section>
    </div>
  );
}
