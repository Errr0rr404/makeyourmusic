'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import {
  Users, Bot, Music, Play, Crown, Shield, AlertTriangle,
} from 'lucide-react';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { setLoading(false); return; }
    async function load() {
      try {
        const [statsRes, usersRes, reportsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users?limit=50'),
          api.get('/admin/reports'),
        ]);
        setStats(statsRes.data.stats);
        setUsers(usersRes.data.users || []);
        setReports(reportsRes.data.reports || []);
      } catch {}
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
    } catch {}
  };

  const handleResolveReport = async (reportId: string, status: string) => {
    try {
      await api.put(`/admin/reports/${reportId}`, { status });
      setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[hsl(var(--accent))]" /> Admin Panel
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'users', 'reports'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-black' : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-[hsl(var(--card))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === 'overview' && stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <table className="w-full text-sm">
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
          reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-[hsl(var(--border))] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-white"><strong>{r.user.username}</strong> reported <strong>{r.track.title}</strong></p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{r.reason}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Status: {r.status}</p>
                  </div>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleResolveReport(r.id, 'RESOLVED')} className="px-3 py-1 rounded bg-green-500/20 text-green-400 text-xs">Resolve</button>
                      <button onClick={() => handleResolveReport(r.id, 'DISMISSED')} className="px-3 py-1 rounded bg-gray-500/20 text-gray-400 text-xs">Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">No reports</p>
          )
        ) : null}
      </div>
    </div>
  );
}
