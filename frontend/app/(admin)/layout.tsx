'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminAuth } from '@/lib/adminApi';
import { Shield, LayoutDashboard, Users, Sparkles, DollarSign, Flag, LogOut, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAuthed(adminAuth.hasToken());
    const onLocked = () => {
      setAuthed(false);
      toast.error('Admin session expired. Re-enter password.');
    };
    window.addEventListener('admin:locked', onLocked);
    return () => window.removeEventListener('admin:locked', onLocked);
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      setSubmitting(true);
      try {
        await adminAuth.login(password);
        setAuthed(true);
        setPassword('');
        toast.success('Welcome to the admin panel');
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Incorrect password');
      } finally {
        setSubmitting(false);
      }
    },
    [password]
  );

  const handleLogout = useCallback(() => {
    adminAuth.clearToken();
    setAuthed(false);
    router.push('/admin');
  }, [router]);

  if (authed === null) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent))]/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(var(--accent))]/10 blur-3xl pointer-events-none" />

        <form
          onSubmit={handleLogin}
          className="relative z-10 w-full max-w-md bg-[hsl(var(--card))]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-blue-500 flex items-center justify-center shadow-lg shadow-[hsl(var(--accent))]/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-white mb-1">Admin Panel</h1>
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mb-6">
            Enter the admin password to continue
          </p>

          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              autoComplete="current-password"
              className="w-full bg-[hsl(var(--secondary))] text-white placeholder:text-[hsl(var(--muted-foreground))] rounded-lg pl-10 pr-4 py-3 border border-white/10 focus:border-[hsl(var(--accent))] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full bg-gradient-to-r from-[hsl(var(--accent))] to-blue-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg shadow-[hsl(var(--accent))]/20"
          >
            {submitting ? 'Verifying…' : 'Unlock'}
          </button>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
            Set <code className="bg-black/30 px-1.5 py-0.5 rounded">ADMIN_PASSWORD</code> on the backend to enable access.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-white">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[hsl(var(--background))]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--accent))] to-blue-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Admin</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-white/10 rounded font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              v1
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavLink href="/admin" current={pathname} icon={<LayoutDashboard className="w-3.5 h-3.5" />}>
              Overview
            </NavLink>
            <NavLink href="/admin/users" current={pathname} icon={<Users className="w-3.5 h-3.5" />}>
              Users
            </NavLink>
            <NavLink href="/admin/generations" current={pathname} icon={<Sparkles className="w-3.5 h-3.5" />}>
              Generations
            </NavLink>
            <NavLink href="/admin/revenue" current={pathname} icon={<DollarSign className="w-3.5 h-3.5" />}>
              Revenue
            </NavLink>
            <NavLink href="/admin/reports" current={pathname} icon={<Flag className="w-3.5 h-3.5" />}>
              Reports
            </NavLink>
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Sign out of admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  current,
  icon,
  children,
}: {
  href: string;
  current: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  // Treat /admin as exact-match, all others as startsWith so nested pages light up.
  const active = href === '/admin' ? current === '/admin' : current.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-white text-black'
          : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
