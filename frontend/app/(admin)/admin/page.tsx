'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import {
  Users, Bot, Music, Play, Crown, AlertTriangle,
  Sparkles, TrendingUp, Flag,
  Video, ArrowRight, Activity, Zap,
} from 'lucide-react';

interface Dashboard {
  users: { total: number; new7d: number; new30d: number };
  content: { agents: number; tracks: number; totalPlays: number; plays7d: number };
  generations: {
    musicTotal: number; music30d: number; music24h: number;
    musicCompleted: number; musicFailed: number;
    videoTotal: number; video30d: number;
  };
  subscriptions: {
    byTier: Record<string, number>;
    active: Record<string, number>;
    mrrUsd: number;
    arrUsd: number;
  };
  revenue: {
    platformRevenueUsd: number;
    grossPaymentsUsd: number;
    tipsCount: number; tipsGrossUsd: number; tipsFeeUsd: number;
    syncCount: number; syncGrossUsd: number; syncFeeUsd: number;
    channelSubCount: number; channelSubGrossUsd: number;
  };
  costs: {
    totalSpendUsd: number;
    musicSpendUsd: number;
    videoSpendUsd: number;
    perMusicUsd: number;
    perVideo6sUsd: number;
  };
  moderation: { pendingReports: number; pendingTakedowns: number };
  pricing: Record<string, number>;
}

const fmt = (n: number) => n.toLocaleString();
const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function AdminOverviewPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = getAdminApi();
        const res = await api.get('/admin/dashboard');
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load dashboard');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
        {error}
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;

  const profit = data.revenue.platformRevenueUsd - data.costs.totalSpendUsd;
  const margin =
    data.revenue.platformRevenueUsd > 0
      ? (profit / data.revenue.platformRevenueUsd) * 100
      : 0;
  const generationSuccess =
    data.generations.musicCompleted + data.generations.musicFailed > 0
      ? (data.generations.musicCompleted /
          (data.generations.musicCompleted + data.generations.musicFailed)) * 100
      : 100;

  return (
    <div className="space-y-6">
      {/* Hero KPI row */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Overview</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Live snapshot of platform health, revenue, and AI spend.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Total users"
          value={fmt(data.users.total)}
          delta={data.users.new7d > 0 ? `+${data.users.new7d} this week` : undefined}
          icon={<Users className="w-4 h-4" />}
          tint="blue"
        />
        <Kpi
          label="MRR"
          value={fmtMoney(data.subscriptions.mrrUsd)}
          delta={`${fmtMoney(data.subscriptions.arrUsd)} ARR`}
          icon={<TrendingUp className="w-4 h-4" />}
          tint="green"
        />
        <Kpi
          label="AI spend (lifetime)"
          value={fmtMoney(data.costs.totalSpendUsd)}
          delta={`${fmt(data.generations.music24h)} gens last 24h`}
          icon={<Zap className="w-4 h-4" />}
          tint="amber"
        />
        <Kpi
          label="Net margin"
          value={`${margin.toFixed(0)}%`}
          delta={profit >= 0 ? `+${fmtMoney(profit)} profit` : `${fmtMoney(profit)} loss`}
          icon={<Activity className="w-4 h-4" />}
          tint={profit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Subscription funnel + Revenue breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Subscription mix" cta={<Link href="/admin/revenue" className="text-xs text-[hsl(var(--accent))] hover:underline flex items-center gap-1">Details <ArrowRight className="w-3 h-3" /></Link>}>
          <SubscriptionMix
            byTier={data.subscriptions.byTier}
            active={data.subscriptions.active}
            pricing={data.pricing}
            total={data.users.total}
          />
        </Card>

        <Card title="Revenue streams" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Subscriptions" value={fmtMoney(data.subscriptions.mrrUsd)} sub="per month" tint="green" />
            <Mini label="Tips fees" value={fmtMoney(data.revenue.tipsFeeUsd)} sub={`${fmt(data.revenue.tipsCount)} tips`} tint="purple" />
            <Mini label="Sync licensing" value={fmtMoney(data.revenue.syncFeeUsd)} sub={`${fmt(data.revenue.syncCount)} sales`} tint="cyan" />
            <Mini label="Channel subs" value={fmtMoney(data.revenue.channelSubGrossUsd)} sub={`${fmt(data.revenue.channelSubCount)} active`} tint="amber" />
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 text-xs flex items-center justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Gross processed (lifetime)</span>
            <span className="font-mono font-semibold">{fmtMoney(data.revenue.grossPaymentsUsd)}</span>
          </div>
        </Card>
      </div>

      {/* Generations + Cost section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="AI Generations" className="lg:col-span-2" cta={<Link href="/admin/generations" className="text-xs text-[hsl(var(--accent))] hover:underline flex items-center gap-1">View feed <ArrowRight className="w-3 h-3" /></Link>}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Music (total)" value={fmt(data.generations.musicTotal)} sub={`${fmt(data.generations.music30d)} last 30d`} icon={<Music className="w-3.5 h-3.5" />} />
            <Mini label="Music (24h)" value={fmt(data.generations.music24h)} sub="last day" icon={<Sparkles className="w-3.5 h-3.5" />} />
            <Mini label="Video" value={fmt(data.generations.videoTotal)} sub={`${fmt(data.generations.video30d)} last 30d`} icon={<Video className="w-3.5 h-3.5" />} />
            <Mini label="Success rate" value={`${generationSuccess.toFixed(1)}%`} sub={`${fmt(data.generations.musicFailed)} failed`} tint={generationSuccess > 90 ? 'green' : 'amber'} />
          </div>
        </Card>

        <Card title="AI cost breakdown">
          <div className="space-y-3">
            <CostRow icon={<Music className="w-3.5 h-3.5" />} label="Music" value={data.costs.musicSpendUsd} per={`${fmtMoney(data.costs.perMusicUsd)}/gen`} />
            <CostRow icon={<Video className="w-3.5 h-3.5" />} label="Video" value={data.costs.videoSpendUsd} per={`~${fmtMoney(data.costs.perVideo6sUsd)}/clip`} />
            <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Total</span>
              <span className="font-mono font-bold text-amber-300">{fmtMoney(data.costs.totalSpendUsd)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Content + Moderation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Content">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="AI Agents" value={fmt(data.content.agents)} icon={<Bot className="w-3.5 h-3.5" />} />
            <Mini label="Tracks" value={fmt(data.content.tracks)} icon={<Music className="w-3.5 h-3.5" />} />
            <Mini label="Plays (lifetime)" value={fmt(data.content.totalPlays)} icon={<Play className="w-3.5 h-3.5" />} />
            <Mini label="Plays (7d)" value={fmt(data.content.plays7d)} sub={`${fmt(data.content.plays7d)}`} icon={<TrendingUp className="w-3.5 h-3.5" />} />
          </div>
        </Card>

        <Card title="Moderation queue" className="lg:col-span-2" cta={<Link href="/admin/reports" className="text-xs text-[hsl(var(--accent))] hover:underline flex items-center gap-1">Triage <ArrowRight className="w-3 h-3" /></Link>}>
          <div className="grid grid-cols-2 gap-3">
            <ModerationTile
              count={data.moderation.pendingReports}
              label="Pending reports"
              icon={<Flag className="w-4 h-4" />}
              href="/admin/reports"
            />
            <ModerationTile
              count={data.moderation.pendingTakedowns}
              label="Pending DMCA takedowns"
              icon={<AlertTriangle className="w-4 h-4" />}
              href="/admin/reports"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── UI primitives ───────────────────────────────────────

function Card({
  title, children, className, cta,
}: {
  title: string; children: React.ReactNode; className?: string; cta?: React.ReactNode;
}) {
  return (
    <div className={`bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {cta}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  label, value, delta, icon, tint = 'blue',
}: {
  label: string; value: string; delta?: string; icon: React.ReactNode;
  tint?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'cyan';
}) {
  const tints: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-300',
    green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-300',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-300',
    red: 'from-rose-500/20 to-rose-500/5 text-rose-300',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300',
  };
  return (
    <div className="relative bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5 overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${tints[tint]} blur-2xl opacity-50`} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tints[tint]} flex items-center justify-center`}>{icon}</div>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{label}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {delta && <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{delta}</div>}
      </div>
    </div>
  );
}

function Mini({
  label, value, sub, icon, tint,
}: {
  label: string; value: string; sub?: string; icon?: React.ReactNode;
  tint?: 'green' | 'amber' | 'purple' | 'cyan';
}) {
  const tintColors: Record<string, string> = {
    green: 'text-emerald-300',
    amber: 'text-amber-300',
    purple: 'text-purple-300',
    cyan: 'text-cyan-300',
  };
  return (
    <div className="bg-[hsl(var(--secondary))]/40 rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-lg font-bold ${tint ? tintColors[tint] : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{sub}</div>}
    </div>
  );
}

function CostRow({ icon, label, value, per }: { icon: React.ReactNode; label: string; value: number; per: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
        <span className="text-amber-300">{icon}</span>
        <span>{label}</span>
        <span className="text-[10px] opacity-60">{per}</span>
      </div>
      <span className="font-mono text-white">{fmtMoney(value)}</span>
    </div>
  );
}

function SubscriptionMix({
  byTier, active, pricing, total,
}: {
  byTier: Record<string, number>; active: Record<string, number>;
  pricing: Record<string, number>; total: number;
}) {
  const tiers: Array<{ key: string; label: string; gradient: string; icon: React.ReactNode }> = [
    { key: 'FREE', label: 'Free', gradient: 'from-gray-500 to-gray-600', icon: <Sparkles className="w-3 h-3" /> },
    { key: 'CREATOR', label: 'Creator', gradient: 'from-amber-500 to-orange-500', icon: <Zap className="w-3 h-3" /> },
    { key: 'PREMIUM', label: 'Premium', gradient: 'from-purple-500 to-fuchsia-500', icon: <Crown className="w-3 h-3" /> },
  ];

  // FREE counts: total users minus everyone with an active paid sub.
  const paidActive = (active['CREATOR'] || 0) + (active['PREMIUM'] || 0);
  const freeCount = Math.max(0, total - paidActive);

  return (
    <div className="space-y-3">
      {tiers.map((t) => {
        const count = t.key === 'FREE' ? freeCount : active[t.key] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={t.key}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-medium text-white">
                {t.icon}
                <span>{t.label}</span>
                <span className="text-[hsl(var(--muted-foreground))] text-[10px] font-normal">
                  {pricing[t.key] != null ? fmtMoney(pricing[t.key]!) + '/mo' : ''}
                </span>
              </div>
              <span className="text-[hsl(var(--muted-foreground))] font-mono">
                {fmt(count)} <span className="opacity-50">·</span> {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${t.gradient} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {byTier['CREATOR'] != null && byTier['CREATOR'] - (active['CREATOR'] || 0) > 0 && (
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] pt-1">
          {(byTier['CREATOR'] - (active['CREATOR'] || 0))} cancelled / past-due Creator subs
        </p>
      )}
    </div>
  );
}

function ModerationTile({
  count, label, icon, href,
}: { count: number; label: string; icon: React.ReactNode; href: string }) {
  const urgent = count > 0;
  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
        urgent
          ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10'
          : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
      }`}
    >
      <div>
        <div className={`text-2xl font-bold ${urgent ? 'text-amber-300' : 'text-emerald-300'}`}>{count}</div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
      </div>
      <div className={urgent ? 'text-amber-300' : 'text-emerald-300'}>{icon}</div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-[hsl(var(--card))] rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-[hsl(var(--card))] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-[hsl(var(--card))] rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
