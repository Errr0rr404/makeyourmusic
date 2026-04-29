'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import {
  Users, Bot, Music, Play, Crown, Shield, AlertTriangle, ExternalLink,
  Check, X, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('PENDING');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { setLoading(false); return; }
    async function load() {
      try {
        const [statsRes, usersRes, reportsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users?limit=50'),
          api.get('/admin/reports?limit=50'),
        ]);
        setStats(statsRes.data.stats);
        setUsers(usersRes.data.users || []);
        setReports(reportsRes.data.reports || []);
      } catch (err: any) {
        console.error('Admin load error:', err);
      }
      setLoading(false);
    }
    load();
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-[hsl(var(--muted-foreground))]">You need admin privileges to access this page</p>
        </div>
      </div>
    );
  }

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED', notes?: string) => {
    setResolvingId(reportId);
    try {
      await api.put(`/admin/reports/${reportId}`, { status, notes });
      setReports((prev) => prev.map(r => r.id === reportId ? { ...r, status, notes } : r));
      toast.success(status === 'RESOLVED' ? 'Report resolved' : 'Report dismissed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update report');
    } finally {
      setResolvingId(null);
    }
  };

  const filteredReports = reportFilter === 'ALL'
    ? reports
    : reports.filter((r) => r.status === reportFilter);

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

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-6 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[hsl(var(--accent))]" /> Admin Panel
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {['overview', 'users', 'reports'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-black' : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-[hsl(var(--card))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === 'overview' && stats ? (
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {[
              { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-400' },
              { label: 'AI Agents', value: stats.agents, icon: Bot, color: 'text-purple-400' },
              { label: 'Tracks', value: stats.tracks, icon: Music, color: 'text-green-400' },
              { label: 'Total Plays', value: stats.plays, icon: Play, color: 'text-orange-400' },
              { label: 'Premium', value: stats.premiumSubs, icon: Crown, color: 'text-yellow-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-[hsl(var(--border))]">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : tab === 'users' ? (
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left p-3 text-[hsl(var(--muted-foreground))] font-medium">User</th>
                  <th className="text-left p-3 text-[hsl(var(--muted-foreground))] font-medium">Role</th>
                  <th className="text-left p-3 text-[hsl(var(--muted-foreground))] font-medium">Subscription</th>
                  <th className="text-left p-3 text-[hsl(var(--muted-foreground))] font-medium">Joined</th>
                  <th className="text-left p-3 text-[hsl(var(--muted-foreground))] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-[hsl(var(--border))] last:border-0">
                    <td className="p-3">
                      <p className="text-white font-medium">{u.displayName || u.username}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</p>
                    </td>
                    <td className="p-3">
                      <select value={u.role} onChange={e => handleUpdateRole(u.id, e.target.value)}
                        className="bg-[hsl(var(--secondary))] text-white text-xs rounded px-2 py-1 border border-[hsl(var(--border))]">
                        <option value="LISTENER">Listener</option>
                        <option value="AGENT_OWNER">Agent Owner</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="p-3 text-xs text-[hsl(var(--muted-foreground))]">{u.subscription?.tier || 'FREE'}</td>
                    <td className="p-3 text-xs text-[hsl(var(--muted-foreground))]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-xs text-[hsl(var(--muted-foreground))]">{u._count?.agents || 0} agents, {u._count?.likes || 0} likes</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'reports' ? (
          <div>
            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto">
              <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
              {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((f) => {
                const count = f === 'ALL' ? reports.length : reports.filter((r) => r.status === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setReportFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      reportFilter === f
                        ? 'bg-[hsl(var(--accent))] text-white'
                        : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}
                  >
                    {f.charAt(0) + f.slice(1).toLowerCase()} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {filteredReports.length > 0 ? (
              <div className="space-y-3">
                {filteredReports.map(r => (
                  <div key={r.id} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-[hsl(var(--border))]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div
                        className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                          r.status === 'PENDING'
                            ? 'bg-amber-500/10'
                            : r.status === 'RESOLVED'
                              ? 'bg-green-500/10'
                              : 'bg-gray-500/10'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            r.status === 'PENDING'
                              ? 'text-amber-400'
                              : r.status === 'RESOLVED'
                                ? 'text-green-400'
                                : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 text-[10px] font-semibold">
                            {reasonLabels[r.reason] || r.reason}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              r.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-300'
                                : r.status === 'RESOLVED'
                                  ? 'bg-green-500/10 text-green-300'
                                  : 'bg-gray-500/10 text-gray-300'
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          <strong>{r.user?.displayName || r.user?.username || 'Someone'}</strong>{' '}
                          reported{' '}
                          {r.track ? (
                            <Link
                              href={`/track/${r.track.slug}`}
                              className="text-[hsl(var(--accent))] hover:underline inline-flex items-center gap-1"
                            >
                              <strong>{r.track.title}</strong>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <strong>a deleted track</strong>
                          )}
                        </p>
                        {r.notes && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 italic">
                            &ldquo;{r.notes}&rdquo;
                          </p>
                        )}
                      </div>
                      {r.status === 'PENDING' && (
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-shrink-0">
                          <button
                            onClick={() => handleResolveReport(r.id, 'RESOLVED')}
                            disabled={resolvingId === r.id}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" /> Resolve
                          </button>
                          <button
                            onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                            disabled={resolvingId === r.id}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 text-xs font-semibold disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
                <Check className="w-10 h-10 text-green-400/60 mx-auto mb-3" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {reportFilter === 'PENDING' ? 'No pending reports — inbox zero!' : `No ${reportFilter.toLowerCase()} reports`}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
