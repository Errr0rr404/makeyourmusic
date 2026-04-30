'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import {
  Crown, Zap, Sparkles, Heart, FileText, ListMusic,
  TrendingUp, ArrowUpRight, DollarSign,
} from 'lucide-react';

interface Revenue {
  pricing: Record<string, number>;
  tierBreakdown: Record<'FREE' | 'CREATOR' | 'PREMIUM', { count: number; mrrUsd: number }>;
  activeSubscriptions: Array<{
    id: string;
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    createdAt: string;
    user: { id: string; username: string; email: string; avatar: string | null };
  }>;
  recentTips: Array<{
    id: string;
    amountCents: number;
    netCents: number;
    platformFeeCents: number;
    currency: string;
    createdAt: string;
    fromUser: { id: string; username: string } | null;
    toUser: { id: string; username: string };
  }>;
  recentSync: Array<{
    id: string;
    amountCents: number;
    netCents: number;
    licenseTier: string;
    createdAt: string;
    buyer: { id: string; username: string } | null;
    track: { id: string; slug: string; title: string };
  }>;
  recentChannelSubs: Array<{
    id: string;
    amountCents: number;
    currency: string;
    createdAt: string;
    subscriber: { id: string; username: string };
    creator: { id: string; username: string };
    playlist: { id: string; slug: string; title: string };
  }>;
}

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const cents = (n: number) => fmtMoney(n / 100);

export default function AdminRevenuePage() {
  const [data, setData] = useState<Revenue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = getAdminApi();
        const res = await api.get('/admin/revenue');
        if (!cancelled) setData(res.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load revenue');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>;
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[hsl(var(--card))] rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-[hsl(var(--card))] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalMrr = Object.values(data.tierBreakdown).reduce((acc, t) => acc + t.mrrUsd, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Subscriptions, tips, sync licensing, and channel subs.
        </p>
      </div>

      {/* Pricing tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PriceTile
          tier="FREE"
          name="Free"
          price={data.pricing.FREE || 0}
          icon={<Sparkles className="w-4 h-4" />}
          gradient="from-gray-500 to-gray-600"
          breakdown={data.tierBreakdown.FREE}
          features={['5 generations / day', 'Public tracks', 'Listen to everything']}
        />
        <PriceTile
          tier="CREATOR"
          name="Creator"
          price={data.pricing.CREATOR || 3.99}
          icon={<Zap className="w-4 h-4" />}
          gradient="from-amber-500 to-orange-500"
          breakdown={data.tierBreakdown.CREATOR}
          features={['50 gens / day', 'Tips & paid playlists', 'Stripe payouts', '85% revenue share']}
          highlight
        />
        <PriceTile
          tier="PREMIUM"
          name="Premium"
          price={data.pricing.PREMIUM || 14.99}
          icon={<Crown className="w-4 h-4" />}
          gradient="from-purple-500 to-fuchsia-500"
          breakdown={data.tierBreakdown.PREMIUM}
          features={['100 gens / day', 'Priority queue', 'All Creator features']}
        />
      </div>

      {/* MRR summary */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-300 mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> Monthly Recurring Revenue
          </div>
          <div className="text-3xl font-bold">{fmtMoney(totalMrr)}</div>
          <div className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{fmtMoney(totalMrr * 12)} ARR</div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Creator</div>
            <div className="text-xl font-bold text-amber-300">{data.tierBreakdown.CREATOR.count}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{fmtMoney(data.tierBreakdown.CREATOR.mrrUsd)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Premium</div>
            <div className="text-xl font-bold text-purple-300">{data.tierBreakdown.PREMIUM.count}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{fmtMoney(data.tierBreakdown.PREMIUM.mrrUsd)}</div>
          </div>
        </div>
      </div>

      {/* Active subs table */}
      <Section title={`Active subscriptions (${data.activeSubscriptions.length})`} icon={<Crown className="w-4 h-4" />}>
        {data.activeSubscriptions.length === 0 ? (
          <Empty label="No active paid subscriptions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-center px-3 py-2">Tier</th>
                  <th className="text-right px-3 py-2">MRR</th>
                  <th className="text-right px-3 py-2">Started</th>
                  <th className="text-right px-3 py-2">Renews</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.activeSubscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${s.user.id}`} className="inline-flex items-center gap-2 hover:text-[hsl(var(--accent))]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(var(--accent))] to-blue-500 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                          {s.user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            s.user.username.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium">{s.user.username}</div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{s.user.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        s.tier === 'PREMIUM' ? 'bg-purple-500/10 text-purple-300' : 'bg-amber-500/10 text-amber-300'
                      }`}>{s.tier}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-300 text-xs">
                      {fmtMoney(data.pricing[s.tier] || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">
                      {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/admin/users/${s.user.id}`} className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-white/5 text-[hsl(var(--muted-foreground))]">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Recent tips */}
      <Section title={`Recent tips (${data.recentTips.length})`} icon={<Heart className="w-4 h-4" />}>
        {data.recentTips.length === 0 ? (
          <Empty label="No tips yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="text-left px-3 py-2">From</th>
                  <th className="text-left px-3 py-2">To</th>
                  <th className="text-right px-3 py-2">Gross</th>
                  <th className="text-right px-3 py-2">Fee</th>
                  <th className="text-right px-3 py-2">Net to creator</th>
                  <th className="text-right px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTips.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-xs">{t.fromUser?.username || 'Anonymous'}</td>
                    <td className="px-3 py-2 text-xs font-medium">{t.toUser.username}</td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-emerald-300">{cents(t.amountCents)}</td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-[hsl(var(--muted-foreground))]">{cents(t.platformFeeCents)}</td>
                    <td className="px-3 py-2 text-right text-xs font-mono">{cents(t.netCents)}</td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Sync licenses */}
      <Section title={`Recent sync licenses (${data.recentSync.length})`} icon={<FileText className="w-4 h-4" />}>
        {data.recentSync.length === 0 ? (
          <Empty label="No sync sales yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="text-left px-3 py-2">Buyer</th>
                  <th className="text-left px-3 py-2">Track</th>
                  <th className="text-center px-3 py-2">Tier</th>
                  <th className="text-right px-3 py-2">Gross</th>
                  <th className="text-right px-3 py-2">Net</th>
                  <th className="text-right px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSync.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-xs">{s.buyer?.username || 'Guest'}</td>
                    <td className="px-3 py-2 text-xs">
                      <Link href={`/track/${s.track.slug}`} target="_blank" className="text-[hsl(var(--accent))] hover:underline">{s.track.title}</Link>
                    </td>
                    <td className="px-3 py-2 text-center"><span className="text-[10px] uppercase tracking-wider text-cyan-300">{s.licenseTier}</span></td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-emerald-300">{cents(s.amountCents)}</td>
                    <td className="px-3 py-2 text-right text-xs font-mono">{cents(s.netCents)}</td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Channel subs */}
      <Section title={`Channel subscriptions (${data.recentChannelSubs.length})`} icon={<ListMusic className="w-4 h-4" />}>
        {data.recentChannelSubs.length === 0 ? (
          <Empty label="No channel subscriptions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="text-left px-3 py-2">Subscriber</th>
                  <th className="text-left px-3 py-2">Creator</th>
                  <th className="text-left px-3 py-2">Playlist</th>
                  <th className="text-right px-3 py-2">Monthly</th>
                  <th className="text-right px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentChannelSubs.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-xs">{s.subscriber.username}</td>
                    <td className="px-3 py-2 text-xs font-medium">{s.creator.username}</td>
                    <td className="px-3 py-2 text-xs"><Link href={`/playlist/${s.playlist.slug}`} target="_blank" className="text-[hsl(var(--accent))] hover:underline">{s.playlist.title}</Link></td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-emerald-300">{cents(s.amountCents)}</td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">{icon}{title}</h2>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">
      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
      {label}
    </div>
  );
}

function PriceTile({
  tier, name, price, icon, gradient, breakdown, features, highlight,
}: {
  tier: 'FREE' | 'CREATOR' | 'PREMIUM';
  name: string; price: number; icon: React.ReactNode; gradient: string;
  breakdown: { count: number; mrrUsd: number };
  features: string[]; highlight?: boolean;
}) {
  return (
    <div className={`relative bg-[hsl(var(--card))] border rounded-2xl p-5 overflow-hidden ${highlight ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' : 'border-white/5'}`}>
      {highlight && (
        <div className="absolute top-3 right-3 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
          Lead tier
        </div>
      )}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <h3 className="font-bold">{name}</h3>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold">{tier === 'FREE' ? '$0' : fmtMoney(price)}</span>
        {tier !== 'FREE' && <span className="text-xs text-[hsl(var(--muted-foreground))]">/ month</span>}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Active</span>
        <span className="font-mono font-semibold">{breakdown.count}</span>
      </div>
      {tier !== 'FREE' && (
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-[hsl(var(--muted-foreground))]">MRR</span>
          <span className="font-mono font-semibold text-emerald-300">{fmtMoney(breakdown.mrrUsd)}</span>
        </div>
      )}

      <ul className="mt-4 space-y-1.5 text-xs text-[hsl(var(--muted-foreground))]">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-emerald-400 mt-0.5">·</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
