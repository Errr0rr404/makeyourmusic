'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Sparkles, Mail, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/store/authStore';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import api from '@/lib/api';

type Mode = 'login' | 'register' | 'magic';

/**
 * In-page auth wall used to gate a specific action (e.g. "Generate music")
 * without yanking the user away from the page they're on. Closing or
 * completing the modal hands control back to the caller via `onSuccess`,
 * so any in-flight client state (form drafts, half-filled steps) survives.
 */
export function AuthGateModal({
  open,
  onOpenChange,
  onSuccess,
  title = 'Sign in to generate',
  description = 'Your idea, lyrics, and style choices are saved — finish creating an account to bring the track to life.',
  signupNext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful login / register. Modal closes automatically. */
  onSuccess: () => void;
  title?: string;
  description?: string;
  /**
   * Path to send the user to if they jump out to the full /register page
   * (used for the "Sign up" link inside the embedded signup form, where we
   * link out to the full page so the user gets all the fields). Defaults to
   * the current path so they land back where they were.
   */
  signupNext?: string;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  // Reset transient state every time the modal re-opens so a stale error
  // from a previous attempt doesn't leak into a new session.
  useEffect(() => {
    if (open) {
      setError('');
      setPending(false);
      setMode('login');
    }
  }, [open]);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[color:var(--stroke)] bg-[hsl(var(--card))] p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--accent))]/15">
            <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" />
          </div>
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
            {description}
          </DialogDescription>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <SocialAuthButtons
          onError={setError}
          onPending={setPending}
          onSuccess={handleSuccess}
        />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[color:var(--stroke)]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)]">
            or with email
          </span>
          <div className="h-px flex-1 bg-[color:var(--stroke)]" />
        </div>

        {mode === 'login' && (
          <LoginForm
            onError={setError}
            onSuccess={handleSuccess}
            pending={pending}
            setPending={setPending}
          />
        )}
        {mode === 'register' && <RegisterPromo signupNext={signupNext} />}
        {mode === 'magic' && (
          <MagicLinkForm
            onError={setError}
            pending={pending}
            setPending={setPending}
            signupNext={signupNext}
          />
        )}

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => { setError(''); setMode('magic'); }}
            className="mx-auto flex items-center gap-2 text-xs font-semibold text-[color:var(--text-mute)] hover:text-white transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> Send a sign-in link instead
          </button>
        )}

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          {mode === 'login' && (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(''); setMode('register'); }}
                className="font-semibold text-[color:var(--brand)] hover:underline"
              >
                Sign up
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(''); setMode('login'); }}
                className="font-semibold text-[color:var(--brand)] hover:underline"
              >
                Log in
              </button>
            </>
          )}
          {mode === 'magic' && (
            <>
              Prefer a password?{' '}
              <button
                type="button"
                onClick={() => { setError(''); setMode('login'); }}
                className="font-semibold text-[color:var(--brand)] hover:underline"
              >
                Use email + password
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({
  onError,
  onSuccess,
  pending,
  setPending,
}: {
  onError: (msg: string) => void;
  onSuccess: () => void;
  pending: boolean;
  setPending: (p: boolean) => void;
}) {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError('');
    setPending(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      onError((err as Error).message || 'Login failed');
    } finally {
      setPending(false);
    }
  };

  const inputCls =
    'w-full h-11 px-4 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors';
  const labelCls =
    'block text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputCls}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelCls}>Password</label>
          <Link
            href="/forgot-password"
            className="text-xs text-[color:var(--brand)] hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`${inputCls} pr-11`}
            placeholder="Your password"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-mute)] transition-colors hover:text-[color:var(--text)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mym-cta w-full justify-center disabled:opacity-50"
      >
        {pending ? 'Logging in…' : 'Log in & generate'}
      </button>
    </form>
  );
}

function MagicLinkForm({
  onError,
  pending,
  setPending,
  signupNext,
}: {
  onError: (msg: string) => void;
  pending: boolean;
  setPending: (p: boolean) => void;
  signupNext?: string;
}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError('');
    setPending(true);
    try {
      await api.post('/auth/magic-link/request', {
        email,
        // signupNext is preserved through the email click via the verify
        // page's `next` query param. Surfaced here so a return-to-create
        // round-trip lands the user back at the same step.
        next: signupNext,
      });
      setSent(true);
    } catch (err) {
      onError((err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 'Could not send link');
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Check your inbox</p>
          <p className="text-emerald-200/80">
            If <span className="font-semibold">{email}</span> is a valid address, a sign-in link is on its way. It expires in 15 minutes.
          </p>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full h-11 px-4 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors';
  const labelCls =
    'block text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-1.5';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputCls}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mym-cta w-full justify-center disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      <p className="text-center text-xs text-[color:var(--text-mute)]">
        No password needed. The link is valid for 15 minutes.
      </p>
    </form>
  );
}

function RegisterPromo({ signupNext }: { signupNext?: string }) {
  const href = signupNext
    ? `/register?next=${encodeURIComponent(signupNext)}`
    : '/register';
  return (
    <div className="space-y-3">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Sign up takes about 30 seconds — we&apos;ll bring you right back here so
        you can finish your track.
      </p>
      <Link href={href} className="mym-cta w-full justify-center">
        Create free account
      </Link>
    </div>
  );
}
