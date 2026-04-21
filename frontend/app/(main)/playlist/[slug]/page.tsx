'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackRow } from '@/components/track/TrackRow';
import { ListMusic, Globe, Lock, Play, Pencil, Trash2, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export default function PlaylistPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { isAuthenticated } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">{error}</p>
        <button onClick={() => router.push('/library')} className="text-[hsl(var(--accent))] hover:underline">
          Back to Library
        </button>
      </div>
    );
  }

  if (!playlist) return null;

  const tracks = playlist.tracks?.map((pt: any) => pt.track || pt) || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center flex-shrink-0">
          <ListMusic className="w-16 h-16 text-[hsl(var(--muted-foreground))]" />
        </div>
        <div className="flex-1 min-w-0 pt-2">
          <p className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))] mb-1">Playlist</p>
          {editing ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent text-white border-b border-[hsl(var(--accent))] focus:outline-none flex-1"
                autoFocus
              />
              <button onClick={handleSaveTitle} disabled={saving} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button onClick={() => { setEditing(false); setEditTitle(playlist.title); }} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-white/5 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-white mb-2">{playlist.title}</h1>
          )}
          <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            {playlist.isPublic ? (
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Public</span>
            ) : (
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Private</span>
            )}
            <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[hsl(var(--accent))] text-white text-sm font-medium hover:scale-105 transition-transform"
              >
                <Play className="w-4 h-4" /> Play All
              </button>
            )}
            {isAuthenticated && (
              <>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="p-2 rounded-full hover:bg-white/5 text-[hsl(var(--muted-foreground))]" aria-label="Edit playlist">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-full hover:bg-red-500/10 text-red-400 disabled:opacity-50"
                  aria-label="Delete playlist"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tracks */}
      {tracks.length > 0 ? (
        <div className="space-y-1">
          {tracks.map((track: any, i: number) => (
            <TrackRow key={track.id} track={track} index={i} tracks={tracks} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ListMusic className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">This playlist is empty</p>
          <button onClick={() => router.push('/search')} className="text-[hsl(var(--accent))] hover:underline text-sm mt-2">
            Discover tracks to add
          </button>
        </div>
      )}
    </div>
  );
}
