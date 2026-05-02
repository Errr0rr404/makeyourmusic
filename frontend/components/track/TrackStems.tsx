'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { validatePaymentRedirect } from '@/lib/utils';
import { toast } from '@/lib/store/toastStore';
import { Music, Mic, Drum, Volume2, Loader2, Sparkles, DollarSign, Download, AlertCircle, Sliders } from 'lucide-react';

type StemStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
interface Stems {
  id: string;
  status: StemStatus;
  drumsUrl?: string | null;
  bassUrl?: string | null;
  vocalsUrl?: string | null;
  otherUrl?: string | null;
  forSaleCents?: number | null;
  errorMessage?: string | null;
  paidAt?: string | null;
}

interface Props {
  trackId: string;
  trackSlug: string;
  isOwner: boolean;
}

const STEM_PARTS: Array<{ key: 'drums' | 'bass' | 'vocals' | 'other'; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'drums', label: 'Drums', Icon: Drum },
  { key: 'bass', label: 'Bass', Icon: Music },
  { key: 'vocals', label: 'Vocals', Icon: Mic },
  { key: 'other', label: 'Other', Icon: Volume2 },
];

export function TrackStems({ trackId, trackSlug, isOwner }: Props) {
  const [stems, setStems] = useState<Stems | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [buying, setBuying] = useState(false);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    try {
      const r = await api.get(`/licenses/tracks/${trackId}/stems`);
      setStems(r.data.stems || null);
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status !== 404) {
        // 404 just means no stems yet — silent
      }
      setStems(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  useEffect(() => {
    // PENDING = paid, waiting for the webhook to start the Replicate job.
    // PROCESSING = job in flight. Poll in both cases.
    // Use a local timer id so the cleanup clears the timer it scheduled —
    // assigning to pollRef.current and cleaning up on the SAME ref let a new
    // effect's id overwrite the old one before the old effect's cleanup ran,
    // doubling the polling rate.
    let timerId: number | null = null;
    if (stems?.status === 'PENDING' || stems?.status === 'PROCESSING') {
      timerId = window.setTimeout(load, 5000);
      pollRef.current = timerId;
    }
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stems?.status]);

  useEffect(() => {
    if (stems?.forSaleCents) {
      setPriceInput(((stems.forSaleCents || 0) / 100).toFixed(2));
    }
  }, [stems?.forSaleCents]);

  // First-time generation: pay the flat fee via Stripe Checkout. The webhook
  // starts the Replicate job after payment lands; on return we'll see the row
  // in PENDING/PROCESSING and the poll loop takes over.
  const startCheckout = async () => {
    setRequesting(true);
    try {
      const r = await api.post(`/licenses/tracks/${trackId}/stems/checkout`);
      const safe = validatePaymentRedirect(r.data?.checkoutUrl);
      if (safe) {
        window.location.href = safe;
        return;
      }
      toast.error('Failed to start checkout');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to start checkout');
    } finally {
      setRequesting(false);
    }
  };

  // Retry path for a previously-paid generation that ended FAILED — no charge.
  const retryStems = async () => {
    setRequesting(true);
    try {
      const r = await api.post(`/licenses/tracks/${trackId}/stems/request`);
      setStems(r.data.stems);
      toast.success('Stem separation restarted');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to retry');
    } finally {
      setRequesting(false);
    }
  };

  const savePrice = async (cents: number | null) => {
    setSavingPrice(true);
    try {
      const r = await api.put(`/licenses/tracks/${trackId}/stems/price`, {
        priceCents: cents,
      });
      setStems(r.data.stems);
      toast.success(cents ? 'Stems are now for sale' : 'Stems removed from sale');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update price');
    } finally {
      setSavingPrice(false);
    }
  };

  const buyStems = async () => {
    setBuying(true);
    try {
      const { data } = await api.post('/licenses/checkout', {
        trackId,
        kind: 'stems',
      });
      const safe = validatePaymentRedirect(data?.checkoutUrl);
      if (safe) window.location.href = safe;
      else toast.error('Could not start checkout');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to start checkout');
    } finally {
      setBuying(false);
    }
  };

  if (loading) return null;

  // Non-owner: show only if for sale
  if (!isOwner) {
    if (!stems || stems.status !== 'READY' || !stems.forSaleCents) return null;
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl p-5 mb-8 border border-[hsl(var(--border))]">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
          Stems available
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Get the isolated drums, bass, vocals, and other tracks for remixing or production.
        </p>
        <button
          onClick={buyStems}
          disabled={buying}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-amber-500/90 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
          Buy stems · ${(stems.forSaleCents / 100).toFixed(2)}
        </button>
      </div>
    );
  }

  // Owner view
  return (
    <div className="bg-[hsl(var(--card))] rounded-xl p-5 mb-8 border border-[hsl(var(--border))]">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
        Stems
      </h3>

      {!stems && (
        <>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Split this track into drums, bass, vocals, and other parts.
            One-time fee of $2.99. Takes 1–3 minutes after payment, then files stay available for download and resale.
          </p>
          <button
            onClick={startCheckout}
            disabled={requesting}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate stems · $2.99
          </button>
        </>
      )}

      {stems?.status === 'PENDING' && (
        <div className="flex items-center gap-3 text-sm text-purple-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Confirming payment…</span>
        </div>
      )}

      {stems?.status === 'PROCESSING' && (
        <div className="flex items-center gap-3 text-sm text-purple-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Separating stems… this takes 1–3 minutes.</span>
        </div>
      )}

      {stems?.status === 'FAILED' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{stems.errorMessage || 'Stem separation failed'}</span>
          </div>
          <button
            onClick={stems.paidAt ? retryStems : startCheckout}
            disabled={requesting}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-[hsl(var(--border))] text-sm font-medium text-white hover:bg-[hsl(var(--accent))]/20"
          >
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {stems.paidAt ? 'Retry (no charge)' : 'Try again · $2.99'}
          </button>
        </div>
      )}

      {stems?.status === 'READY' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {STEM_PARTS.map(({ key, label, Icon }) => {
              const url = (stems as unknown as Record<string, unknown>)[`${key}Url`] as string | null;
              return (
                <a
                  key={key}
                  href={url || '#'}
                  download={url ? `${label.toLowerCase()}.mp3` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                    url
                      ? 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]/10 text-white'
                      : 'border-[hsl(var(--border))]/50 text-[hsl(var(--muted-foreground))] cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                  {url && <Download className="w-3 h-3 opacity-60" />}
                </a>
              );
            })}
          </div>

          {isOwner && (
            <Link
              href={`/track/${trackSlug}/stems-editor`}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-purple-400/40 text-sm font-medium text-purple-200 hover:bg-purple-400/10 mb-4"
            >
              <Sliders className="w-4 h-4" />
              Open stems editor
            </Link>
          )}

          <div className="border-t border-[hsl(var(--border))] pt-4">
            <p className="text-xs font-medium text-white mb-2">Sell stems as a paid bundle</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-24 h-9 px-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
                />
              </div>
              <button
                onClick={() => {
                  // Strict price validation: parseFloat('1abc') silently
                  // accepts as 1, which let users typo "$1.99 USD" and end
                  // up listing for $1.00 instead of $1.99.
                  const trimmed = (priceInput || '').trim();
                  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
                    toast.error('Enter a valid price (e.g. 4.99)');
                    return;
                  }
                  const cents = Math.round(parseFloat(trimmed) * 100);
                  if (!Number.isFinite(cents) || cents <= 0) {
                    toast.error('Enter a valid price');
                    return;
                  }
                  savePrice(cents);
                }}
                disabled={savingPrice}
                className="h-9 px-4 rounded-lg bg-[hsl(var(--accent))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {stems.forSaleCents ? 'Update' : 'List for sale'}
              </button>
              {!!stems.forSaleCents && (
                <button
                  onClick={() => savePrice(null)}
                  disabled={savingPrice}
                  className="h-9 px-3 rounded-lg border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:text-white"
                >
                  Unlist
                </button>
              )}
            </div>
            {!!stems.forSaleCents && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                Listed at ${(stems.forSaleCents / 100).toFixed(2)}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
