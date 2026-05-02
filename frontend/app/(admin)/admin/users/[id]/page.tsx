'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import {
  ArrowLeft, Mail, MailX, Calendar, Bot, Music, Video,
  DollarSign, Crown, Zap, Sparkles, ExternalLink, CheckCircle,
  XCircle, Clock, AlertTriangle, Hash, Heart, ListMusic, Headphones,
} from 'lucide-react';

interface Detail {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    role: string;
    bio: string | null;
    createdAt: string;
    emailVerified: boolean;
    subscription: Record<string, unknown> | null;
    connectAccount: Record<string, unknown> | null;
    agents: Array<{
      id: string; name: string; slug: string; avatar: string | null;
      status: string; totalPlays: number; followerCount: number;
      createdAt: string; _count: { tracks: number };
    }>;
    counts: {
      playlists: number; likes: number; follows: number; plays: number;
      tipsReceived: number; tipsSent: number;
    };
  };
  stats: {
    tier: string;
    monthlyRevenueUsd: number;
    estCostUsd: number;
    music: { total: number; byStatus: Record<string, number> };
    video: { total: number; byStatus: Record<string, number> };
    tipsReceived: { count: number; grossUsd: number; netUsd: number; platformFeeUsd: number };
    tipsSent: { count: number; grossUsd: number };
    syncSold: { count: number; grossUsd: number; netUsd: number };
    channelSubscribers: { count: number; monthlyGrossUsd: number };
  };
  recentMusic: Array<{
    id: string; title: string | null; status: string;
    providerModel: string | null; durationSec: number | null;
    createdAt: string; audioUrl: string | null;
    track: { id: string; slug: string; title: string } | null;
    errorMessage: string | null;
  }>;
  recentVideo: Array<{
    id: string; title: string | null; status: string;
    resolution: string | null; durationSec: number | null;
    createdAt: string; videoUrl: string | null;
  }>;
}

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = getAdminApi();
        const res = await api.get(`/admin/users/${id}`);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load user');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <div>
        <BackLink />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-32 bg-[hsl(var(--card))] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-[hsl(var(--card))] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { user, stats, recentMusic, recentVideo } = data;

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Profile header */}
      <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-[hsl(var(--accent))]/20 to-blue-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-blue-500 flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              (user.displayName || user.username).slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{user.displayName || user.username}</h1>
              <TierBadge tier={stats.tier} />
              <RoleBadge role={user.role} />
              {user.emailVerified ? (
                <span className="text-emerald-400 inline-flex items-center gap-1 text-xs">
                  <Mail className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="text-[hsl(var(--muted-foreground))] inline-flex items-center gap-1 text-xs">
                  <MailX className="w-3 h-3" /> Unverified
                </span>
              )}
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 break-all">{user.email}</p>
            {user.bio && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">{user.bio}</p>}
            <div className="flex items-center gap-3 mt-3 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Hash className="w-3 h-3" /> <span className="font-mono">{user.id.slice(0, 12)}…</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Money KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MoneyCard
          label="Monthly subscription"
          value={stats.monthlyRevenueUsd}
          color="emerald"
          icon={<Crown className="w-4 h-4" />}
          sub={(user.subscription as { status?: string } | null)?.status || 'FREE'}
        />
        <MoneyCard
          label="AI cost (lifetime)"
          value={stats.estCostUsd}
          color="amber"
          icon={<Zap className="w-4 h-4" />}
          sub={`${stats.music.total} music · ${stats.video.total} video`}
        />
        <MoneyCard
          label="Tips received"
          value={stats.tipsReceived.grossUsd}
          color="purple"
          icon={<Heart className="w-4 h-4" />}
          sub={`${stats.tipsReceived.count} tips · ${fmtMoney(stats.tipsReceived.netUsd)} net`}
        />
        <MoneyCard
          label="Sync licenses sold"
          value={stats.syncSold.grossUsd}
          color="cyan"
          icon={<DollarSign className="w-4 h-4" />}
          sub={`${stats.syncSold.count} sales`}
        />
      </div>

      {/* Subscription detail */}
      {user.subscription && (
        <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-3">Subscription</h2>
          {(() => {
            const sub = user.subscription as { tier?: string; status?: string; currentPeriodStart?: string; currentPeriodEnd?: string; stripeCustomerId?: string; stripeSubId?: string } | null;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <DetailRow label="Tier" value={sub?.tier || '—'} />
                <DetailRow label="Status" value={sub?.status || '—'} />
                <DetailRow
                  label="Period start"
                  value={sub?.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : '—'}
                />
                <DetailRow
                  label="Renews / ends"
                  value={sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                />
                {sub?.stripeCustomerId && (
                  <DetailRow label="Stripe customer" value={sub.stripeCustomerId} mono />
                )}
                {sub?.stripeSubId && (
                  <DetailRow label="Stripe sub" value={sub.stripeSubId} mono />
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Activity counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <ActivityChip icon={<Bot className="w-3.5 h-3.5" />} label="Agents" value={user.agents.length} />
        <ActivityChip icon={<ListMusic className="w-3.5 h-3.5" />} label="Playlists" value={user.counts.playlists} />
        <ActivityChip icon={<Heart className="w-3.5 h-3.5" />} label="Likes" value={user.counts.likes} />
        <ActivityChip icon={<Headphones className="w-3.5 h-3.5" />} label="Plays" value={user.counts.plays} />
        <ActivityChip icon={<DollarSign className="w-3.5 h-3.5" />} label="Tips sent" value={stats.tipsSent.count} />
        <ActivityChip icon={<DollarSign className="w-3.5 h-3.5" />} label="Channel subs" value={stats.channelSubscribers.count} />
      </div>

      {/* Generation status pies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GenerationStatusCard
          title="Music generations"
          icon={<Music className="w-4 h-4" />}
          total={stats.music.total}
          byStatus={stats.music.byStatus}
        />
        <GenerationStatusCard
          title="Video generations"
          icon={<Video className="w-4 h-4" />}
          total={stats.video.total}
          byStatus={stats.video.byStatus}
        />
      </div>

      {/* Agents */}
      {user.agents.length > 0 && (
        <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-3">AI Agents ({user.agents.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.agents.map((a) => (
              <Link
                key={a.id}
                href={`/agent/${a.slug}`}
                target="_blank"
                className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--secondary))]/40 hover:bg-[hsl(var(--secondary))] transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                  {a.avatar ? (
                    <img src={a.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    a.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">{a.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${a.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {a._count.tracks} tracks · {a.totalPlays.toLocaleString()} plays · {a.followerCount} followers
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent music generations */}
      <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3">Recent music generations</h2>
        {recentMusic.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No music generations yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-center px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Model</th>
                  <th className="text-right px-3 py-2">Duration</th>
                  <th className="text-right px-3 py-2">Created</th>
                  <th className="text-right px-3 py-2">Track</th>
                </tr>
              </thead>
              <tbody>
                {recentMusic.map((g) => (
                  <tr key={g.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 font-medium text-white truncate max-w-[200px]">
                      {g.title || <span className="text-[hsl(var(--muted-foreground))]">Untitled</span>}
                    </td>
                    <td className="px-3 py-2 text-center"><GenStatus status={g.status} /></td>
                    <td className="px-3 py-2 text-[hsl(var(--muted-foreground))] text-xs font-mono">{g.providerModel || '—'}</td>
                    <td className="px-3 py-2 text-right text-xs">{g.durationSec ? `${g.durationSec}s` : '—'}</td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {g.track ? (
                        <Link
                          href={`/track/${g.track.slug}`}
                          target="_blank"
                          className="text-[hsl(var(--accent))] inline-flex items-center gap-1 text-xs hover:underline"
                        >
                          {g.track.title.slice(0, 20)}{g.track.title.length > 20 ? '…' : ''}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))] text-xs">unpublished</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent video */}
      {recentVideo.length > 0 && (
        <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-3">Recent video generations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-center px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Resolution</th>
                  <th className="text-right px-3 py-2">Duration</th>
                  <th className="text-right px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentVideo.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 truncate max-w-[200px]">{v.title || '—'}</td>
                    <td className="px-3 py-2 text-center"><GenStatus status={v.status} /></td>
                    <td className="px-3 py-2 text-right text-xs">{v.resolution || '—'}</td>
                    <td className="px-3 py-2 text-right text-xs">{v.durationSec ? `${v.durationSec}s` : '—'}</td>
                    <td className="px-3 py-2 text-right text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── primitives ──────────────────────────────────────────

function BackLink() {
  return (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
    >
      <ArrowLeft className="w-3 h-3" /> Back to users
    </Link>
  );
}

function MoneyCard({
  label, value, color, icon, sub,
}: {
  label: string; value: number; color: 'emerald' | 'amber' | 'purple' | 'cyan'; icon: React.ReactNode; sub?: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-300',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-300',
    purple: 'from-purple-500/15 to-purple-500/5 text-purple-300',
    cyan: 'from-cyan-500/15 to-cyan-500/5 text-cyan-300',
  };
  return (
    <div className="bg-[hsl(var(--card))] border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</span>
      </div>
      <div className="text-xl font-bold">{fmtMoney(value)}</div>
      {sub && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function ActivityChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-[hsl(var(--card))] border border-white/5 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function GenerationStatusCard({
  title, icon, total, byStatus,
}: { title: string; icon: React.ReactNode; total: number; byStatus: Record<string, number> }) {
  const order: Array<{ k: string; label: string; color: string; icon: React.ReactNode }> = [
    { k: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500', icon: <CheckCircle className="w-3 h-3" /> },
    { k: 'PROCESSING', label: 'Processing', color: 'bg-blue-500', icon: <Clock className="w-3 h-3" /> },
    { k: 'PENDING', label: 'Pending', color: 'bg-gray-500', icon: <Clock className="w-3 h-3" /> },
    { k: 'FAILED', label: 'Failed', color: 'bg-rose-500', icon: <XCircle className="w-3 h-3" /> },
  ];

  return (
    <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">{icon}{title}</h3>
        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{total} total</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">None yet.</p>
      ) : (
        <>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden flex mb-3">
            {order.map((o) => {
              const c = byStatus[o.k] || 0;
              if (c === 0) return null;
              const pct = (c / total) * 100;
              return <div key={o.k} className={o.color} style={{ width: `${pct}%` }} />;
            })}
          </div>
          <div className="space-y-1.5">
            {order.map((o) => {
              const c = byStatus[o.k] || 0;
              return (
                <div key={o.k} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${o.color}`} />
                    <span className="text-[hsl(var(--muted-foreground))]">{o.label}</span>
                  </span>
                  <span className="font-mono">{c}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">{label}</div>
      <div className={`text-sm break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}

function GenStatus({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    COMPLETED: { color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'Done', icon: <CheckCircle className="w-2.5 h-2.5" /> },
    PROCESSING: { color: 'bg-blue-500/10 text-blue-300 border-blue-500/20', label: 'Processing', icon: <Clock className="w-2.5 h-2.5 animate-pulse" /> },
    PENDING: { color: 'bg-gray-500/10 text-gray-300 border-gray-500/20', label: 'Pending', icon: <Clock className="w-2.5 h-2.5" /> },
    FAILED: { color: 'bg-rose-500/10 text-rose-300 border-rose-500/20', label: 'Failed', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  };
  const c = config[status] || config.PENDING!;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const config: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
    FREE: { label: 'Free', bg: 'bg-white/5 text-[hsl(var(--muted-foreground))]', icon: <Sparkles className="w-2.5 h-2.5" /> },
    CREATOR: { label: 'Creator', bg: 'bg-amber-500/10 text-amber-300 border border-amber-500/20', icon: <Zap className="w-2.5 h-2.5" /> },
    PREMIUM: { label: 'Premium', bg: 'bg-purple-500/10 text-purple-300 border border-purple-500/20', icon: <Crown className="w-2.5 h-2.5" /> },
  };
  const c = config[tier] || config.FREE!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'LISTENER') return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border border-[hsl(var(--accent))]/20">
      {role.replace('_', ' ')}
    </span>
  );
}
