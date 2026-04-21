'use client';

import { useEffect, useState } from 'react';
import { X, Plus, ListMusic, Loader2, CheckCircle2, AlertCircle, Globe, Lock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/lib/store/toastStore';
import { useAuthStore } from '@/lib/store/authStore';

interface Playlist {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
  _count?: { tracks: number };
}

interface Props {
  trackId: string;
  trackTitle: string;
  open: boolean;
  onClose: () => void;
}

export function AddToPlaylistDialog({ trackId, trackTitle, open, onClose }: Props) {
  const { isAuthenticated } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    setError('');
    api
      .get('/social/playlists/mine')
      .then((r) => setPlaylists(r.data.playlists || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load playlists'))
      .finally(() => setLoading(false));
  }, [open, isAuthenticated]);

  if (!open) return null;

  const handleAdd = async (playlist: Playlist) => {
    setAddingTo(playlist.id);
    try {
      await api.post(`/social/playlists/${playlist.id}/tracks`, { trackId });
      toast.success(`Added "${trackTitle}" to "${playlist.title}"`);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not add to playlist';
      if (msg.toLowerCase().includes('unique')) {
        toast.info('Already in this playlist');
        onClose();
      } else {
        toast.error(msg);
      }
    } finally {
      setAddingTo(null);
    }
  };

  const handleCreateAndAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const res = await api.post('/social/playlists', { title, isPublic: newIsPublic });
      const playlistId = res.data.playlist.id;
      await api.post(`/social/playlists/${playlistId}/tracks`, { trackId });
      toast.success(`Created "${title}" and added track`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not create playlist');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-lg font-bold text-white">Add to playlist</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{trackTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Log in to add tracks to playlists.
          </div>
        ) : (
          <>
            {/* Create new */}
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <div className="flex gap-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="New playlist title"
                  maxLength={100}
                  className="flex-1 h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTitle.trim()) handleCreateAndAdd();
                  }}
                />
                <button
                  onClick={() => setNewIsPublic((v) => !v)}
                  className={`flex items-center gap-1 px-3 rounded-lg text-xs font-medium ${
                    newIsPublic ? 'bg-green-500/10 text-green-300' : 'bg-amber-500/10 text-amber-300'
                  }`}
                  title={newIsPublic ? 'Public' : 'Private'}
                >
                  {newIsPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={creating || !newTitle.trim()}
                  className="flex items-center gap-1 px-4 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </div>

            {/* Existing playlists */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-10 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[hsl(var(--muted-foreground))] animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : playlists.length === 0 ? (
                <div className="p-10 text-center">
                  <ListMusic className="w-10 h-10 text-[hsl(var(--muted-foreground))] opacity-50 mx-auto mb-2" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No playlists yet. Create one above.
                  </p>
                </div>
              ) : (
                <ul>
                  {playlists.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handleAdd(p)}
                        disabled={addingTo === p.id}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left border-b border-[hsl(var(--border))]/60 last:border-b-0 disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center flex-shrink-0">
                          <ListMusic className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {p.isPublic ? 'Public' : 'Private'} · {p._count?.tracks || 0} tracks
                          </p>
                        </div>
                        {addingTo === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                        ) : (
                          <Plus className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
