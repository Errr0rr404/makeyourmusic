'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Loader2, ShieldCheck, X, AlertCircle, Code } from 'lucide-react';

interface AppInfo {
  clientId: string;
  slug: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  homepage?: string | null;
  redirectUris: string[];
  scopes: string[];
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'music:read': 'View your music generations',
  'music:write': 'Generate music on your behalf',
  'lyrics:read': 'View lyrics generations',
  'lyrics:write': 'Generate lyrics on your behalf',
  'tracks:read': 'View your published tracks',
  'tracks:write': 'Publish or modify tracks on your behalf',
  'agents:read': 'View your AI agents',
};

export function ConsentClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const clientId = params.get('client_id') || '';
  const redirectUri = params.get('redirect_uri') || '';
  const requestedScope = params.get('scope') || '';
  const codeChallenge = params.get('code_challenge') || '';
  const codeChallengeMethod = params.get('code_challenge_method') || '';
  const state = params.get('state') || '';

  // Validate the request before showing consent.
  const requestErrors: string[] = [];
  if (!clientId) requestErrors.push('Missing client_id');
  if (!redirectUri) requestErrors.push('Missing redirect_uri');
  if (!codeChallenge) requestErrors.push('Missing code_challenge (PKCE required)');
  if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
    requestErrors.push('code_challenge_method must be S256');
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (requestErrors.length > 0) {
        setLoading(false);
        return;
      }
      try {
        const r = await api.get('/oauth/info', { params: { client_id: clientId } });
        if (cancelled) return;
        setInfo(r.data?.app || null);
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'App not approved or not found'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const requestedScopeArr = requestedScope.split(/[\s,]+/).filter(Boolean);
  const grantableScopes = info ? requestedScopeArr.filter((s) => info.scopes.includes(s)) : [];

  const approve = async () => {
    if (!info) return;
    setSubmitting(true);
    try {
      const r = await api.post('/oauth/authorize', {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: grantableScopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod || 'S256',
        state,
      });
      const redirect = r.data?.redirect as string | undefined;
      if (!redirect) {
        toast.error('Server did not return a redirect');
        return;
      }
      // Browser navigation back to the developer's redirect_uri with the
      // authorization code. We avoid a programmatic 302 from the API for
      // exactly this reason — auth-token handling stays SPA-side.
      window.location.href = redirect;
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to authorize';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const deny = () => {
    if (!redirectUri) {
      router.push('/');
      return;
    }
    const sep = redirectUri.includes('?') ? '&' : '?';
    const params2 = new URLSearchParams({ error: 'access_denied' });
    if (state) params2.set('state', state);
    window.location.href = `${redirectUri}${sep}${params2.toString()}`;
  };

  if (requestErrors.length > 0) {
    return (
      <div className="max-w-md mx-auto py-12">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2 text-center">Invalid OAuth request</h1>
        <ul className="text-sm text-rose-200 list-disc list-inside space-y-1">
          {requestErrors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{error || 'App not found'}</p>
        <Link href="/" className="text-purple-300 hover:underline">Back home</Link>
      </div>
    );
  }

  if (!info.redirectUris.includes(redirectUri)) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-rose-200">redirect_uri is not registered for this app.</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    const next = `/oauth/consent?${params.toString()}`;
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <ShieldCheck className="w-12 h-12 text-purple-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Log in to authorize <strong className="text-white">{info.name}</strong>.</p>
        <Link
          href={`/login?redirect=${encodeURIComponent(next)}`}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--secondary))] flex items-center justify-center overflow-hidden flex-shrink-0">
            {info.iconUrl ? <img src={info.iconUrl} alt={info.name} className="w-full h-full object-cover" /> : <Code className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{info.name}</h1>
            {info.homepage && (
              <a
                href={info.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-300 hover:underline truncate block"
              >
                {info.homepage}
              </a>
            )}
          </div>
        </div>
        {info.description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{info.description}</p>
        )}

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 mb-5">
          <p className="text-xs font-semibold text-white mb-2">This app will be able to:</p>
          {grantableScopes.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))] italic">No permissions requested.</p>
          ) : (
            <ul className="space-y-1.5">
              {grantableScopes.map((s) => (
                <li key={s} className="flex items-start gap-2 text-xs text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 mt-0.5 flex-shrink-0" />
                  <span>
                    {SCOPE_DESCRIPTIONS[s] || s}
                    <span className="font-mono text-[hsl(var(--muted-foreground))] ml-1">({s})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={deny}
            className="flex-1 h-11 rounded-full border border-[hsl(var(--border))] text-white text-sm font-medium hover:bg-[hsl(var(--accent))]/20"
          >
            <X className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Deny
          </button>
          <button
            onClick={approve}
            disabled={submitting}
            className="flex-1 h-11 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin inline-block" /> : null}
            {' '}Allow
          </button>
        </div>

        <p className="text-[11px] text-[hsl(var(--muted-foreground))] text-center mt-3">
          You can revoke this access any time in <Link href="/settings" className="text-purple-300 hover:underline">settings</Link>.
        </p>
      </div>
    </div>
  );
}
