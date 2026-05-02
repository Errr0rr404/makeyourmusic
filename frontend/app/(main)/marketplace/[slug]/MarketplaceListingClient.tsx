'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { validatePaymentRedirect } from '@/lib/utils';
import { toast } from '@/lib/store/toastStore';
import { Music2, Wand2, ShoppingBag, Loader2, AlertCircle, Download } from 'lucide-react';

type ListingType = 'SAMPLE_PACK' | 'PROMPT_PRESET';
interface Listing {
  id: string;
  type: ListingType;
  slug: string;
  title: string;
  description?: string | null;
  coverArt?: string | null;
  sampleAudioUrl?: string | null;
  priceCents: number;
  currency: string;
  status: 'DRAFT' | 'ACTIVE' | 'REMOVED';
  presetData?: Record<string, unknown> | null;
  purchaseCount: number;
  hasPurchased?: boolean;
  sellerUserId: string;
  seller?: { id: string; username: string; displayName?: string | null; avatar?: string | null; bio?: string | null } | null;
}

type PurchaseDownload = {
  assetUrls?: string[];
  presetData?: Record<string, unknown>;
};

export function MarketplaceListingClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchaseDownload, setPurchaseDownload] = useState<PurchaseDownload | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await api.get(`/marketplace/listings/${encodeURIComponent(slug)}`);
        if (cancelled) return;
        setListing(r.data?.listing || null);
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Listing not found'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const purchaseId = params.get('purchaseId');
    const purchaseState = params.get('purchase');
    if (!purchaseId || purchaseState !== 'pending') return;

    let cancelled = false;
    let timer: number | null = null;
    let attempts = 0;

    const loadPurchase = async () => {
      setPurchaseLoading(true);
      try {
        const r = await api.get<PurchaseDownload>(`/marketplace/purchases/${purchaseId}/download`);
        if (cancelled) return;
        setPurchaseDownload(r.data);
        setPurchaseError(null);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409 && attempts < 40) {
          attempts += 1;
          timer = window.setTimeout(loadPurchase, 3000);
        } else {
          setPurchaseError(
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              'Could not load purchase'
          );
        }
      } finally {
        if (!cancelled) setPurchaseLoading(false);
      }
    };

    void loadPurchase();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  const buy = async () => {
    if (!listing) return;
    if (!isAuthenticated) {
      router.push(`/login?redirect=/marketplace/${listing.slug}`);
      return;
    }
    setBuying(true);
    try {
      const r = await api.post(`/marketplace/listings/${encodeURIComponent(listing.slug)}/checkout`);
      const safe = validatePaymentRedirect(r.data?.checkoutUrl);
      if (safe) {
        window.location.href = safe;
      } else {
        toast.error('Could not start checkout');
      }
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to start checkout'
      );
    } finally {
      setBuying(false);
    }
  };

  const usePreset = () => {
    if (!listing || listing.type !== 'PROMPT_PRESET') return;
    router.push(`/create?preset=${listing.slug}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto mb-3" />
      </div>
    );
  }
  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{error || 'Listing not found'}</p>
        <Link href="/marketplace" className="text-purple-300 hover:underline">Back to marketplace</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {(purchaseDownload || purchaseLoading || purchaseError) && (
        <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <div className="flex items-start gap-3">
            {purchaseLoading && !purchaseDownload ? (
              <Loader2 className="w-5 h-5 text-emerald-200 animate-spin mt-0.5" />
            ) : (
              <Download className="w-5 h-5 text-emerald-200 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {purchaseDownload ? 'Purchase complete' : 'Confirming purchase'}
              </p>
              {purchaseError ? (
                <p className="mt-1 text-sm text-rose-200">{purchaseError}</p>
              ) : purchaseDownload?.assetUrls?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {purchaseDownload.assetUrls.map((href, index) => (
                    <a
                      key={`${href}-${index}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300"
                    >
                      <Download className="w-4 h-4" />
                      Asset {index + 1}
                    </a>
                  ))}
                </div>
              ) : purchaseDownload?.presetData ? (
                <button
                  onClick={() => listing && router.push(`/create?preset=${listing.slug}`)}
                  disabled={!listing}
                  className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  Open preset
                </button>
              ) : (
                <p className="mt-1 text-sm text-emerald-100/80">
                  Keep this page open while payment is confirmed. Your purchase will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="aspect-square rounded-2xl overflow-hidden bg-[hsl(var(--secondary))]">
          {listing.coverArt ? (
            <img src={listing.coverArt} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {listing.type === 'SAMPLE_PACK' ? (
                <Music2 className="w-16 h-16 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <Wand2 className="w-16 h-16 text-[hsl(var(--muted-foreground))]" />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
            {listing.type === 'SAMPLE_PACK' ? 'Sample pack' : 'Prompt preset'}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{listing.title}</h1>
          {listing.seller && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              by{' '}
              <Link href={`/profile/${listing.seller.username}`} className="text-purple-300 hover:underline">
                {listing.seller.displayName || listing.seller.username}
              </Link>
            </p>
          )}

          {listing.description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-line mb-4">
              {listing.description}
            </p>
          )}

          {listing.sampleAudioUrl && (
            <audio src={listing.sampleAudioUrl} controls className="w-full mb-4" preload="metadata" />
          )}

          <div className="mt-auto pt-4 border-t border-[hsl(var(--border))]">
            <div className="text-3xl font-bold text-white mb-3">
              ${(listing.priceCents / 100).toFixed(2)}
              <span className="text-sm font-normal text-[hsl(var(--muted-foreground))] ml-2">
                · {listing.purchaseCount} sold
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={buy}
                disabled={buying}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition-transform"
              >
                {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                Buy now
              </button>
              {listing.type === 'PROMPT_PRESET' && (listing.hasPurchased || listing.sellerUserId === user?.id) && (
                <button
                  onClick={usePreset}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-[hsl(var(--border))] text-white text-sm font-medium hover:bg-[hsl(var(--accent))]/20"
                >
                  <Wand2 className="w-4 h-4" />
                  Use preset
                </button>
              )}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
              {listing.type === 'SAMPLE_PACK'
                ? 'Includes a downloadable sample bundle after purchase.'
                : "After purchase, this preset preloads the Create wizard with the seller's recipe."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
