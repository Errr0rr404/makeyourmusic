'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Music, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Morlo
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Log in to continue listening</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))]">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-[hsl(var(--accent))] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-4 pr-11 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none transition-colors"
                placeholder="Your password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-full bg-[hsl(var(--primary))] text-white font-semibold hover:bg-[hsl(var(--primary))]/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[hsl(var(--muted-foreground))]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[hsl(var(--accent))] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
