'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { User, Music, Heart, Clock, Calendar, Shield, Crown, Pencil, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [form, setForm] = useState({ displayName: '', bio: '', avatar: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setForm({
      displayName: user?.displayName || '',
      bio: (user as any)?.bio || '',
      avatar: user?.avatar || '',
    });
    loadStats();
  }, [isAuthenticated, user]);

  const loadStats = async () => {
    try {
      const [likesRes, playlistsRes] = await Promise.all([
        api.get('/social/likes').catch(() => ({ data: { tracks: [] } })),
        api.get('/social/playlists/mine').catch(() => ({ data: { playlists: [] } })),
      ]);
      setStats({
        likedTracks: likesRes.data.tracks?.length || 0,
        playlists: playlistsRes.data.playlists?.length || 0,
      });
    } catch {
      // Stats are non-critical
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/auth/profile', {
        displayName: form.displayName.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatar: form.avatar.trim() || undefined,
      });
      await fetchUser();
      setEditing(false);
      toast.success('Profile updated');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <User className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your Profile</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to view your profile</p>
        <button onClick={() => router.push('/login')} className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          Log In
        </button>
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      ADMIN: { label: 'Admin', color: 'text-red-400 bg-red-500/10', icon: Shield },
      AGENT_OWNER: { label: 'Creator', color: 'text-purple-400 bg-purple-500/10', icon: Crown },
      LISTENER: { label: 'Listener', color: 'text-blue-400 bg-blue-500/10', icon: Music },
    };
    const r = map[role] || map.LISTENER!;
    if (!r) return null;
    const Icon = r.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${r.color}`}>
        <Icon className="w-3 h-3" /> {r.label}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.displayName?.[0] || user?.username?.[0] || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{user?.displayName || user?.username}</h2>
              {user?.role && roleBadge(user.role)}
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{user?.email}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">@{user?.username}</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--secondary))] text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))] space-y-4">
            <div>
              <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Display Name</label>
              <input
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
                maxLength={500}
              />
            </div>
            <div>
              <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Avatar URL</label>
              <input
                value={form.avatar}
                onChange={(e) => setForm((p) => ({ ...p, avatar: e.target.value }))}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Liked Songs', value: stats?.likedTracks ?? '—', icon: Heart, color: 'text-pink-400' },
          { label: 'Playlists', value: stats?.playlists ?? '—', icon: Music, color: 'text-purple-400' },
          { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', icon: Calendar, color: 'text-blue-400' },
          { label: 'Subscription', value: (user as any)?.subscription?.tier || 'Free', icon: Crown, color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-[hsl(var(--border))]">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
        <button onClick={() => router.push('/library')} className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-white/5 transition-colors">
          <Heart className="w-5 h-5 text-pink-400" />
          <span className="text-sm text-white">Liked Songs</span>
        </button>
        <button onClick={() => router.push('/settings')} className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-white/5 transition-colors">
          <Clock className="w-5 h-5 text-blue-400" />
          <span className="text-sm text-white">Account Settings</span>
        </button>
      </div>
    </div>
  );
}
