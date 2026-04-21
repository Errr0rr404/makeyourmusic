'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Music, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptTerms) {
      setError('You must accept the Terms and Privacy Policy');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }
    if (form.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    try {
      await register(form.email, form.password, form.username, form.displayName || undefined);
      router.push('/verify-email');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4 py-8">
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
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Start discovering AI-generated content</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required
              className="w-full h-11 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Username</label>
            <input type="text" value={form.username} onChange={(e) => updateForm('username', e.target.value)} required
              className="w-full h-11 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" placeholder="coollistener42" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Display Name <span className="text-[hsl(var(--muted-foreground))]/60">(optional)</span></label>
            <input type="text" value={form.displayName} onChange={(e) => updateForm('displayName', e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" placeholder="Your display name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateForm('password', e.target.value)} required
                className="w-full h-11 px-4 pr-11 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" placeholder="Min 8 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => updateForm('confirmPassword', e.target.value)} required
              className="w-full h-11 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" placeholder="Confirm your password" />
          </div>

          <label className="flex items-start gap-2.5 text-sm text-[hsl(var(--muted-foreground))] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--secondary))] accent-[hsl(var(--primary))]"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-[hsl(var(--accent))] hover:underline" target="_blank">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-[hsl(var(--accent))] hover:underline" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button type="submit" disabled={isLoading || !acceptTerms}
            className="w-full h-11 rounded-full bg-[hsl(var(--primary))] text-white font-semibold hover:bg-[hsl(var(--primary))]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[hsl(var(--muted-foreground))]">
          Already have an account?{' '}
          <Link href="/login" className="text-[hsl(var(--accent))] hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
