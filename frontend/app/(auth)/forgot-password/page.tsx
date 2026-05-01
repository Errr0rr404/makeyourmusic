'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="mym-aurora" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <BrandLogo markClassName="h-10 w-10" textClassName="text-2xl" />
          </Link>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Reset password</h1>
          <p className="text-[color:var(--text-mute)] mt-1.5 text-sm">We&apos;ll email you a link to set a new one.</p>
        </div>

        {submitted ? (
          <div className="space-y-6 mym-panel p-6">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1 text-emerald-200">Check your inbox</p>
                <p className="text-emerald-300/80">
                  If an account with that email exists, we&apos;ve sent a reset link. It expires in 1 hour.
                </p>
              </div>
            </div>
            <Link href="/login" className="mym-cta w-full justify-center">
              <ArrowLeft className="w-4 h-4" /> Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mym-panel p-6">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-mute)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/[0.04] text-white border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="mym-cta w-full justify-center disabled:opacity-50">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-[color:var(--text-mute)]">
          Remembered it?{' '}
          <Link href="/login" className="text-[color:var(--brand)] hover:underline font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
