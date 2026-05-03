'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import { Filter, Check, X, AlertTriangle, ExternalLink, Flag } from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'REVIEWED';
  notes: string | null;
  createdAt: string;
  user: { id: string; username: string } | null;
  track: { id: string; title: string; slug: string } | null;
}

const reasonLabels: Record<string, string> = {
  copyright: 'Copyright',
  harassment: 'Harassment',
  'hate-speech': 'Hate speech',
  'sexual-content': 'Sexual content',
  spam: 'Spam',
  violence: 'Violence',
  misinformation: 'Misinformation',
  other: 'Other',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const api = getAdminApi();
        const res = await api.get('/admin/reports?limit=100');
        if (!cancelled) setReports(res.data.reports || []);
      } catch (err) {
        if (!cancelled) toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load reports');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleResolve = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    setResolvingId(id);
    try {
      const api = getAdminApi();
      await api.put(`/admin/reports/${id}`, { status });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(status === 'RESOLVED' ? 'Report resolved' : 'Report dismissed');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update report');
    } finally {
      setResolvingId(null);
    }
  };

  const filtered = filter === 'ALL' ? reports : reports.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">User-submitted reports on tracks.</p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
        {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((f) => {
          const count = f === 'ALL' ? reports.length : reports.filter((r) => r.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-[hsl(var(--card))] border border-white/5 text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-[hsl(var(--card))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-12 text-center">
          <Check className="w-10 h-10 text-emerald-400/60 mx-auto mb-3" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {filter === 'PENDING' ? 'No pending reports — inbox zero!' : `No ${filter.toLowerCase()} reports`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                  r.status === 'PENDING' ? 'bg-amber-500/10'
                    : r.status === 'RESOLVED' ? 'bg-emerald-500/10'
                    : 'bg-gray-500/10'
                }`}>
                  {r.status === 'PENDING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : r.status === 'RESOLVED' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Flag className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-semibold">
                      {reasonLabels[r.reason] || r.reason}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === 'PENDING' ? 'bg-amber-500/10 text-amber-300'
                        : r.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-gray-500/10 text-gray-300'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    <strong className="text-white">{r.user?.username || 'Someone'}</strong>{' '}
                    <span className="text-[hsl(var(--muted-foreground))]">reported</span>{' '}
                    {r.track ? (
                      <Link href={`/track/${r.track.slug}`} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--accent))] hover:underline inline-flex items-center gap-1">
                        <strong>{r.track.title}</strong>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <strong className="text-white">a deleted track</strong>
                    )}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 italic">&ldquo;{r.notes}&rdquo;</p>
                  )}
                </div>

                {r.status === 'PENDING' && (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-shrink-0">
                    <button
                      onClick={() => handleResolve(r.id, 'RESOLVED')}
                      disabled={resolvingId === r.id}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Resolve
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, 'DISMISSED')}
                      disabled={resolvingId === r.id}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-gray-500/15 hover:bg-gray-500/25 text-gray-300 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      <X className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
