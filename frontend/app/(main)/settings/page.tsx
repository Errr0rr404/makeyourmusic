'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import api from '@/lib/api';
import {
  Settings, Volume2, Sliders, LogOut, ChevronRight, Lock,
  AlertCircle, KeyRound, Trash2, Mail, Eye, EyeOff, Loader2, CheckCircle2,
  Sun, Moon, Monitor, Sparkles, Disc3, Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useTheme } from '@/components/ThemeProvider';

export default function SettingsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { volume, setVolume, crossfade, setCrossfade, eqEnabled, toggleEQ, autoplay, toggleAutoplay } = usePlayerStore();
  const { skin, palette, setSkin, setPalette } = useTheme();
  const [mechanicalSounds, setMechanicalSounds] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMechanicalSounds(localStorage.getItem('mym-mech-sounds') === '1');
  }, []);

  const toggleMechanicalSounds = () => {
    const next = !mechanicalSounds;
    setMechanicalSounds(next);
    try {
      localStorage.setItem('mym-mech-sounds', next ? '1' : '0');
    } catch {
      /* no-op */
    }
  };

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState<{
    emailFollowerAlert: boolean;
    emailLikeAlert: boolean;
    emailCommentAlert: boolean;
    emailDigestWeekly: boolean;
    emailMarketing: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/auth/email-preferences')
      .then((r) => setEmailPrefs(r.data.preferences))
      .catch(() => {});
  }, [isAuthenticated]);

  const toggleEmailPref = async (key: keyof NonNullable<typeof emailPrefs>) => {
    if (!emailPrefs) return;
    const prev = emailPrefs;
    const next = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(next);
    try {
      await api.put('/auth/email-preferences', { [key]: next[key] });
    } catch {
      setEmailPrefs(prev);
      toast.error('Could not save preference');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[color:var(--text)] mb-2">Settings</h2>
        <p className="text-[color:var(--text-mute)] mb-4">Log in to access settings</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
        >
          Log In
        </Link>
      </div>
    );
  }

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: 'You will need to enter your password again to log back in.',
      confirmLabel: 'Log out',
    });
    if (!ok) return;
    await logout();
    router.push('/');
    toast.success('Logged out');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPwdError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(passwordForm.newPassword) || !/[a-z]/.test(passwordForm.newPassword) || !/[0-9]/.test(passwordForm.newPassword)) {
      setPwdError('Password must include uppercase, lowercase, and a number');
      return;
    }
    setPwdLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
      setShowChangePassword(false);
    } catch (err: any) {
      setPwdError(err.response?.data?.error || err.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: user.email });
      toast.success('Verification email sent');
    } catch {
      toast.error('Could not resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const username = (user as any)?.username || '';
    const ok = await confirm({
      title: 'Delete your account?',
      message: 'This will permanently delete your account, all your playlists, likes, comments, and any agents you own. This cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
      requireInput: username,
    });
    if (!ok) return;

    const password = window.prompt('Enter your password to confirm account deletion:');
    if (!password) return;

    try {
      await api.delete('/auth/account', { data: { password, confirmUsername: username } });
      toast.success('Account deleted');
      await logout();
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const emailVerified = (user as any)?.emailVerified;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-[hsl(var(--accent))]" />
        <h1 className="text-2xl font-bold text-[color:var(--text)]">Settings</h1>
      </div>

      {/* Email verification banner */}
      {user && emailVerified === false && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <Mail className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300 mb-1">Verify your email</p>
            <p className="text-xs text-amber-200/80">
              Confirm <span className="font-medium">{user.email}</span> to unlock all features.
            </p>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {resendLoading ? 'Sending…' : 'Resend'}
          </button>
        </div>
      )}

      {/* Audio Settings */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Audio</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-[color:var(--text)] font-medium">Default Volume</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{Math.round(volume * 100)}%</p>
              </div>
            </div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-[hsl(var(--accent))]"
              aria-label="Volume"
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-[color:var(--text)] font-medium">Crossfade</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{crossfade === 0 ? 'Off' : `${crossfade}s`}</p>
              </div>
            </div>
            <input
              type="range" min={0} max={12} step={1}
              value={crossfade}
              onChange={(e) => setCrossfade(parseInt(e.target.value))}
              className="w-24 sm:w-32 accent-[hsl(var(--accent))]"
              aria-label="Crossfade duration"
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-[color:var(--text)] font-medium">Equalizer</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{eqEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            <button
              onClick={toggleEQ}
              className={`w-11 h-6 rounded-full transition-colors relative ${eqEnabled ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))]'}`}
              role="switch"
              aria-checked={eqEnabled}
              aria-label="Toggle equalizer"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${eqEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Autoplay / Radio */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm text-[color:var(--text)] font-medium">Autoplay (Radio)</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {autoplay ? 'Auto-queue similar tracks when queue ends' : 'Stop when queue ends'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAutoplay}
              className={`w-11 h-6 rounded-full transition-colors relative ${autoplay ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))]'}`}
              role="switch"
              aria-checked={autoplay}
              aria-label="Toggle autoplay radio"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${autoplay ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Appearance</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 space-y-5">
          {/* Style: Modern vs Vintage */}
          <div>
            <p className="text-sm text-[color:var(--text)] font-medium mb-1">Style</p>
            <p className="text-xs text-[color:var(--text-mute)] mb-3">Modern is our signature electric look. Vintage is a tape-deck listening room.</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'modern', label: 'Modern', desc: 'Electric · Studio', icon: Radio },
                { id: 'vintage', label: 'Vintage', desc: 'Cassette · Hi-Fi', icon: Disc3 },
              ] as const).map((opt) => {
                const Icon = opt.icon;
                const active = skin === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSkin(opt.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      active
                        ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))] text-[color:var(--text)]'
                        : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] text-[color:var(--text-mute)] hover:text-[color:var(--text)]'
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[hsl(var(--accent))]' : ''}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-[color:var(--text-mute)]">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode: Light / Dark / System */}
          <div>
            <p className="text-sm text-[color:var(--text)] font-medium mb-1">Mode</p>
            <p className="text-xs text-[color:var(--text-mute)] mb-3">Light follows daylight, dark for late-night listening.</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'system', label: 'System', icon: Monitor },
              ] as const).map((opt) => {
                const Icon = opt.icon;
                const active = palette === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPalette(opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                      active
                        ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))] text-[hsl(var(--accent))]'
                        : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] text-[color:var(--text-mute)] hover:text-[color:var(--text)]'
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mechanical sounds — only meaningful for vintage but visible always */}
          <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border))] -mx-4 px-4 pt-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[color:var(--text-mute)]" />
              <div>
                <p className="text-sm text-[color:var(--text)] font-medium">Mechanical sounds</p>
                <p className="text-xs text-[color:var(--text-mute)]">
                  {skin === 'vintage' ? 'Tactile clicks on transport buttons' : 'Vintage style only'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleMechanicalSounds}
              disabled={skin !== 'vintage'}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                mechanicalSounds && skin === 'vintage'
                  ? 'bg-[hsl(var(--accent))]'
                  : 'bg-[hsl(var(--secondary))]'
              } ${skin !== 'vintage' ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={mechanicalSounds}
              aria-label="Toggle mechanical sounds"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${mechanicalSounds && skin === 'vintage' ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Account</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          <Link href="/profile" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Edit Profile</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/library" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Your Library</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/notifications" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Notifications</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/settings/referrals" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Referrals</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/settings/developers" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Developer keys</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
        </div>
      </section>

      {/* Security */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Security</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          <button
            onClick={() => setShowChangePassword((v) => !v)}
            className="flex items-center justify-between px-5 py-4 text-left w-full hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-sm text-[color:var(--text)]">Change password</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform ${showChangePassword ? 'rotate-90' : ''}`} />
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="p-5 space-y-3 bg-[hsl(var(--background))]/50">
              {pwdError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{pwdError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1.5">Current password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-[color:var(--text)] text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-[hsl(var(--muted-foreground))]">New password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[color:var(--text)] flex items-center gap-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-[color:var(--text)] text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40"
                  placeholder="8+ chars, 1 upper, 1 lower, 1 number"
                />
              </div>
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-[color:var(--text)] text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40"
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
                    setPwdError('');
                  }}
                  className="px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[color:var(--text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium disabled:opacity-50"
                >
                  {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Update password
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Email notifications */}
      {emailPrefs && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">Email notifications</h2>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
            {[
              { key: 'emailFollowerAlert' as const, label: 'New follower', sub: "When someone follows an agent you own" },
              { key: 'emailLikeAlert' as const, label: 'Likes on your tracks', sub: 'Email me when listeners like a track' },
              { key: 'emailCommentAlert' as const, label: 'Comments on your tracks', sub: 'Email me when someone comments' },
              { key: 'emailDigestWeekly' as const, label: 'Weekly digest', sub: 'Stats & highlights every Monday' },
              { key: 'emailMarketing' as const, label: 'Product updates', sub: 'New features, tips, occasional announcements' },
            ].map((row) => {
              const value = emailPrefs[row.key];
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="text-sm text-[color:var(--text)] font-medium">{row.label}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{row.sub}</p>
                  </div>
                  <button
                    onClick={() => toggleEmailPref(row.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))]'}`}
                    role="switch"
                    aria-checked={value}
                    aria-label={row.label}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* About */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-3 px-1">About</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          <div className="px-5 py-4">
            <p className="text-sm text-[color:var(--text)] font-medium">MakeYourMusic</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              AI-Generated Music Platform &mdash; Version 1.0.0
            </p>
          </div>
          <Link href="/terms" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Terms of Service</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/privacy" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Privacy Policy</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
          <Link href="/cookies" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <span className="text-sm text-[color:var(--text)]">Cookie Policy</span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-sm font-semibold uppercase text-red-400/70 mb-3 px-1">Danger Zone</h2>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-red-500/20 divide-y divide-[hsl(var(--border))]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400">Log Out</span>
          </button>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-red-500/5 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
            <div>
              <span className="text-sm text-red-400 font-medium block">Delete Account</span>
              <span className="text-xs text-red-400/60">Permanently remove your account and all data</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
