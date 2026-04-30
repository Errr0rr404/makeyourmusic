'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { User, Music, Heart, Clock, Calendar, Shield, Crown, Pencil, Save, X, Loader2, AlertCircle, Globe, LockKeyhole, Wand2, Sparkles, Trash2, Film } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';
import { usePlayerStore } from '@/lib/store/playerStore';
import { ClipGrid, type ClipGridItem } from '@/components/clip/ClipGrid';

export default function ProfilePage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, isAuthenticated, fetchUser } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [form, setForm] = useState({ displayName: '', bio: '', avatar: '' });
  const [error, setError] = useState<string | null>(null);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [tracksTab, setTracksTab] = useState<'all' | 'public' | 'private'>('all');
  const [tracksLoading, setTracksLoading] = useState(false);
  const [myClips, setMyClips] = useState<ClipGridItem[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setForm({
      displayName: user?.displayName || '',
      bio: (user as any)?.bio || '',
      avatar: user?.avatar || '',
    });
    loadStats();
    loadMyTracks();
    loadMyClips();
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

  const loadMyTracks = async () => {
    setTracksLoading(true);
    try {
      const res = await api.get('/tracks/mine?limit=50');
      setMyTracks(res.data.tracks || []);
    } catch {
      setMyTracks([]);
    } finally {
      setTracksLoading(false);
    }
  };

  const loadMyClips = async () => {
    if (!user?.id) return;
    setClipsLoading(true);
    try {
      const res = await api.get(`/clips?userId=${user.id}&limit=24`);
      setMyClips(res.data.clips || []);
    } catch {
      setMyClips([]);
    } finally {
      setClipsLoading(false);
    }
  };

  const handleToggleVisibility = async (trackId: string, makePublic: boolean) => {
    const prev = myTracks;
    setMyTracks((ts) => ts.map((t) => (t.id === trackId ? { ...t, isPublic: makePublic } : t)));
    try {
      await api.patch(`/tracks/${trackId}/visibility`, { isPublic: makePublic });
      toast.success(makePublic ? 'Track is now public' : 'Track is now private');
    } catch {
      setMyTracks(prev);
      toast.error('Failed to update visibility');
    }
  };

  const handleDeleteTrack = async (trackId: string, title: string) => {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      message: 'This will permanently remove the track, its plays, likes, and comments. This cannot be undone.',
      confirmLabel: 'Delete track',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/tracks/${trackId}`);
      setMyTracks((ts) => ts.filter((t) => t.id !== trackId));
      toast.success('Track deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filteredTracks = myTracks.filter((t) => {
    if (tracksTab === 'public') return t.isPublic;
    if (tracksTab === 'private') return !t.isPublic;
    return true;
  });

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
        <User className="w-12 h-12 text-[color:var(--text-mute)] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[color:var(--text)] mb-2">Your Profile</h2>
        <p className="text-[color:var(--text-mute)] mb-4">Log in to view your profile</p>
        <button onClick={() => router.push('/login')} className="mym-cta">
          Log In
        </button>
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      ADMIN: { label: 'Admin', color: 'text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20', icon: Shield },
      AGENT_OWNER: { label: 'Creator', color: 'text-[color:var(--brand)] bg-[color:var(--brand-soft)] ring-1 ring-[color:var(--brand)]/30', icon: Crown },
      LISTENER: { label: 'Listener', color: 'text-[color:var(--text-soft)] bg-[color:var(--bg-elev-2)] ring-1 ring-[color:var(--stroke)]', icon: Music },
    };
    const r = map[role] || map.LISTENER!;
    if (!r) return null;
    const Icon = r.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${r.color}`}>
        <Icon className="w-3 h-3" /> {r.label}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-[color:var(--text)] mb-6">Profile</h1>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-[color:var(--bg-elev-1)] rounded-xl border border-[color:var(--stroke)] p-6 mb-6">
        <div className="flex items-start gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg shadow-[color:var(--brand-glow)]"
            style={{ background: user?.avatar ? undefined : 'var(--aurora)' }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[color:var(--text)]">{user?.displayName || user?.username}</h2>
              {user?.role && roleBadge(user.role)}
            </div>
            <p className="text-sm text-[color:var(--text-mute)]">{user?.email}</p>
            <p className="text-sm text-[color:var(--text-mute)] mt-1">@{user?.username}</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--bg-elev-2)] text-sm text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mt-6 pt-6 border-t border-[color:var(--stroke)] space-y-4">
            <div>
              <label className="block text-sm text-[color:var(--text-mute)] mb-1">Display Name</label>
              <input
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm text-[color:var(--text-mute)] mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none resize-none"
                maxLength={500}
              />
            </div>
            <div>
              <label className="block text-sm text-[color:var(--text-mute)] mb-2">Avatar</label>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="w-24 flex-shrink-0">
                  <ImageUpload
                    value={form.avatar}
                    onChange={(url) => setForm((p) => ({ ...p, avatar: url }))}
                    aspectRatio="square"
                    label="Upload"
                    maxSizeMB={5}
                  />
                </div>
                <input
                  value={form.avatar}
                  onChange={(e) => setForm((p) => ({ ...p, avatar: e.target.value }))}
                  placeholder="Or paste a URL"
                  className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none sm:flex-1"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--text-mute)] hover:text-[color:var(--text)] transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mym-cta mym-cta-sm disabled:opacity-50"
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
          { label: 'Liked Songs', value: stats?.likedTracks ?? '—', icon: Heart, color: 'text-rose-400' },
          { label: 'Playlists', value: stats?.playlists ?? '—', icon: Music, color: 'text-[color:var(--brand)]' },
          { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', icon: Calendar, color: 'text-sky-400' },
          { label: 'Subscription', value: (user as any)?.subscription?.tier || 'Free', icon: Crown, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[color:var(--bg-elev-1)] rounded-xl p-4 border border-[color:var(--stroke)]">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-lg font-bold text-[color:var(--text)]">{stat.value}</p>
            <p className="text-xs text-[color:var(--text-mute)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Your tracks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[color:var(--brand)]" />
            <h2 className="text-lg font-bold text-[color:var(--text)]">Your tracks</h2>
            <span className="text-xs text-[color:var(--text-mute)]">({myTracks.length})</span>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--brand-soft)] border border-[color:var(--brand)]/30 text-[color:var(--brand)] text-xs font-semibold hover:bg-[color:var(--brand-soft)] hover:border-[color:var(--brand)]/50 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" /> Create with AI
          </Link>
        </div>

        <div className="flex gap-1 mb-3 border-b border-[color:var(--stroke)]">
          {(['all', 'public', 'private'] as const).map((t) => {
            const count =
              t === 'all'
                ? myTracks.length
                : t === 'public'
                  ? myTracks.filter((x) => x.isPublic).length
                  : myTracks.filter((x) => !x.isPublic).length;
            return (
              <button
                key={t}
                onClick={() => setTracksTab(t)}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px capitalize ${
                  tracksTab === t
                    ? 'text-[color:var(--text)] border-[color:var(--brand)]'
                    : 'text-[color:var(--text-mute)] border-transparent hover:text-[color:var(--text)]'
                }`}
              >
                {t} <span className="text-xs text-[color:var(--text-mute)]">({count})</span>
              </button>
            );
          })}
        </div>

        {tracksLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-[color:var(--bg-elev-2)] shimmer" />
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)]">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                 style={{ background: 'var(--aurora)', opacity: 0.18 }}>
              <Sparkles className="w-6 h-6 text-[color:var(--brand)]" />
            </div>
            <p className="text-sm text-[color:var(--text-mute)] mb-4">
              {tracksTab === 'private'
                ? 'No private tracks yet'
                : tracksTab === 'public'
                  ? 'No public tracks yet'
                  : "You haven't created any tracks yet"}
            </p>
            <Link href="/create" className="mym-cta mym-cta-sm">
              <Wand2 className="w-4 h-4" /> Create your first track
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredTracks.map((track) => (
              <li
                key={track.id}
                className="group flex items-center gap-3 p-3 rounded-lg bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)] hover:border-[color:var(--stroke-strong)] transition-colors"
              >
                <button
                  onClick={() => playTrack(track, filteredTracks)}
                  className="w-12 h-12 rounded-lg overflow-hidden bg-[color:var(--bg-elev-2)] flex-shrink-0 flex items-center justify-center group/play"
                  aria-label={`Play ${track.title}`}
                >
                  {track.coverArt ? (
                    <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-5 h-5 text-[color:var(--text-mute)]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/track/${track.slug}`}
                      className="text-sm font-semibold text-[color:var(--text)] hover:underline truncate"
                    >
                      {track.title}
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        track.isPublic
                          ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
                      }`}
                    >
                      {track.isPublic ? <Globe className="w-2.5 h-2.5" /> : <LockKeyhole className="w-2.5 h-2.5" />}
                      {track.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--text-mute)] truncate">
                    {track.agent?.name} · {track.playCount || 0} plays · {track.likeCount || 0} likes
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleVisibility(track.id, !track.isPublic)}
                    className="p-2 rounded-lg text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-2)]"
                    title={track.isPublic ? 'Make private' : 'Make public'}
                  >
                    {track.isPublic ? <LockKeyhole className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteTrack(track.id, track.title)}
                    className="p-2 rounded-lg text-[color:var(--text-mute)] hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete track"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Your clips */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-[color:var(--text)]">Your clips</h2>
            <span className="text-xs text-[color:var(--text-mute)]">({myClips.length})</span>
          </div>
          <Link
            href="/create/clip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--brand-soft)] border border-[color:var(--brand)]/30 text-[color:var(--brand)] text-xs font-semibold hover:border-[color:var(--brand)]/50 transition-colors"
          >
            <Film className="w-3.5 h-3.5" /> Make a clip
          </Link>
        </div>
        {clipsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-xl bg-[color:var(--bg-elev-2)] shimmer" />
            ))}
          </div>
        ) : (
          <ClipGrid
            clips={myClips}
            emptyState={
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-4"
                     style={{ background: 'var(--aurora)', opacity: 0.18 }}>
                  <Film className="w-6 h-6 text-[color:var(--brand)]" />
                </div>
                <p className="text-sm text-[color:var(--text-mute)] mb-4">No clips yet</p>
                <Link href="/create/clip" className="mym-cta mym-cta-sm">
                  <Film className="w-4 h-4" /> Make your first clip
                </Link>
              </>
            }
          />
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-[color:var(--bg-elev-1)] rounded-xl border border-[color:var(--stroke)] divide-y divide-[color:var(--stroke)]">
        <button onClick={() => router.push('/library')} className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-[color:var(--bg-elev-2)] transition-colors">
          <Heart className="w-5 h-5 text-rose-400" />
          <span className="text-sm text-[color:var(--text)]">Liked Songs</span>
        </button>
        <button onClick={() => router.push('/studio/generations')} className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-[color:var(--bg-elev-2)] transition-colors">
          <Sparkles className="w-5 h-5 text-[color:var(--brand)]" />
          <span className="text-sm text-[color:var(--text)]">My AI Generations</span>
        </button>
        <button onClick={() => router.push('/settings')} className="flex items-center gap-3 px-5 py-4 text-left w-full hover:bg-[color:var(--bg-elev-2)] transition-colors">
          <Clock className="w-5 h-5 text-sky-400" />
          <span className="text-sm text-[color:var(--text)]">Account Settings</span>
        </button>
      </div>
    </div>
  );
}
