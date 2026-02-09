'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackRow } from '@/components/track/TrackRow';
import { Heart, ListMusic, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LibraryPage() {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'liked' | 'playlists'>('liked');
  const [likedTracks, setLikedTracks] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    async function load() {
      try {
        const [likesRes, playlistsRes] = await Promise.all([
          api.get('/social/likes'),
          api.get('/social/playlists/mine'),
        ]);
        setLikedTracks(likesRes.data.tracks || []);
        setPlaylists(playlistsRes.data.playlists || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your Library</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to see your liked songs and playlists</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">Log In</Link>
      </div>
    );
  }

  const handleLike = async (trackId: string) => {
    try {
      await api.post(`/social/likes/${trackId}`);
      setLikedTracks(prev => prev.filter(t => t.id !== trackId));
    } catch {}
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('liked')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'liked' ? 'bg-white text-black' : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'}`}>
          <Heart className="w-4 h-4" /> Liked Songs
        </button>
        <button onClick={() => setTab('playlists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'playlists' ? 'bg-white text-black' : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'}`}>
          <ListMusic className="w-4 h-4" /> Playlists
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-[hsl(var(--secondary))] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tab === 'liked' ? (
        likedTracks.length > 0 ? (
          <div className="space-y-1">
            {likedTracks.map((track, i) => (
              <TrackRow key={track.id} track={{ ...track, isLiked: true }} index={i} tracks={likedTracks} onLike={handleLike} />
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">No liked songs yet. Start exploring!</p>
        )
      ) : (
        <div>
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.map((pl) => (
                <Link key={pl.id} href={`/playlist/${pl.slug}`} className="bg-[hsl(var(--card))] rounded-xl p-4 hover:bg-[hsl(var(--secondary))] transition-colors">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-3">
                    <ListMusic className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{pl.title}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{pl._count?.tracks || 0} tracks</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-[hsl(var(--muted-foreground))]">No playlists yet</p>
          )}
        </div>
      )}
    </div>
  );
}
