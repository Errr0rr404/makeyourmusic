'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Lock, Globe, Loader2, DollarSign, ListMusic } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  title: string;
  slug: string;
  accessTier: 'PUBLIC' | 'PRIVATE' | 'PAID';
  monthlyPriceCents: number | null;
  _count?: { tracks: number };
}

export default function CreatorPlaylistsPage() {
  const { isAuthenticated } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { tier: Playlist['accessTier']; price: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    api.get('/social/playlists/mine')
      .then((res) => {
        setPlaylists(res.data?.playlists || []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const setEdit = (id: string, patch: Partial<{ tier: Playlist['accessTier']; price: string }>) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch } as { tier: Playlist['accessTier']; price: string },
    }));
  };

  const editFor = (p: Playlist) =>
    edits[p.id] || {
      tier: p.accessTier,
      price: p.monthlyPriceCents != null ? (p.monthlyPriceCents / 100).toFixed(2) : '4.99',
    };

  const handleSave = async (p: Playlist) => {
    const e = editFor(p);
    setSavingId(p.id);
    try {
      const body: { accessTier: string; monthlyPriceCents?: number } = { accessTier: e.tier };
      if (e.tier === 'PAID') {
        const cents = Math.round(parseFloat(e.price) * 100);
        if (!Number.isFinite(cents) || cents < 100 || cents > 9900) {
          toast.error('Price must be between $1 and $99');
          setSavingId(null);
          return;
        }
        body.monthlyPriceCents = cents;
      }
      const res = await api.put(`/creator/playlists/${p.id}/pricing`, body);
      const updated: Playlist = res.data?.playlist;
      setPlaylists((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      toast.success('Saved');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string; code?: string } } };
      const msg = error.response?.data?.error || 'Failed to save';
      const code = error.response?.data?.code;
      if (code === 'CONNECT_REQUIRED') {
        toast.error('Set up payouts first');
      } else if (code === 'CREATOR_TIER_REQUIRED') {
        toast.error('Upgrade to Creator first');
      } else {
        toast.error(msg);
      }
    } finally {
      setSavingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Lock className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p className="text-[hsl(var(--muted-foreground))]">Log in to manage your playlists.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-[hsl(var(--secondary))] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center bg-[hsl(var(--card))] border border-white/5">
        <ListMusic className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p className="text-[hsl(var(--muted-foreground))] mb-3">You don&apos;t have any playlists yet.</p>
        <Link href="/library" className="text-sm text-[hsl(var(--accent))] hover:underline">
          Create one in your Library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {playlists.map((p) => {
        const e = editFor(p);
        const dirty =
          e.tier !== p.accessTier ||
          (e.tier === 'PAID' &&
            Math.round(parseFloat(e.price || '0') * 100) !== p.monthlyPriceCents);
        return (
          <div key={p.id} className="rounded-xl p-4 bg-[hsl(var(--card))] border border-white/5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <Link href={`/playlist/${p.slug}`} className="text-white font-medium hover:underline">
                  {p.title}
                </Link>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {p._count?.tracks ?? 0} tracks
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.accessTier === 'PAID'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : p.accessTier === 'PRIVATE'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-white/5 text-[hsl(var(--muted-foreground))]'
                }`}
              >
                {p.accessTier}
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Access</label>
                <select
                  value={e.tier}
                  onChange={(ev) => setEdit(p.id, { tier: ev.target.value as Playlist['accessTier'] })}
                  className="bg-[hsl(var(--secondary))] text-white text-sm rounded-lg px-3 py-2 border border-white/5 focus:outline-none focus:border-[hsl(var(--accent))]"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private (only you)</option>
                  <option value="PAID">Paid (subscribers only)</option>
                </select>
              </div>

              {e.tier === 'PAID' && (
                <div>
                  <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Monthly price</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type="number"
                      min="1"
                      max="99"
                      step="0.01"
                      value={e.price}
                      onChange={(ev) => setEdit(p.id, { price: ev.target.value })}
                      className="w-28 bg-[hsl(var(--secondary))] text-white text-sm rounded-lg pl-7 pr-2 py-2 border border-white/5 focus:outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => handleSave(p)}
                disabled={!dirty || savingId === p.id}
                className="ml-auto px-4 py-2 rounded-full bg-white text-black text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
              >
                {savingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4 flex items-center gap-1">
        <Globe className="w-3 h-3" /> Paid playlists are hidden behind a paywall — only active subscribers see the tracks.
      </p>
    </div>
  );
}
