'use client';

import { useEffect, useState } from 'react';
import { Heart, Loader2, X } from 'lucide-react';
import api from '@/lib/api';
import { validatePaymentRedirect } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface TipButtonProps {
  creatorUserId: string;
  creatorName: string;
  trackId?: string;
  variant?: 'default' | 'compact';
}

const PRESETS = [100, 500, 1000, 2500];

export function TipButton({ creatorUserId, creatorName, trackId, variant = 'default' }: TipButtonProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [creatorAcceptsTips, setCreatorAcceptsTips] = useState<boolean | null>(null);

  // Disable self-tipping.
  const isSelf = user?.id === creatorUserId;

  // Lazily check if creator can receive tips when modal opens.
  useEffect(() => {
    if (!open || creatorAcceptsTips !== null) return;
    // We don't have a public endpoint for this — assume yes and let the
    // checkout call surface a clear error if not. Setting to true to skip
    // re-check until we add a public /users/:id/monetization endpoint.
    setCreatorAcceptsTips(true);
  }, [open, creatorAcceptsTips]);

  const submit = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    let amountCents = amount;
    if (custom) {
      const parsed = Math.round(parseFloat(custom) * 100);
      if (Number.isFinite(parsed) && parsed >= 100) amountCents = parsed;
    }
    if (amountCents < 100 || amountCents > 50000) {
      toast.error('Tip must be between $1 and $500');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/creator/tips/checkout', {
        creatorUserId,
        amountCents,
        message: message.trim() || undefined,
        trackId,
      });
      const safe = validatePaymentRedirect(res.data?.url);
      if (safe) {
        window.location.href = safe;
      } else {
        toast.error('Could not start checkout');
      }
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Tip failed');
    } finally {
      setBusy(false);
    }
  };

  if (isSelf) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === 'compact'
            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/15 text-pink-300 text-xs font-medium hover:bg-pink-500/25 transition-colors'
            : 'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/15 text-pink-300 text-sm font-medium hover:bg-pink-500/25 transition-colors'
        }
      >
        <Heart className="w-4 h-4" /> Tip
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div
            className="w-full md:max-w-sm bg-[hsl(var(--card))] rounded-t-2xl md:rounded-2xl border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Tip {creatorName}</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-white/5 text-[hsl(var(--muted-foreground))]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESETS.map((cents) => (
                <button
                  key={cents}
                  onClick={() => { setAmount(cents); setCustom(''); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    amount === cents && !custom
                      ? 'bg-white text-black'
                      : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'
                  }`}
                >
                  ${cents / 100}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="500"
              step="0.01"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom amount ($1–$500)"
              className="w-full bg-[hsl(var(--secondary))] text-white text-sm rounded-lg px-3 py-2 mb-3 border border-white/5 focus:outline-none focus:border-[hsl(var(--accent))]"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              placeholder="Say something nice (optional)"
              rows={3}
              className="w-full bg-[hsl(var(--secondary))] text-white text-sm rounded-lg px-3 py-2 mb-4 border border-white/5 focus:outline-none focus:border-[hsl(var(--accent))] resize-none"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="w-full py-2.5 rounded-full bg-pink-500 text-white text-sm font-semibold hover:bg-pink-400 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              Send tip
            </button>
            <p className="text-[10px] text-center text-[hsl(var(--muted-foreground))] mt-2">
              Secure checkout via Stripe. 15% platform fee.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
