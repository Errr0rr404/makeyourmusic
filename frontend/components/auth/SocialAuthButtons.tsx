'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { signInWithGoogle, signInWithApple } from '@/lib/firebase/social';

type Provider = 'google' | 'apple';

export function SocialAuthButtons({
  onError,
  onPending,
  onSuccess,
}: {
  onError?: (msg: string) => void;
  onPending?: (pending: boolean) => void;
  /**
   * Called after successful sign-in. When provided, the component skips its
   * default `router.push` so the caller (e.g. an in-page auth-gate modal) can
   * keep the user on the current route and resume whatever action they were
   * mid-way through.
   */
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { firebaseSignIn } = useAuthStore();
  const [busy, setBusy] = useState<Provider | null>(null);

  const run = async (provider: Provider) => {
    onError?.('');
    setBusy(provider);
    onPending?.(true);
    try {
      const idToken = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      await firebaseSignIn(idToken);
      if (onSuccess) {
        onSuccess();
        return;
      }
      // Read ?next= / ?redirect= from window.location to avoid useSearchParams() —
      // calling it here forces the entire auth route to bail out of static
      // generation, which has been failing the production build.
      let next: string | null = null;
      try {
        const params = new URLSearchParams(window.location.search);
        next = params.get('next') || params.get('redirect');
      } catch {}
      // Resolve `next` against the current origin and require the resolved
      // origin to match. Catches `/\\evil.com`, `/[some]:evil.com`,
      // `\\evil.com`, and other tricks that simple prefix checks miss.
      let dest = '/';
      if (next) {
        try {
          const resolved = new URL(next, window.location.origin);
          if (resolved.origin === window.location.origin) {
            dest = `${resolved.pathname}${resolved.search}${resolved.hash}` || '/';
          }
        } catch {
          /* unparseable — fall through to '/' */
        }
      }
      router.push(dest);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      const code = error?.code;
      // Treat user-cancellation as a non-error.
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled'
      ) {
        return;
      }
      onError?.(error?.message || 'Sign-in failed');
    } finally {
      setBusy(null);
      onPending?.(false);
    }
  };

  const disabled = busy !== null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run('google')}
        disabled={disabled}
        className="w-full h-11 rounded-lg bg-white text-gray-900 font-semibold flex items-center justify-center gap-2.5 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        <GoogleGlyph />
        {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        onClick={() => run('apple')}
        disabled={disabled}
        className="w-full h-11 rounded-lg bg-black text-white font-semibold flex items-center justify-center gap-2.5 border border-white/10 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
      >
        <AppleGlyph />
        {busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
      </button>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.42 2.22-1.13 3.04-.86.99-2.27 1.76-3.4 1.66-.13-1.14.4-2.27 1.07-2.97.74-.79 2.06-1.46 3.46-1.73zM20.7 17.3c-.55 1.27-.81 1.84-1.52 2.96-.97 1.55-2.34 3.48-4.04 3.5-1.51.01-1.9-.98-3.95-.97-2.05.01-2.48 1-4 .99-1.7-.01-3.01-1.74-3.99-3.29C.94 16.21.36 11.07 2.34 8.43c1.4-1.87 3.6-2.97 5.66-2.97 2.1 0 3.42 1.16 5.16 1.16 1.69 0 2.72-1.16 5.15-1.16 1.84 0 3.79.99 5.18 2.71-4.55 2.49-3.81 8.99-2.79 9.13z" />
    </svg>
  );
}
