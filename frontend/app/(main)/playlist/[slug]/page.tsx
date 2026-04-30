'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { validatePaymentRedirect } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackRow } from '@/components/track/TrackRow';
import { ListMusic, Globe, Lock, Play, Pencil, Trash2, Check, X, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { TipButton } from '@/components/creator/TipButton';

export default function PlaylistPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { isAuthenticated, user } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/social/playlists/${slug}`);
        setPlaylist(res.data.playlist);
        setEditTitle(res.data.playlist?.title || '');
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Playlist not found');
        } else {
          setError(err.response?.data?.error || 'Failed to load playlist');
        }
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  const handlePlayAll = () => {
    if (playlist?.tracks?.length > 0) {
      const tracks = playlist.tracks.map((pt: any) => pt.track || pt);
      playTrack(tracks[0], tracks);
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await api.put(`/social/playlists/${playlist.id}`, { title: editTitle.trim() });
      setPlaylist((p: any) => ({ ...p, title: editTitle.trim() }));
      setEditing(false);
      toast.success('Playlist updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${playlist?.title}"?`,
      message: 'This will permanently delete the playlist. Tracks in it will not be deleted.',
      confirmLabel: 'Delete playlist',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/social/playlists/${playlist.id}`);
      toast.success('Playlist deleted');
      router.push('/library');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await api.delete(`/social/playlists/${playlist.id}/tracks/${trackId}`);
      setPlaylist((p: any) => ({
        ...p,
        tracks: p.tracks.filter((pt: any) => (pt.track?.id || pt.id) !== trackId),
      }));
      toast.success('Track removed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove track');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="h-8 w-48 bg-[hsl(var(--secondary))] rounded animate-pulse" />
        <div className="h-4 w-32 bg-[hsl(var(--secondary))] rounded animate-pulse" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-[hsl(var(--secondary))] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[color:var(--text)] mb-2">Error</h2>
        <p className="text-[color:var(--text-mute)] mb-4">{error}</p>
        <button onClick={() => router.push('/library')} className="text-[color:var(--brand)] hover:underline">
          Back to Library
        </button>
      </div>
    );
  }

  if (!playlist) return null;

  const tracks = playlist.tracks?.map((pt: any) => pt.track || pt) || [];
  const isPaid = playlist.accessTier === 'PAID';
  const isOwner = user?.id === playlist.userId;
  const isLocked = Boolean(playlist.locked) && !isOwner;

  const handleSubscribe = async () => {
    if (!isAuthenticated) { router.push(`/login?next=/playlist/${playlist.slug}`); return; }
    setSubscribing(true);
    try {
      const res = await api.post(`/creator/playlists/${playlist.id}/subscribe`);
      const safe = validatePaymentRedirect(res.data?.url);
      if (safe) window.location.href = safe;
      else toast.error('Could not start checkout');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header — uses track covers as a mosaic when no dedicated cover exists */}
      <div className="flex items-start gap-5 mb-8 flex-col sm:flex-row">
        <PlaylistCover playlist={playlist} tracks={tracks} />
        <div className="flex-1 min-w-0 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-1">Playlist</p>
          {editing ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent text-[color:var(--text)] border-b border-[color:var(--brand)] focus:outline-none flex-1"
                autoFocus
              />
              <button onClick={handleSaveTitle} disabled={saving} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button onClick={() => { setEditing(false); setEditTitle(playlist.title); }} className="p-1.5 text-[color:var(--text-mute)] hover:bg-[color:var(--bg-elev-2)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-[color:var(--text)] mb-2">{playlist.title}</h1>
          )}
          <div className="flex items-center gap-3 text-sm text-[color:var(--text-mute)] flex-wrap">
            {isPaid ? (
              <span className="flex items-center gap-1 text-emerald-300"><DollarSign className="w-3.5 h-3.5" /> Paid · ${(playlist.monthlyPriceCents / 100).toFixed(2)}/mo</span>
            ) : playlist.accessTier === 'PRIVATE' || playlist.isPublic === false ? (
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Private</span>
            ) : (
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Public</span>
            )}
            {!isLocked && <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {tracks.length > 0 && (
              <button onClick={handlePlayAll} className="mym-cta mym-cta-sm">
                <Play className="w-4 h-4" fill="currentColor" /> Play All
              </button>
            )}
            {isOwner && (
              <>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="p-2 rounded-full hover:bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] transition-colors" aria-label="Edit playlist">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-full hover:bg-rose-500/10 text-rose-400 disabled:opacity-50 transition-colors"
                  aria-label="Delete playlist"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Paid playlist paywall */}
      {isLocked ? (
        <div className="rounded-2xl p-8 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-400/30 text-center">
          <Lock className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[color:var(--text)] mb-2">Subscribe to unlock</h3>
          <p className="text-sm text-[color:var(--text-mute)] mb-1">
            {playlist.user?.displayName || playlist.user?.username} charges
          </p>
          <p className="text-3xl font-bold text-[color:var(--text)] mb-1">
            ${(playlist.monthlyPriceCents / 100).toFixed(2)}
            <span className="text-base font-normal text-[color:var(--text-mute)]">/month</span>
          </p>
          <p className="text-xs text-[color:var(--text-mute)] mb-6">Cancel anytime.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-semibold hover:scale-[1.02] disabled:opacity-60 transition-transform"
            >
              {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Subscribe
            </button>
            {playlist.user?.id && (
              <TipButton creatorUserId={playlist.user.id} creatorName={playlist.user.displayName || playlist.user.username} />
            )}
          </div>
        </div>
      ) : tracks.length > 0 ? (
        <div className="space-y-1">
          {tracks.map((track: any, i: number) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              tracks={tracks}
              onRemove={isOwner ? handleRemoveTrack : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style={{ background: 'var(--aurora)', opacity: 0.18 }}>
            <ListMusic className="w-6 h-6 text-[color:var(--brand)]" />
          </div>
          <p className="text-[color:var(--text-mute)] mb-3">This playlist is empty</p>
          <button onClick={() => router.push('/search')} className="text-[color:var(--brand)] hover:underline text-sm">
            Discover tracks to add →
          </button>
        </div>
      )}
    </div>
  );
}

function PlaylistCover({
  playlist,
  tracks,
}: {
  playlist: { coverArt?: string | null; title: string };
  tracks: { coverArt?: string | null }[];
}) {
  const previewCovers: string[] = [];
  for (const t of tracks) {
    if (t?.coverArt && !previewCovers.includes(t.coverArt)) previewCovers.push(t.coverArt);
    if (previewCovers.length >= 4) break;
  }

  return (
    <div className="w-40 h-40 rounded-xl overflow-hidden flex-shrink-0 shadow-2xl shadow-black/40">
      {playlist.coverArt ? (
        <img src={playlist.coverArt} alt={playlist.title} className="w-full h-full object-cover" />
      ) : previewCovers.length >= 2 ? (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          {[0, 1, 2, 3].map((i) => {
            const url = previewCovers[i] ?? previewCovers[i % previewCovers.length];
            return url ? (
              <img key={i} src={url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div key={i} style={{ background: 'var(--aurora)', opacity: 0.4 }} />
            );
          })}
        </div>
      ) : previewCovers[0] ? (
        <img src={previewCovers[0]} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--aurora)', opacity: 0.6 }}>
          <ListMusic className="w-16 h-16 text-white/80" />
        </div>
      )}
    </div>
  );
}
