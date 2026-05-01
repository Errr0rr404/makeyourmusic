'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Search, X, Play, Pause, Loader2, Music2, User } from 'lucide-react';

export interface PickedTrack {
  id: string;
  title: string;
  slug: string;
  audioUrl: string;
  coverArt: string | null;
  duration: number; // seconds
  agent: { id: string; name: string; slug: string; avatar: string | null };
}

type ApiTrack = PickedTrack;

interface SongPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (track: PickedTrack) => void;
}

type Tab = 'mine' | 'public';

export function SongPicker({ open, onClose, onSelect }: SongPickerProps) {
  const [tab, setTab] = useState<Tab>('mine');
  const [search, setSearch] = useState('');
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Stop preview when modal closes
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      setPreviewId(null);
    }
  }, [open]);

  // Fetch when tab or search changes
  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const path = tab === 'mine' ? '/tracks/mine' : '/tracks';
        const params: Record<string, unknown> = { limit: 30 };
        if (search.trim()) params.search = search.trim();
        const res = await api.get(path, { params, signal: controller.signal });
        if (!active) return;
        const list: ApiTrack[] = (res.data.tracks || []).filter((t: ApiTrack) => Boolean(t.audioUrl));
        setTracks(list);
      } catch {
        if (active) setTracks([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [open, tab, search]);

  if (!open) return null;

  const togglePreview = (track: ApiTrack) => {
    const a = audioRef.current;
    if (!a) return;
    if (previewId === track.id) {
      a.pause();
      setPreviewId(null);
      return;
    }
    a.src = track.audioUrl;
    a.currentTime = 0;
    // Catch the iOS/Safari NotAllowedError so it doesn't surface as an
    // unhandled promise rejection in the console — autoplay restrictions
    // mean play() can reject even after a user gesture if the audio source
    // is cross-origin.
    a.play().catch(() => {});
    setPreviewId(track.id);
  };

  const handlePick = (track: ApiTrack) => {
    if (audioRef.current) audioRef.current.pause();
    setPreviewId(null);
    onSelect(track);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Music2 className="w-5 h-5 text-[hsl(var(--accent))]" />
            Pick a song
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex gap-1 bg-[hsl(var(--secondary))] p-1 rounded-lg">
            <button
              onClick={() => setTab('mine')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === 'mine' ? 'bg-[hsl(var(--card))] text-white' : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              My songs
            </button>
            <button
              onClick={() => setTab('public')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === 'public' ? 'bg-[hsl(var(--card))] text-white' : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              Catalog
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'mine' ? 'Search your songs' : 'Search the catalog'}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading && tracks.length === 0 ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {tab === 'mine'
                ? "You haven't published any tracks yet."
                : "No tracks match that search."}
            </div>
          ) : (
            <ul className="space-y-1">
              {tracks.map((t) => (
                <li key={t.id}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group">
                    <button
                      onClick={() => togglePreview(t)}
                      className="w-12 h-12 rounded-md bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                      aria-label={previewId === t.id ? 'Pause preview' : 'Play preview'}
                    >
                      {t.coverArt ? (
                        <img src={t.coverArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {previewId === t.id ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {t.agent.name}
                        <span className="text-white/30">·</span>
                        {Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePick(t)}
                      className="px-3 py-1.5 rounded-full bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:bg-[hsl(var(--primary))]/90"
                    >
                      Use
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <audio
          ref={audioRef}
          onEnded={() => setPreviewId(null)}
          className="hidden"
        />
      </div>
    </div>
  );
}
