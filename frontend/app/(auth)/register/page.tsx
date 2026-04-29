'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

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

  const inputCls =
    'w-full h-11 px-4 rounded-lg bg-white/[0.04] text-white border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors';
  const labelCls = 'block text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="mym-aurora" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <BrandLogo markClassName="h-10 w-10" textClassName="text-2xl" />
          </Link>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Create your account</h1>
          <p className="text-[color:var(--text-mute)] mt-1.5 text-sm">Start discovering AI-generated music.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mym-panel p-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required
              className={inputCls} placeholder="you@example.com" />
          </div>

          <div>
            <label className={labelCls}>Username</label>
            <input type="text" value={form.username} onChange={(e) => updateForm('username', e.target.value)} required
              className={inputCls} placeholder="coollistener42" />
          </div>

          <div>
            <label className={labelCls}>Display name <span className="text-[color:var(--text-faint)] normal-case font-normal tracking-normal">(optional)</span></label>
            <input type="text" value={form.displayName} onChange={(e) => updateForm('displayName', e.target.value)}
              className={inputCls} placeholder="Your display name" />
          </div>

          <div>
            <label className={labelCls}>Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateForm('password', e.target.value)} required
                className={`${inputCls} pr-11`} placeholder="Min 8 chars · upper, lower, number" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-mute)] hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Confirm password</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => updateForm('confirmPassword', e.target.value)} required
              className={inputCls} placeholder="Confirm your password" />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[color:var(--text-soft)] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[color:var(--brand)]"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-[color:var(--brand)] hover:underline" target="_blank">Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-[color:var(--brand)] hover:underline" target="_blank">Privacy Policy</Link>.
            </span>
          </label>

          <button type="submit" disabled={isLoading || !acceptTerms} className="mym-cta w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[color:var(--text-mute)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[color:var(--brand)] hover:underline font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
