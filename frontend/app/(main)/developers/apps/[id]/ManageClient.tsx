'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Loader2, ArrowLeft, AlertCircle, Copy, RefreshCw, Save, Eye, EyeOff } from 'lucide-react';

const ALL_SCOPES = ['music:read', 'music:write', 'lyrics:read', 'lyrics:write', 'tracks:read', 'tracks:write', 'agents:read'];

interface AppDetail {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  homepage?: string | null;
  redirectUris: string[];
  scopes: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  listed: boolean;
}

export function ManageDeveloperApp({ id }: { id: string }) {
  const { isAuthenticated } = useAuthStore();
  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const r = await api.get('/developers/apps/mine');
        if (cancelled) return;
        const found = (r.data?.apps as AppDetail[] | undefined)?.find((a) => a.id === id);
        setApp(found || null);
      } catch {
        if (!cancelled) setApp(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  const save = async () => {
    if (!app) return;
    setSaving(true);
    try {
      const r = await api.patch(`/developers/apps/${app.id}`, {
        name: app.name,
        description: app.description,
        iconUrl: app.iconUrl,
        homepage: app.homepage,
        redirectUris: app.redirectUris,
        scopes: app.scopes,
      });
      const next = r.data?.app as AppDetail;
      setApp(next);
      toast.success('Saved');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save'
      );
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    if (!app) return;
    if (!confirm('Rotate the client secret? All existing OAuth grants will be invalidated.')) return;
    setRotating(true);
    try {
      const r = await api.post(`/developers/apps/${app.id}/rotate-secret`);
      const secret = r.data?.clientSecret as string | undefined;
      if (secret) setNewSecret(secret);
      toast.success('Secret rotated — copy it now');
    } catch {
      toast.error('Failed to rotate secret');
    } finally {
      setRotating(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <Link href="/login" className="text-purple-300 hover:underline">Log in</Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
      </div>
    );
  }
  if (!app) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">App not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href="/developers/apps?mine=1"
        className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All apps
      </Link>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <h1 className="text-2xl font-bold text-white">{app.name}</h1>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
            app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-200'
            : app.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-200'
            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
          }`}
        >
          {app.status}
        </span>
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 font-mono">{app.clientId}</p>

      {newSecret && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 mb-4">
          <p className="text-xs font-semibold text-amber-200 mb-2">⚠ New client secret — save it now.</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={secretVisible ? newSecret : '•'.repeat(40)}
              className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-amber-500/40 text-amber-100 text-xs font-mono"
            />
            <button onClick={() => setSecretVisible((v) => !v)} className="h-9 px-3 rounded-lg border border-amber-500/40 text-amber-200 text-xs">
              {secretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => copy(newSecret, 'Client secret')} className="h-9 px-3 rounded-lg border border-amber-500/40 text-amber-200 text-xs">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
        <Field label="Name">
          <input
            value={app.name}
            onChange={(e) => setApp({ ...app, name: e.target.value })}
            maxLength={80}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={app.description || ''}
            onChange={(e) => setApp({ ...app, description: e.target.value.slice(0, 2000) })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm resize-none"
          />
        </Field>
        <Field label="Icon URL">
          <input
            value={app.iconUrl || ''}
            onChange={(e) => setApp({ ...app, iconUrl: e.target.value })}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
          />
        </Field>
        <Field label="Homepage">
          <input
            value={app.homepage || ''}
            onChange={(e) => setApp({ ...app, homepage: e.target.value })}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
          />
        </Field>
        <Field label="Redirect URIs" hint="One per line">
          <textarea
            value={app.redirectUris.join('\n')}
            onChange={(e) => setApp({ ...app, redirectUris: e.target.value.split('\n') })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm font-mono resize-none"
          />
        </Field>
        <Field label="Scopes" hint="Editing scopes resets review status to PENDING">
          <div className="grid grid-cols-2 gap-2">
            {ALL_SCOPES.map((s) => {
              const checked = app.scopes.includes(s);
              return (
                <label
                  key={s}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
                    checked
                      ? 'border-purple-400/60 bg-purple-500/10 text-white'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? Array.from(new Set([...app.scopes, s]))
                        : app.scopes.filter((x) => x !== s);
                      setApp({ ...app, scopes: next });
                    }}
                  />
                  {s}
                </label>
              );
            })}
          </div>
        </Field>
        <div className="flex justify-between flex-wrap gap-2 pt-2 border-t border-[hsl(var(--border))]">
          <button
            onClick={rotate}
            disabled={rotating}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-rose-500/40 text-rose-200 text-sm hover:bg-rose-500/10 disabled:opacity-50"
          >
            {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Rotate secret
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">{hint}</p>}
    </div>
  );
}
