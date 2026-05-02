'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Loader2, Plus, ShoppingBag, Music2, Wand2, ArrowLeft, AlertCircle } from 'lucide-react';

type ListingType = 'SAMPLE_PACK' | 'PROMPT_PRESET';
interface Listing {
  id: string;
  type: ListingType;
  slug: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'REMOVED';
  priceCents: number;
  purchaseCount: number;
  coverArt?: string | null;
  description?: string | null;
}

export default function CreatorMarketplacePage() {
  const { isAuthenticated } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [type, setType] = useState<ListingType>('SAMPLE_PACK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('4.99');
  const [coverArt, setCoverArt] = useState('');
  const [sampleAudioUrl, setSampleAudioUrl] = useState('');
  const [assetUrlsRaw, setAssetUrlsRaw] = useState('');
  const [presetDataRaw, setPresetDataRaw] = useState(
    '{\n  "genre": "lofi",\n  "mood": "calm",\n  "isInstrumental": true\n}'
  );
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/marketplace/listings/mine');
      setListings(r.data?.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const cents = Math.round(parseFloat(priceDollars) * 100);
    if (!Number.isFinite(cents) || cents < 99) {
      toast.error('Price must be at least $0.99');
      return;
    }
    let presetData: Record<string, unknown> | undefined;
    if (type === 'PROMPT_PRESET') {
      try {
        presetData = JSON.parse(presetDataRaw);
      } catch {
        toast.error('Preset JSON is invalid');
        return;
      }
    }
    const assetUrls = type === 'SAMPLE_PACK'
      ? assetUrlsRaw.split('\n').map((u) => u.trim()).filter(Boolean)
      : [];
    setSubmitting(true);
    try {
      const r = await api.post('/marketplace/listings', {
        type,
        title,
        description,
        priceCents: cents,
        coverArt: coverArt || undefined,
        sampleAudioUrl: sampleAudioUrl || undefined,
        assetUrls,
        presetData,
      });
      const next = r.data?.listing as Listing;
      setListings((prev) => [next, ...prev]);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      toast.success('Draft listing created — publish it from the row below');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to create listing'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: 'DRAFT' | 'ACTIVE' | 'REMOVED') => {
    try {
      const r = await api.patch(`/marketplace/listings/${id}`, { status });
      const next = r.data?.listing as Listing;
      setListings((prev) => prev.map((l) => (l.id === id ? next : l)));
      toast.success(`Listing ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to update listing'
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Sign in to manage marketplace listings.</p>
        <Link href="/login?redirect=/creator/marketplace" className="text-purple-300 hover:underline">Log in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link
        href="/creator"
        className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Creator dashboard
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Your marketplace listings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sell sample packs and prompt presets. We take 15%; the rest pays out via Stripe Connect.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          New listing
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('SAMPLE_PACK')}
                className={`flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium border ${
                  type === 'SAMPLE_PACK'
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <Music2 className="w-4 h-4" /> Sample pack
              </button>
              <button
                type="button"
                onClick={() => setType('PROMPT_PRESET')}
                className={`flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium border ${
                  type === 'PROMPT_PRESET'
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <Wand2 className="w-4 h-4" /> Prompt preset
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm resize-none"
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Price (USD)</label>
              <input
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                placeholder="4.99"
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Cover art URL</label>
              <input
                value={coverArt}
                onChange={(e) => setCoverArt(e.target.value)}
                placeholder="https://…"
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
              />
            </div>
          </div>

          {type === 'SAMPLE_PACK' && (
            <>
              <div>
                <label className="block text-xs font-medium text-white mb-1.5">Sample preview audio URL (30s)</label>
                <input
                  value={sampleAudioUrl}
                  onChange={(e) => setSampleAudioUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white mb-1.5">
                  Asset URLs (one per line, max 50)
                </label>
                <textarea
                  value={assetUrlsRaw}
                  onChange={(e) => setAssetUrlsRaw(e.target.value)}
                  rows={4}
                  placeholder="https://res.cloudinary.com/.../snare.wav"
                  className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm font-mono resize-none"
                />
              </div>
            </>
          )}

          {type === 'PROMPT_PRESET' && (
            <div>
              <label className="block text-xs font-medium text-white mb-1.5">
                Preset JSON
              </label>
              <textarea
                value={presetDataRaw}
                onChange={(e) => setPresetDataRaw(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm font-mono resize-none"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Loaded into the Create wizard when buyers click "Use this preset".
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="h-10 px-4 rounded-full border border-[hsl(var(--border))] text-sm font-medium text-white"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save draft
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-sm text-[hsl(var(--muted-foreground))]">
          No listings yet. Click "New listing" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-lg bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
                {l.coverArt ? (
                  <img src={l.coverArt} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {l.type === 'SAMPLE_PACK' ? (
                      <Music2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    ) : (
                      <Wand2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">{l.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                    {l.status}
                  </span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  ${(l.priceCents / 100).toFixed(2)} · {l.purchaseCount} sold
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {l.status === 'ACTIVE' ? (
                  <button
                    onClick={() => setStatus(l.id, 'DRAFT')}
                    className="h-9 px-3 rounded-full border border-[hsl(var(--border))] text-xs text-white hover:bg-[hsl(var(--accent))]/20"
                  >
                    Unpublish
                  </button>
                ) : l.status === 'DRAFT' ? (
                  <button
                    onClick={() => setStatus(l.id, 'ACTIVE')}
                    className="h-9 px-3 rounded-full bg-purple-500 hover:bg-purple-400 text-xs text-white font-medium"
                  >
                    Publish
                  </button>
                ) : null}
                {l.status !== 'REMOVED' && (
                  <button
                    onClick={() => setStatus(l.id, 'REMOVED')}
                    className="h-9 px-3 rounded-full border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                  >
                    Remove
                  </button>
                )}
                {l.status === 'ACTIVE' && (
                  <Link
                    href={`/marketplace/${l.slug}`}
                    className="h-9 px-3 rounded-full border border-[hsl(var(--border))] text-xs text-white hover:bg-[hsl(var(--accent))]/20 inline-flex items-center"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
