'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Music, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { user, fetchUser } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>(
    token ? 'loading' : 'pending'
  );
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function verify() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified');
        fetchUser().catch(() => {});
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Invalid or expired verification token');
      }
    }
    verify();
  }, [token, fetchUser]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = user?.email || resendEmail;
    if (!emailToUse) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: emailToUse });
      setResent(true);
    } catch (err) {
      // Match backend privacy model — show "sent" even if account doesn't exist
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Morlo
            </span>
          </Link>
        </div>

        {status === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-[hsl(var(--accent))] animate-spin mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))]">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="p-5 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-400">Email verified</p>
                <p className="text-green-300/80 text-sm mt-1">{message}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full h-11 rounded-full bg-[hsl(var(--primary))] text-white font-semibold hover:bg-[hsl(var(--primary))]/90 transition-colors"
            >
              Continue to Morlo
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="p-5 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Verification failed</p>
                <p className="text-red-300/80 text-sm mt-1">{message}</p>
              </div>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center">
              The link may be expired. Request a new one below.
            </p>
            <ResendForm
              user={user}
              resending={resending}
              resent={resent}
              resendEmail={resendEmail}
              setResendEmail={setResendEmail}
              handleResend={handleResend}
            />
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-[hsl(var(--accent))]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                We sent a verification link to{' '}
                {user?.email ? (
                  <span className="text-white font-medium">{user.email}</span>
                ) : (
                  'your email'
                )}
                .
              </p>
            </div>
            <ResendForm
              user={user}
              resending={resending}
              resent={resent}
              resendEmail={resendEmail}
              setResendEmail={setResendEmail}
              handleResend={handleResend}
            />
            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
              >
                Skip for now and explore Morlo →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResendForm({
  user,
  resending,
  resent,
  resendEmail,
  setResendEmail,
  handleResend,
}: {
  user: any;
  resending: boolean;
  resent: boolean;
  resendEmail: string;
  setResendEmail: (v: string) => void;
  handleResend: (e: React.FormEvent) => void;
}) {
  if (resent) {
    return (
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
        If an unverified account exists with that email, a new verification link has been sent.
      </div>
    );
  }

  return (
    <form onSubmit={handleResend} className="space-y-3">
      {!user?.email && (
        <input
          type="email"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full h-11 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
        />
      )}
      <button
        type="submit"
        disabled={resending}
        className="w-full h-11 rounded-full bg-[hsl(var(--secondary))] text-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 border border-[hsl(var(--border))]"
      >
        {resending ? 'Sending…' : 'Resend verification email'}
      </button>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--background))]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
