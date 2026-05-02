'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminApi } from '@/lib/adminApi';
import { Loader2, Music, ExternalLink } from 'lucide-react';

type DistStatus = 'PENDING' | 'SUBMITTED' | 'LIVE' | 'REJECTED' | 'TAKEDOWN';

interface Distribution {
  id: string;
  status: DistStatus;
  partner: string;
  partnerJobId?: string | null;
  upc?: string | null;
  isrc?: string | null;
  releaseDate?: string | null;
  releaseTitle?: string | null;
  artistName?: string | null;
  errorMessage?: string | null;
  partnerNotes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  trackId: string;
  track?: {
    id: string;
    slug: string;
    title: string;
    coverArt?: string | null;
    audioUrl: string;
    agent?: { name: string } | null;
  };
}

const STATUS_OPTIONS: DistStatus[] = ['PENDING', 'SUBMITTED', 'LIVE', 'REJECTED', 'TAKEDOWN'];

export default function AdminDistributionsPage() {
  const [items, setItems] = useState<Distribution[]>([]);
  const [filter, setFilter] = useState<'' | DistStatus>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const api = getAdminApi();
      const url = filter ? `/admin/distributions?status=${filter}` : '/admin/distributions';
      const r = await api.get(url);
      setItems((r.data?.distributions || []) as Distribution[]);
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load distributions'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateRow = async (id: string, patch: Partial<Distribution>) => {
    setSavingId(id);
    try {
      const api = getAdminApi();
      const r = await api.patch(`/admin/distributions/${id}`, patch);
      const updated = r.data?.distribution as Distribution;
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
    } catch (err) {
      alert(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Update failed'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Distributions</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as '' | DistStatus)}
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
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
          No distributions match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
                  {d.track?.coverArt ? (
                    <img src={d.track.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">
                      {d.releaseTitle || d.track?.title || 'Unknown track'}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] font-mono">
                      {d.partner}
                    </span>
                    {d.track?.slug && (
                      <Link
                        href={`/track/${d.track.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
                      >
                        Preview <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Artist: {d.artistName || d.track?.agent?.name || '—'}
                    {d.releaseDate && ` · Release ${new Date(d.releaseDate).toLocaleDateString()}`}
                    {' · Submitted '}{new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <Field label="Status">
                  <select
                    value={d.status}
                    onChange={(e) => updateRow(d.id, { status: e.target.value as DistStatus })}
                    disabled={savingId === d.id}
                    className="w-full h-8 px-2 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Partner job id">
                  <input
                    defaultValue={d.partnerJobId || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (d.partnerJobId || '')) {
                        updateRow(d.id, { partnerJobId: e.target.value });
                      }
                    }}
                    placeholder="—"
                    className="w-full h-8 px-2 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-xs font-mono"
                  />
                </Field>
                <Field label="UPC">
                  <input
                    defaultValue={d.upc || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (d.upc || '')) {
                        updateRow(d.id, { upc: e.target.value });
                      }
                    }}
                    className="w-full h-8 px-2 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-xs font-mono"
                  />
                </Field>
                <Field label="ISRC">
                  <input
                    defaultValue={d.isrc || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (d.isrc || '')) {
                        updateRow(d.id, { isrc: e.target.value });
                      }
                    }}
                    className="w-full h-8 px-2 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-xs font-mono"
                  />
                </Field>
              </div>

              <Field label="Notes (admin-only)">
                <textarea
                  defaultValue={d.partnerNotes || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (d.partnerNotes || '')) {
                      updateRow(d.id, { partnerNotes: e.target.value });
                    }
                  }}
                  rows={2}
                  className="w-full px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-xs resize-none"
                />
              </Field>

              {d.metadata && Object.keys(d.metadata).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-[hsl(var(--muted-foreground))] cursor-pointer">
                    Metadata
                  </summary>
                  <pre className="text-xs text-[hsl(var(--muted-foreground))] bg-black/30 p-2 rounded-md overflow-x-auto mt-1">
                    {JSON.stringify(d.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">{label}</label>
      {children}
    </div>
  );
}
