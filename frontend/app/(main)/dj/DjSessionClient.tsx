'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { connectDjNamespace } from '@/lib/socket';
import { toast } from '@/lib/store/toastStore';
import { Disc3, Wand2, Pause, Play, Loader2, AlertCircle, X, Send, Copy } from 'lucide-react';
import type { Socket } from 'socket.io-client';

type Status = 'LIVE' | 'PAUSED' | 'ENDED';

interface SlotGen {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  audioUrl: string | null;
  durationSec: number | null;
}

interface SlotData {
  id: string;
  position: number;
  vibePrompt: string;
  generationId: string | null;
  generation: SlotGen | null;
}

interface SessionData {
  id: string;
  code: string;
  status: Status;
  currentVibe: string | null;
  currentTrackId: string | null;
  nextTrackId: string | null;
  startedAt: string;
  host?: { id: string; username: string; displayName?: string | null; avatar?: string | null };
  tracks: SlotData[];
}

// Crossfade window: when the current slot has < FADE_THRESHOLD_SEC remaining
// and the next slot is ready, we begin the crossfade. The lookahead
// generation is kicked off by a server `advance` call once the crossfade
// starts.
const FADE_THRESHOLD_SEC = 5;
const FADE_DURATION_SEC = 4;

export function DjSessionClient() {
  const params = useSearchParams();
  const initialCode = params.get('code')?.toUpperCase() || '';

  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [code, setCode] = useState(initialCode);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vibeInput, setVibeInput] = useState('');
  const [draftVibe, setDraftVibe] = useState('');
  const [creating, setCreating] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const useARef = useRef(true);
  const socketRef = useRef<Socket | null>(null);
  const advanceLockRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  const refreshSession = async (codeToFetch: string) => {
    if (!codeToFetch) return null;
    try {
      const r = await api.get(`/dj/${encodeURIComponent(codeToFetch)}`);
      const s: SessionData = r.data?.session;
      setSession(s);
      setIsHost(!!user?.id && s.host?.id === user.id);
      return s;
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Session not found';
      setError(msg);
      return null;
    }
  };

  // Poll session state every 6s while active so we pick up when a queued slot's
  // generation completes (its audioUrl fills in). The Socket.IO `dj:slot-ready`
  // event is the realtime path; this poll is a backstop for joiners + race
  // conditions.
  useEffect(() => {
    if (!session || session.status === 'ENDED') return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      await refreshSession(session.code);
      pollTimerRef.current = window.setTimeout(poll, 6000);
    };
    pollTimerRef.current = window.setTimeout(poll, 6000);
    return () => {
      cancelled = true;
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status]);

  // Connect socket once we have a session.
  useEffect(() => {
    if (!session || session.status === 'ENDED') return;
    let mounted = true;
    (async () => {
      const sock = await connectDjNamespace(session.code, { token: accessToken || null });
      if (!mounted) {
        sock.disconnect();
        return;
      }
      socketRef.current = sock;
      sock.on('dj:slot-ready', () => {
        // Re-fetch — the new slot's generation is COMPLETED.
        void refreshSession(session.code);
      });
      sock.on('dj:vibe-changed', (msg: { vibe: string }) => {
        setSession((s) => (s ? { ...s, currentVibe: msg.vibe } : s));
      });
      sock.on('dj:ended', () => {
        toast.info('DJ session ended');
        setSession((s) => (s ? { ...s, status: 'ENDED' } : s));
      });
    })();
    return () => {
      mounted = false;
      const sock = socketRef.current;
      socketRef.current = null;
      sock?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, accessToken]);

  // The slot the host is currently playing.
  const currentSlot = session?.tracks.find((t) => t.position === activeSlotIdx) || null;
  const nextSlot = session?.tracks.find((t) => t.position === activeSlotIdx + 1) || null;

  // Drive crossfade + advance.
  useEffect(() => {
    if (!isHost || !session || session.status === 'ENDED' || !isPlaying) return;
    const tick = () => {
      const activeAudio = useARef.current ? audioARef.current : audioBRef.current;
      if (!activeAudio || activeAudio.duration === 0) return;
      const remaining = activeAudio.duration - activeAudio.currentTime;
      if (remaining < FADE_THRESHOLD_SEC && !advanceLockRef.current && nextSlot?.generation?.audioUrl) {
        advanceLockRef.current = true;
        beginCrossfade(nextSlot.generation.audioUrl);
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isHost, isPlaying, session, nextSlot?.generation?.audioUrl, activeSlotIdx]);

  const beginCrossfade = async (nextUrl: string) => {
    const fromAudio = useARef.current ? audioARef.current : audioBRef.current;
    const toAudio = useARef.current ? audioBRef.current : audioARef.current;
    if (!fromAudio || !toAudio) return;
    toAudio.src = nextUrl;
    toAudio.currentTime = 0;
    toAudio.volume = 0;
    try {
      await toAudio.play();
    } catch {
      // Autoplay blocked — wait for user gesture.
      advanceLockRef.current = false;
      return;
    }
    const start = performance.now();
    const fade = () => {
      const elapsed = (performance.now() - start) / 1000;
      const t = Math.min(1, elapsed / FADE_DURATION_SEC);
      if (fromAudio) fromAudio.volume = Math.max(0, 1 - t);
      if (toAudio) toAudio.volume = Math.min(1, t);
      if (t < 1) {
        requestAnimationFrame(fade);
      } else {
        if (fromAudio) {
          fromAudio.pause();
          fromAudio.src = '';
        }
        useARef.current = !useARef.current;
        advanceLockRef.current = false;
        // Tell server we advanced; it kicks off the next generation.
        api.post(`/dj/${encodeURIComponent(session!.code)}/advance`).then(() => {
          setActiveSlotIdx((i) => i + 1);
          void refreshSession(session!.code);
        }).catch((err) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 429) {
            toast.warning('Daily AI cap reached — session ending.');
          }
        });
      }
    };
    requestAnimationFrame(fade);
  };

  const startSession = async () => {
    if (!isAuthenticated) {
      toast.warning('Log in to host a DJ session');
      return;
    }
    if (!draftVibe.trim()) {
      toast.error('Tell us a vibe first');
      return;
    }
    setCreating(true);
    try {
      const r = await api.post('/dj', { vibe: draftVibe.trim() });
      const newCode = r.data?.session?.code as string | undefined;
      if (!newCode) {
        toast.error('Could not start session');
        return;
      }
      setCode(newCode);
      const s = await refreshSession(newCode);
      if (s) {
        toast.success('Session started — first track is generating');
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        toast.error('Daily AI generation cap reached');
      } else {
        toast.error(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to start session'
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const joinByCode = async () => {
    setError(null);
    setLoading(true);
    await refreshSession(code.trim().toUpperCase());
    setLoading(false);
  };

  const togglePlay = async () => {
    const activeAudio = useARef.current ? audioARef.current : audioBRef.current;
    if (!activeAudio) return;
    if (isPlaying) {
      activeAudio.pause();
      setIsPlaying(false);
      return;
    }
    if (!activeAudio.src && currentSlot?.generation?.audioUrl) {
      activeAudio.src = currentSlot.generation.audioUrl;
      activeAudio.volume = 1;
    }
    try {
      await activeAudio.play();
      setIsPlaying(true);
    } catch {
      toast.error('Could not start playback');
    }
  };

  const shiftVibe = async () => {
    if (!session || !vibeInput.trim()) return;
    setShifting(true);
    try {
      await api.post(`/dj/${encodeURIComponent(session.code)}/vibe`, { vibe: vibeInput.trim() });
      setSession((s) => (s ? { ...s, currentVibe: vibeInput.trim() } : s));
      socketRef.current?.emit('host:vibe-changed', { vibe: vibeInput.trim() });
      setVibeInput('');
      toast.success('Vibe shift queued — next track will follow');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to update vibe'
      );
    } finally {
      setShifting(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    if (!confirm('End this DJ session?')) return;
    try {
      await api.post(`/dj/${encodeURIComponent(session.code)}/end`);
      setSession((s) => (s ? { ...s, status: 'ENDED' } : s));
      const a = audioARef.current;
      const b = audioBRef.current;
      a?.pause();
      b?.pause();
      setIsPlaying(false);
      toast.success('Session ended');
    } catch {
      toast.error('Failed to end session');
    }
  };

  const copyShareLink = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dj?code=${session.code}`);
      toast.success('Session link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  // No session loaded yet → show start / join screen.
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Disc3 className="w-5 h-5 text-purple-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">AI DJ Mode</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Real-time AI improv DJ</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Type a vibe. The AI keeps spinning tracks that match — shift the vibe any time.
        </p>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-sm mb-4 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-4">
          <h2 className="text-sm font-semibold text-white mb-3">Start a session</h2>
          <textarea
            value={draftVibe}
            onChange={(e) => setDraftVibe(e.target.value.slice(0, 500))}
            placeholder="e.g. deep house, 122bpm, peak time energy"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm resize-none mb-3"
          />
          <button
            onClick={startSession}
            disabled={creating || !draftVibe.trim()}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition-transform"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Start AI DJ session
          </button>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Join an existing session</h2>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={8}
              className="flex-1 h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm uppercase tracking-widest font-mono"
            />
            <button
              onClick={joinByCode}
              disabled={loading || !code.trim()}
              className="h-10 px-5 rounded-full border border-[hsl(var(--border))] text-white text-sm font-medium hover:bg-[hsl(var(--accent))]/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ended = session.status === 'ENDED';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Disc3 className="w-5 h-5 text-purple-300 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">DJ Mode · {session.code}</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
        {session.host?.displayName || session.host?.username || 'Host'} is DJing
      </h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 truncate">
        Vibe: <span className="text-white">{session.currentVibe || '—'}</span>
      </p>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-4">
        <audio ref={audioARef} preload="auto" crossOrigin="anonymous" onEnded={() => setIsPlaying(false)} />
        <audio ref={audioBRef} preload="auto" crossOrigin="anonymous" />

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={togglePlay}
            disabled={!currentSlot?.generation?.audioUrl || ended}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-400 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Now playing (slot {activeSlotIdx})</p>
            <p className="text-sm text-white truncate">
              {currentSlot
                ? currentSlot.generation?.status === 'COMPLETED'
                  ? currentSlot.vibePrompt
                  : `Generating… (${currentSlot.generation?.status || 'PENDING'})`
                : 'No track yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <Disc3 className="w-3.5 h-3.5" />
          <span className="truncate flex-1">
            {nextSlot
              ? `Up next: ${nextSlot.generation?.status === 'COMPLETED' ? nextSlot.vibePrompt : 'queued'}`
              : 'Waiting on next slot…'}
          </span>
        </div>
      </div>

      {isHost && !ended && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-4">
          <h2 className="text-sm font-semibold text-white mb-2">Shift the vibe</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
            The next track will pick up the new direction. Current track keeps playing.
          </p>
          <div className="flex gap-2">
            <input
              value={vibeInput}
              onChange={(e) => setVibeInput(e.target.value.slice(0, 500))}
              placeholder="e.g. shift to acid techno, hands-up rave energy"
              className="flex-1 h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void shiftVibe();
              }}
            />
            <button
              onClick={shiftVibe}
              disabled={shifting || !vibeInput.trim()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {shifting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Shift
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={copyShareLink}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-[hsl(var(--border))] text-sm font-medium text-white hover:bg-[hsl(var(--accent))]/20"
        >
          <Copy className="w-4 h-4" /> Copy share link
        </button>
        {isHost && !ended && (
          <button
            onClick={endSession}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-rose-500/40 text-sm font-medium text-rose-200 hover:bg-rose-500/20"
          >
            <X className="w-4 h-4" /> End session
          </button>
        )}
        {!isAuthenticated && (
          <Link href={`/login?redirect=/dj`} className="text-xs text-purple-300 hover:underline ml-auto">
            Log in to host your own
          </Link>
        )}
      </div>
    </div>
  );
}
