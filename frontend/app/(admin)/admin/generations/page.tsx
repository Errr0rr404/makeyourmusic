'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import {
  ChevronLeft, ChevronRight, Music, Video, ExternalLink,
  CheckCircle, Clock, XCircle, AlertTriangle, ArrowUpRight, RefreshCw,
} from 'lucide-react';

type Kind = 'music' | 'video';

interface MusicItem {
  id: string;
  title: string | null;
  status: string;
  providerModel: string | null;
  prompt: string | null;
  durationSec: number | null;
  isInstrumental: boolean;
  audioUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  estCostUsd: number;
  user: { id: string; username: string; email: string; displayName: string | null; avatar: string | null };
  agent: { id: string; name: string; slug: string; avatar: string | null } | null;
  track: { id: string; slug: string; title: string } | null;
}

interface VideoItem {
  id: string;
  title: string | null;
  status: string;
  resolution: string | null;
  durationSec: number | null;
  videoUrl: string | null;
  createdAt: string;
  estCostUsd: number;
  user: { id: string; username: string; email: string; displayName: string | null; avatar: string | null };
}

const fmt = (n: number) => n.toLocaleString();
const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function GenerationsPage() {
  const [kind, setKind] = useState<Kind>('music');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Array<MusicItem | VideoItem>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const params = useMemo(() => {
    const p = new URLSearchParams({ kind, page: String(page), limit: '25' });
    if (status) p.set('status', status);
    return p.toString();
  }, [kind, status, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const api = getAdminApi();
        const res = await api.get(`/admin/generations?${params}`);
        if (cancelled) return;
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        if (!cancelled) setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load generations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params, refreshKey]);

  const totalCost = items.reduce((acc, i) => acc + (i.estCostUsd || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Generations</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Live feed of AI generations · {fmt(total)} total · {fmtMoney(totalCost)} on this page
        </p>
      </div>

      {/* Kind tabs + status filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[hsl(var(--card))] border border-white/5 rounded-lg p-1">
          <KindTab active={kind === 'music'} onClick={() => { setKind('music'); setPage(1); }} icon={<Music className="w-3.5 h-3.5" />}>
            Music
          </KindTab>
          <KindTab active={kind === 'video'} onClick={() => { setKind('video'); setPage(1); }} icon={<Video className="w-3.5 h-3.5" />}>
            Video
          </KindTab>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-[hsl(var(--card))] border border-white/5 rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--card))] border border-white/10 hover:bg-white/5 disabled:opacity-50"
            aria-label="Refresh generations"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <th className="text-left px-3 py-2.5">User</th>
                <th className="text-left px-3 py-2.5">Title / Prompt</th>
                <th className="text-center px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">{kind === 'music' ? 'Model' : 'Resolution'}</th>
                <th className="text-right px-3 py-2.5">Duration</th>
                <th className="text-right px-3 py-2.5">Cost</th>
                <th className="text-right px-3 py-2.5">Created</th>
                <th className="text-right px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={8} className="p-3">
                      <div className="h-8 bg-white/5 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No {kind} generations match.
                  </td>
                </tr>
              ) : kind === 'music' ? (
                (items as MusicItem[]).map((g) => (
                  <tr key={g.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5">
                      <UserCell u={g.user} />
                    </td>
                    <td className="px-3 py-2.5 max-w-[280px]">
                      <div className="font-medium truncate">{g.title || <span className="text-[hsl(var(--muted-foreground))]">Untitled</span>}</div>
                      {g.prompt && (
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">{g.prompt.slice(0, 80)}{g.prompt.length > 80 ? '…' : ''}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center"><GenStatus status={g.status} /></td>
                    <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--muted-foreground))]">{g.providerModel || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{g.durationSec ? `${g.durationSec}s` : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-amber-300">{fmtMoney(g.estCostUsd)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-[hsl(var(--muted-foreground))]">{relTime(g.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {g.track && (
                        <Link href={`/track/${g.track.slug}`} target="_blank" className="text-xs text-[hsl(var(--accent))] inline-flex items-center gap-1 hover:underline">
                          Track <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                (items as VideoItem[]).map((v) => (
                  <tr key={v.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5">
                      <UserCell u={v.user} />
                    </td>
                    <td className="px-3 py-2.5 max-w-[280px]">
                      <div className="font-medium truncate">{v.title || <span className="text-[hsl(var(--muted-foreground))]">Untitled</span>}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center"><GenStatus status={v.status} /></td>
                    <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--muted-foreground))]">{v.resolution || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{v.durationSec ? `${v.durationSec}s` : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-amber-300">{fmtMoney(v.estCostUsd)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-[hsl(var(--muted-foreground))]">{relTime(v.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {v.videoUrl && (
                        <a href={v.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(var(--accent))] inline-flex items-center gap-1 hover:underline">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserCell({ u }: { u: { id: string; username: string; email: string; displayName: string | null; avatar: string | null } }) {
  return (
    <Link href={`/admin/users/${u.id}`} className="inline-flex items-center gap-2 group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(var(--accent))] to-blue-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden flex-shrink-0">
        {u.avatar ? (
          <img src={u.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          (u.displayName || u.username).slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium truncate group-hover:text-[hsl(var(--accent))] transition-colors flex items-center gap-1">
          {u.displayName || u.username}
          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{u.email}</div>
      </div>
    </Link>
  );
}

function KindTab({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active ? 'bg-white text-black' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function GenStatus({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    COMPLETED: { color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'Done', icon: <CheckCircle className="w-2.5 h-2.5" /> },
    PROCESSING: { color: 'bg-blue-500/10 text-blue-300 border-blue-500/20', label: 'Processing', icon: <Clock className="w-2.5 h-2.5 animate-pulse" /> },
    PENDING: { color: 'bg-gray-500/10 text-gray-300 border-gray-500/20', label: 'Pending', icon: <Clock className="w-2.5 h-2.5" /> },
    FAILED: { color: 'bg-rose-500/10 text-rose-300 border-rose-500/20', label: 'Failed', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  };
  const c = config[status] || { color: 'bg-gray-500/10 text-gray-300 border-gray-500/20', label: status, icon: <XCircle className="w-2.5 h-2.5" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function relTime(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
