'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import {
  Search, ChevronLeft, ChevronRight, Music, Video,
  Mail, MailX, Crown, Zap, Sparkles, ArrowUpRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: 'LISTENER' | 'AGENT_OWNER' | 'ADMIN';
  emailVerified: boolean;
  createdAt: string;
  tier: 'FREE' | 'CREATOR' | 'PREMIUM';
  subscription: { tier: string; status: string; currentPeriodEnd?: string | null } | null;
  _count: {
    agents: number;
    likes: number;
    playlists: number;
    plays: number;
    musicGenerations: number;
    videoGenerations: number;
    tipsReceived: number;
    tipsSent: number;
  };
  stats: {
    songsGenerated: number;
    videosGenerated: number;
    totalGenerations: number;
    estCostUsd: number;
    tipsReceivedUsd: number;
    tipsReceivedNetUsd: number;
    monthlyRevenueUsd: number;
  };
}

const fmt = (n: number) => n.toLocaleString();
const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped to force a re-fetch when the user clicks Refresh — without
  // this, calling `setPage(p => p)` is a no-op (zustand/React batches
  // identity-equal updates) so the effect never re-fires.
  const [refreshNonce, setRefreshNonce] = useState(0);

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '25' });
    if (search.trim()) p.set('search', search.trim());
    if (tier) p.set('tier', tier);
    if (role) p.set('role', role);
    return p.toString();
  }, [page, search, tier, role]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const api = getAdminApi();
        const res = await api.get(`/admin/users?${params}`);
        if (cancelled) return;
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        if (!cancelled) setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load users');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }, 250); // debounce search
    return () => { cancelled = true; clearTimeout(t); };
  }, [params, refreshNonce]);

  const handleRoleChange = async (userId: string, newRole: AdminUserRow['role']) => {
    const prev = users.find((u) => u.id === userId)?.role;
    setUsers((arr) => arr.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      const api = getAdminApi();
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      setUsers((arr) => arr.map((u) => (u.id === userId && prev ? { ...u, role: prev } : u)));
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {fmt(total)} total · {users.length} on this page
          </p>
        </div>

        <button
          onClick={() => { setRefreshing(true); setRefreshNonce((n) => n + 1); }}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--card))] border border-white/10 hover:bg-white/5 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-[hsl(var(--card))] border border-white/5 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email, username, or display name…"
            className="w-full bg-[hsl(var(--secondary))] rounded-lg pl-9 pr-3 py-2 text-sm border border-white/5 focus:border-[hsl(var(--accent))] focus:outline-none transition-colors"
          />
        </div>

        <FilterPill
          label="Tier"
          value={tier}
          options={[
            { value: '', label: 'All' },
            { value: 'FREE', label: 'Free' },
            { value: 'CREATOR', label: 'Creator' },
            { value: 'PREMIUM', label: 'Premium' },
          ]}
          onChange={(v) => { setTier(v); setPage(1); }}
        />
        <FilterPill
          label="Role"
          value={role}
          options={[
            { value: '', label: 'All' },
            { value: 'LISTENER', label: 'Listener' },
            { value: 'AGENT_OWNER', label: 'Agent Owner' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
          onChange={(v) => { setRole(v); setPage(1); }}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[hsl(var(--card))] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <Th>User</Th>
                <Th align="center">Tier</Th>
                <Th align="center">Role</Th>
                <Th align="right">Songs</Th>
                <Th align="right">Videos</Th>
                <Th align="right">AI cost</Th>
                <Th align="right">Tips</Th>
                <Th align="right">MRR</Th>
                <Th align="right">Joined</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={10} className="p-3">
                      <div className="h-8 bg-white/5 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-[hsl(var(--muted-foreground))] text-sm">
                    No users match those filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => <UserRow key={u.id} u={u} onRoleChange={handleRoleChange} />)
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  u, onRoleChange,
}: { u: AdminUserRow; onRoleChange: (id: string, role: AdminUserRow['role']) => void }) {
  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <Td>
        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--accent))] to-blue-500 flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0">
            {u.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (u.displayName || u.username).slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white truncate group-hover:text-[hsl(var(--accent))] transition-colors flex items-center gap-1.5">
              {u.displayName || u.username}
              {u.emailVerified ? (
                <Mail className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <MailX className="w-3 h-3 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{u.email}</div>
          </div>
        </Link>
      </Td>
      <Td align="center"><TierBadge tier={u.tier} /></Td>
      <Td align="center">
        <select
          value={u.role}
          onChange={(e) => onRoleChange(u.id, e.target.value as AdminUserRow['role'])}
          className="bg-[hsl(var(--secondary))] text-xs rounded px-2 py-1 border border-white/5 hover:border-white/20 transition-colors"
        >
          <option value="LISTENER">Listener</option>
          <option value="AGENT_OWNER">Agent Owner</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Td>
      <Td align="right"><Stat icon={<Music className="w-3 h-3" />} value={fmt(u.stats.songsGenerated)} /></Td>
      <Td align="right"><Stat icon={<Video className="w-3 h-3" />} value={fmt(u.stats.videosGenerated)} /></Td>
      <Td align="right">
        <span className="font-mono text-amber-300">{fmtMoney(u.stats.estCostUsd)}</span>
      </Td>
      <Td align="right">
        {u.stats.tipsReceivedUsd > 0 ? (
          <span className="font-mono text-emerald-300">{fmtMoney(u.stats.tipsReceivedUsd)}</span>
        ) : (
          <span className="text-[hsl(var(--muted-foreground))]">—</span>
        )}
      </Td>
      <Td align="right">
        {u.stats.monthlyRevenueUsd > 0 ? (
          <span className="font-mono text-emerald-300">{fmtMoney(u.stats.monthlyRevenueUsd)}</span>
        ) : (
          <span className="text-[hsl(var(--muted-foreground))]">—</span>
        )}
      </Td>
      <Td align="right">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      </Td>
      <Td align="right">
        <Link
          href={`/admin/users/${u.id}`}
          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-white/5 text-[hsl(var(--muted-foreground))] hover:text-white"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </Td>
    </tr>
  );
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={`text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-medium px-3 py-2.5 text-${align}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <td className={`px-3 py-2.5 text-${align}`}>{children}</td>;
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-white">
      <span className="text-[hsl(var(--muted-foreground))]">{icon}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

function TierBadge({ tier }: { tier: 'FREE' | 'CREATOR' | 'PREMIUM' }) {
  const config: Record<typeof tier, { label: string; bg: string; icon: React.ReactNode }> = {
    FREE: { label: 'Free', bg: 'bg-white/5 text-[hsl(var(--muted-foreground))]', icon: <Sparkles className="w-2.5 h-2.5" /> },
    CREATOR: { label: 'Creator', bg: 'bg-amber-500/10 text-amber-300 border border-amber-500/20', icon: <Zap className="w-2.5 h-2.5" /> },
    PREMIUM: { label: 'Premium', bg: 'bg-purple-500/10 text-purple-300 border border-purple-500/20', icon: <Crown className="w-2.5 h-2.5" /> },
  };
  const c = config[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function FilterPill({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-[hsl(var(--muted-foreground))]">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[hsl(var(--secondary))] rounded px-2 py-1.5 border border-white/5 hover:border-white/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
