'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Lock, TrendingUp, Users, Heart } from 'lucide-react';
import Link from 'next/link';

interface EarningsSummary {
  canMonetize: boolean;
  connectStatus: string | null;
  lifetime: { tipsNetCents: number; tipsCount: number };
  thisMonth: { tipsNetCents: number; tipsCount: number };
  activeSubscribers: number;
  monthlyRecurringNetCents: number;
  recentTips: Array<{
    id: string;
    amountCents: number;
    netCents: number;
    message: string | null;
    createdAt: string;
    fromUser: { id: string; username: string; displayName: string | null; avatar: string | null } | null;
  }>;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function EarningsPage() {
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    api.get('/creator/earnings/summary')
      .then((res) => setData(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Lock className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p className="text-[hsl(var(--muted-foreground))]">Log in to see your earnings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-[hsl(var(--secondary))] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.canMonetize) {
    return (
      <div className="rounded-xl p-5 bg-[hsl(var(--card))] border border-white/5">
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
          Set up payouts to start receiving tips and channel subscriptions.
        </p>
        <Link
          href="/creator/payouts"
          className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.02]"
        >
          Go to Payouts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Earned this month" value={fmt(data.thisMonth.tipsNetCents + data.monthlyRecurringNetCents)} />
        <Stat label="Lifetime tips" value={fmt(data.lifetime.tipsNetCents)} sub={`${data.lifetime.tipsCount} tip${data.lifetime.tipsCount === 1 ? '' : 's'}`} />
        <Stat label="MRR (channel subs)" value={fmt(data.monthlyRecurringNetCents)} sub={`${data.activeSubscribers} subscriber${data.activeSubscribers === 1 ? '' : 's'}`} icon={<TrendingUp className="w-4 h-4" />} />
        <Stat label="Active subscribers" value={String(data.activeSubscribers)} icon={<Users className="w-4 h-4" />} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-400" /> Recent tips
        </h2>
        {data.recentTips.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No tips yet — share your profile to get started.</p>
        ) : (
          <div className="space-y-2">
            {data.recentTips.map((tip) => (
              <div key={tip.id} className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--card))] border border-white/5">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-medium text-purple-300 flex-shrink-0">
                  {(tip.fromUser?.displayName || tip.fromUser?.username || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {tip.fromUser?.displayName || tip.fromUser?.username || 'Anonymous'}
                  </p>
                  {tip.message && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">&ldquo;{tip.message}&rdquo;</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-emerald-400">+{fmt(tip.netCents)}</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {new Date(tip.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 bg-[hsl(var(--card))] border border-white/5">
      <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] mb-1">
        {icon} <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{sub}</div>}
    </div>
  );
}
