'use client';

import { useEffect, useState } from 'react';
import { getAdminApi } from '@/lib/adminApi';
import { Loader2, Code } from 'lucide-react';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';

interface DeveloperApp {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  homepage?: string | null;
  redirectUris: string[];
  scopes: string[];
  status: Status;
  listed: boolean;
  createdAt: string;
  owner?: { id: string; username: string; displayName?: string | null; email: string };
}

const STATUS_OPTIONS: Status[] = ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'];

export default function AdminDeveloperAppsPage() {
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [filter, setFilter] = useState<'' | Status>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const api = getAdminApi();
      const url = filter ? `/developers/admin/apps?status=${filter}` : '/developers/admin/apps';
      const r = await api.get(url);
      setApps((r.data?.apps || []) as DeveloperApp[]);
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load apps'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const update = async (id: string, patch: { status?: Status; listed?: boolean }) => {
    setSavingId(id);
    try {
      const api = getAdminApi();
      const r = await api.patch(`/developers/admin/apps/${id}`, patch);
      const updated = r.data?.app as DeveloperApp;
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    } catch (err) {
      alert(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Developer apps</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as '' | Status)}
          className="h-9 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
        </div>
      ) : apps.length === 0 ? (
        <p className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
          No apps match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {a.iconUrl ? <img src={a.iconUrl} alt={a.name} className="w-full h-full object-cover" /> : <Code className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{a.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate">{a.clientId}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Owner: {a.owner?.displayName || a.owner?.username} · {a.owner?.email}
                  </p>
                </div>
              </div>

              {a.description && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">{a.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mb-3">
                {a.scopes.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                    {s}
                  </span>
                ))}
              </div>
              <details className="mb-3">
                <summary className="text-xs text-[hsl(var(--muted-foreground))] cursor-pointer">Redirect URIs ({a.redirectUris.length})</summary>
                <ul className="text-xs font-mono text-[hsl(var(--muted-foreground))] mt-1 space-y-0.5">
                  {a.redirectUris.map((u) => <li key={u}>{u}</li>)}
                </ul>
              </details>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[hsl(var(--border))]">
                <select
                  value={a.status}
                  onChange={(e) => update(a.id, { status: e.target.value as Status })}
                  disabled={savingId === a.id}
                  className="h-8 px-2 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-xs"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs text-white">
                  <input
                    type="checkbox"
                    checked={a.listed}
                    onChange={(e) => update(a.id, { listed: e.target.checked })}
                    disabled={savingId === a.id}
                  />
                  List in public marketplace
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
