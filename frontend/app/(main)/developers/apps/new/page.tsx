'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Loader2, ArrowLeft, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';

const ALL_SCOPES = ['music:read', 'music:write', 'lyrics:read', 'lyrics:write', 'tracks:read', 'tracks:write', 'agents:read'];

export default function NewDeveloperAppPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [homepage, setHomepage] = useState('');
  const [redirectsRaw, setRedirectsRaw] = useState('http://localhost:3000/oauth/callback');
  const [scopes, setScopes] = useState<string[]>(['music:read', 'music:write']);
  const [submitting, setSubmitting] = useState(false);
  const [createdApp, setCreatedApp] = useState<{ clientId: string; clientSecret: string; slug: string } | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Name must be at least 2 chars');
      return;
    }
    const redirectUris = redirectsRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setSubmitting(true);
    try {
      const r = await api.post('/developers/apps', {
        name: name.trim(),
        description: description.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
        homepage: homepage.trim() || undefined,
        redirectUris,
        scopes,
      });
      const app = r.data?.app;
      const secret = r.data?.clientSecret;
      if (!app || !secret) {
        toast.error('App created but secret missing — contact support');
        return;
      }
      setCreatedApp({ clientId: app.clientId, clientSecret: secret, slug: app.slug });
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create app'
      );
    } finally {
      setSubmitting(false);
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
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Sign in to register an OAuth app.</p>
        <Link href="/login?redirect=/developers/apps/new" className="text-purple-300 hover:underline">Log in</Link>
      </div>
    );
  }

  if (createdApp) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in py-8">
        <h1 className="text-2xl font-bold text-white mb-2">App created</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Status is <span className="font-mono text-amber-200">PENDING</span>. An admin will review before users can authorize it.
        </p>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 mb-4">
          <p className="text-xs font-semibold text-amber-200 mb-2">⚠ Save the client secret now — we won't show it again.</p>
          <div className="flex items-center gap-2 mb-2">
            <input
              readOnly
              value={createdApp.clientId}
              className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-amber-500/40 text-amber-100 text-xs font-mono"
            />
            <button
              onClick={() => copy(createdApp.clientId, 'Client ID')}
              className="h-9 px-3 rounded-lg border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/20"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={secretVisible ? createdApp.clientSecret : '•'.repeat(40)}
              className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-amber-500/40 text-amber-100 text-xs font-mono"
            />
            <button
              onClick={() => setSecretVisible((v) => !v)}
              className="h-9 px-3 rounded-lg border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/20"
            >
              {secretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => copy(createdApp.clientSecret, 'Client secret')}
              className="h-9 px-3 rounded-lg border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/20"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          onClick={() => router.push(`/developers/apps`)}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <Link
        href="/developers/apps"
        className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Register an OAuth app</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Apps act on behalf of MakeYourMusic users via OAuth 2.0 + PKCE. After registering you'll wait for admin review.
      </p>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
        <Field label="Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm resize-none"
          />
        </Field>
        <Field label="Icon URL">
          <input
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://…"
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
          />
        </Field>
        <Field label="Homepage">
          <input
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            placeholder="https://…"
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
          />
        </Field>
        <Field label="Redirect URIs" hint="One per line, https only (localhost OK)">
          <textarea
            value={redirectsRaw}
            onChange={(e) => setRedirectsRaw(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm font-mono resize-none"
          />
        </Field>
        <Field label="Requested scopes">
          <div className="grid grid-cols-2 gap-2">
            {ALL_SCOPES.map((s) => {
              const checked = scopes.includes(s);
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
                      setScopes((prev) => e.target.checked ? Array.from(new Set([...prev, s])) : prev.filter((x) => x !== s));
                    }}
                  />
                  {s}
                </label>
              );
            })}
          </div>
        </Field>
        <button
          onClick={submit}
          disabled={submitting || !name.trim()}
          className="w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Register app
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">{hint}</p>}
    </div>
  );
}
