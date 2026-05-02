'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { track } from '@/lib/analytics';

/**
 * /auth/magic?token=… — landing page for the magic-link email. Exchanges
 * the token for an access/refresh-token pair, then bounces to the original
 * `next` path (or /create) so a user who started a generation, got the
 * email, and clicked the link lands right back where they were.
 *
 * On failure (expired/used token) we show a clear message and a "Send a
 * new link" CTA — the most common failure mode is an expired link, and we
 * don't want a dead-end.
 */
export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  // Strict-mode in dev runs effects twice, which would consume the one-shot
  // token on the first render. Guard so we only fire the verify once.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const token = params.get('token');
    const next = params.get('next') || '/create';
    if (!token) {
      setStatus('error');
      setError('Missing token — open the link from your email again.');
      return;
    }
    (async () => {
      try {
        const res = await api.post('/auth/magic-link/verify', { token });
        await setAuth({ user: res.data.user, accessToken: res.data.accessToken });
        track('auth_gate_completed', { method: 'magic_link' });
        setStatus('success');
        router.replace(next);
      } catch (err) {
        const e = err as { response?: { data?: { error?: string } }; message?: string };
        setStatus('error');
        setError(e.response?.data?.error || e.message || 'Could not verify link');
      }
    })();
  }, [params, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="mym-aurora" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <BrandLogo markClassName="h-10 w-10" textClassName="text-2xl" />
          </Link>
        </div>

        {status === 'verifying' && (
          <div className="mym-panel p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[color:var(--brand)]" />
            <p className="text-sm text-[color:var(--text)]">Signing you in…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mym-panel p-8 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            <p className="text-sm text-[color:var(--text)]">Signed in — redirecting…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mym-panel p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200 mb-0.5">Link didn&apos;t work</p>
                <p className="text-rose-300/80">{error}</p>
              </div>
            </div>
            <Link href="/login" className="mym-cta w-full justify-center">
              Send a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
