'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Loader2, Search, ShoppingBag, Music2, Wand2 } from 'lucide-react';

type ListingType = 'SAMPLE_PACK' | 'PROMPT_PRESET';
interface Listing {
  id: string;
  type: ListingType;
  slug: string;
  title: string;
  description?: string | null;
  coverArt?: string | null;
  priceCents: number;
  currency: string;
  purchaseCount: number;
  createdAt: string;
  seller?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
}

const FILTERS: Array<{ key: '' | ListingType; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { key: '', label: 'All', Icon: ShoppingBag },
  { key: 'SAMPLE_PACK', label: 'Sample packs', Icon: Music2 },
  { key: 'PROMPT_PRESET', label: 'Prompt presets', Icon: Wand2 },
];

export default function MarketplacePage() {
  const [type, setType] = useState<'' | ListingType>('');
  const [q, setQ] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get('/marketplace/listings', { params: { type: type || undefined, q: q || undefined } });
        if (cancelled) return;
        setListings(r.data?.listings || []);
      } catch {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [type, q]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className="w-5 h-5 text-purple-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Marketplace</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Sample packs & prompt presets</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Buy sounds + AI generation recipes from MakeYourMusic creators.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title…"
            className="w-full h-10 pl-9 pr-3 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-white text-sm focus:outline-none focus:border-purple-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label, Icon }) => (
            <button
              key={key || 'all'}
              onClick={() => setType(key)}
              className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium border transition-colors ${
                type === key
                  ? 'bg-purple-500 border-purple-500 text-white'
                  : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))] text-sm">
          No listings yet. <Link href="/creator/marketplace" className="text-purple-300 hover:underline">List one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/marketplace/${l.slug}`}
              className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden hover:border-purple-400/40 transition-colors"
            >
              <div className="aspect-square bg-[hsl(var(--secondary))]">
                {l.coverArt ? (
                  <img src={l.coverArt} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {l.type === 'SAMPLE_PACK' ? (
                      <Music2 className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                    ) : (
                      <Wand2 className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1">
                  {l.type === 'SAMPLE_PACK' ? 'Sample pack' : 'Prompt preset'}
                </p>
                <h3 className="text-base font-semibold text-white truncate group-hover:text-purple-200">
                  {l.title}
                </h3>
                <div className="flex items-center justify-between mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span>by {l.seller?.displayName || l.seller?.username || 'seller'}</span>
                  <span className="text-white font-semibold">${(l.priceCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
