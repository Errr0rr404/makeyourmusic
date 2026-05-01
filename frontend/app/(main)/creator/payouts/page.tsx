'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { validatePaymentRedirect } from '@/lib/utils';
import { Loader2, Lock, ExternalLink, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ConnectAccount {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'RESTRICTED' | 'DISCONNECTED';
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  country: string | null;
  defaultCurrency: string | null;
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<div className="h-20 bg-[hsl(var(--secondary))] rounded-xl animate-pulse" />}>
      <PayoutsPageInner />
    </Suspense>
  );
}

function PayoutsPageInner() {
  const params = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [account, setAccount] = useState<ConnectAccount | null>(null);
  const [tier, setTier] = useState<'FREE' | 'CREATOR' | 'PREMIUM'>('FREE');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [statusRes, subRes] = await Promise.all([
        api.get('/creator/connect/status'),
        api.get('/subscription'),
      ]);
      setAccount(statusRes.data?.account || null);
      const sub = subRes.data?.subscription;
      if (sub?.status === 'ACTIVE') setTier(sub.tier);
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load Connect status');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [isAuthenticated]);

  // After Stripe redirects back with ?onboarded=1, hit refresh endpoint to pull latest state.
  useEffect(() => {
    if (params.get('onboarded') === '1' || params.get('refresh') === '1') {
      api.post('/creator/connect/refresh')
        .then((res) => {
          setAccount(res.data?.account || null);
          if (res.data?.canMonetize) toast.success('Payouts enabled — you can accept tips!');
        })
        .catch(() => undefined);
    }
  }, [params]);

  const handleStartOnboarding = async () => {
    setBusy(true);
    try {
      const res = await api.post('/creator/connect/onboarding-link');
      const safe = validatePaymentRedirect(res.data?.url);
      if (safe) window.location.href = safe;
      else toast.error('Could not start onboarding');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to start onboarding');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDashboard = async () => {
    setBusy(true);
    try {
      const res = await api.post('/creator/connect/dashboard-link');
      const safe = validatePaymentRedirect(res.data?.url);
      if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
      else toast.error('Could not open dashboard');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to open Stripe dashboard');
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Lock className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p className="text-[hsl(var(--muted-foreground))]">Log in to set up payouts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-[hsl(var(--secondary))] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const isPaidTier = tier === 'CREATOR' || tier === 'PREMIUM';
  const isActive = account?.status === 'ACTIVE' && account?.payoutsEnabled;

  return (
    <div className="space-y-6 max-w-2xl">
      {!isPaidTier && (
        <div className="rounded-xl p-5 bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-400/30">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-purple-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Upgrade to Creator first</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                Set up payouts and start monetizing requires the Creator plan ($3.99/mo).
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-purple-200"
              >
                See pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl p-5 bg-[hsl(var(--card))] border border-white/5">
        <h2 className="font-semibold text-white mb-1">Stripe Connect</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          We use Stripe to handle payments and pay you out. Your bank info stays with Stripe — we never see it.
        </p>

        {!account && (
          <button
            onClick={handleStartOnboarding}
            disabled={busy || !isPaidTier}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Set up payouts
          </button>
        )}

        {account && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isActive ? (
                <><CheckCircle2 className="w-5 h-5 text-emerald-400" /><span className="text-emerald-300 font-medium">Active — ready to receive payouts</span></>
              ) : account.status === 'RESTRICTED' ? (
                <><AlertCircle className="w-5 h-5 text-amber-400" /><span className="text-amber-300 font-medium">Restricted — Stripe needs more info</span></>
              ) : (
                <><AlertCircle className="w-5 h-5 text-amber-400" /><span className="text-amber-300 font-medium">Onboarding incomplete</span></>
              )}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
              <div>Charges: {account.chargesEnabled ? 'enabled' : 'disabled'}</div>
              <div>Payouts: {account.payoutsEnabled ? 'enabled' : 'disabled'}</div>
              <div>Details submitted: {account.detailsSubmitted ? 'yes' : 'no'}</div>
              {account.country && <div>Country: {account.country.toUpperCase()}</div>}
            </div>

            <div className="flex gap-2 pt-2">
              {!isActive && (
                <button
                  onClick={handleStartOnboarding}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.02] disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Continue onboarding
                </button>
              )}
              {isActive && (
                <button
                  onClick={handleOpenDashboard}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--secondary))] text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Open Stripe dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 bg-[hsl(var(--card))] border border-white/5 text-xs text-[hsl(var(--muted-foreground))]">
        <strong className="text-white">How payouts work:</strong> When fans tip you or subscribe to your paid playlists, the money lands in your Stripe balance. Stripe pays it out to your bank on a rolling schedule (usually weekly). The platform takes 15% of each transaction.
      </div>
    </div>
  );
}
