'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      const next = searchParams.get('next');
      // Only honor relative paths to avoid open-redirect.
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      router.push(dest);
    } catch (err: any) {
      setError(err.message);
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
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Welcome back</h1>
          <p className="text-[color:var(--text-mute)] mt-1.5 text-sm">Log in to continue listening.</p>
        </div>

        <div className="mym-panel p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <SocialAuthButtons onError={setError} />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--stroke)]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)]">
              or with email
            </span>
            <div className="h-px flex-1 bg-[color:var(--stroke)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-lg bg-white/[0.04] text-white border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)]">Password</label>
              <Link href="/forgot-password" className="text-xs text-[color:var(--brand)] hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-4 pr-11 rounded-lg bg-white/[0.04] text-white border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-mute)] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mym-cta w-full justify-center disabled:opacity-50"
          >
            {isLoading ? 'Logging in…' : 'Log in'}
          </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-[color:var(--text-mute)]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[color:var(--brand)] hover:underline font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
