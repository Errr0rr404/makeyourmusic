'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { connectPartiesNamespace } from '@/lib/socket';
import { toast } from '@/lib/store/toastStore';
import { Play, Pause, Users, Crown, Music, Copy, Loader2, AlertCircle, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';

type PartyState = {
  partyId: string;
  hostUserId: string;
  isPlaying: boolean;
  positionMs: number;
  trackId: string | null;
  isHost?: boolean;
  serverTime: number;
};

type PartySnapshot = {
  id: string;
  code: string;
  status: 'ACTIVE' | 'ENDED';
  positionMs: number;
  isPlaying: boolean;
  startedAt: string;
  hostUserId: string;
  host?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
  track?: {
    id: string;
    slug: string;
    title: string;
    audioUrl: string;
    coverArt?: string | null;
    duration: number;
    agent?: { id: string; name: string; slug: string } | null;
  } | null;
  members: Array<{
    id: string;
    joinedAt: string;
    user?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
  }>;
};

const SYNC_THRESHOLD_MS = 1500;
const TICK_INTERVAL_MS = 5000;

export function PartyClient({ code }: { code: string }) {
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<number>(1);
  const [isHost, setIsHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tickTimerRef = useRef<number | null>(null);

  // Initial REST snapshot + join the party.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await api.get(`/parties/${encodeURIComponent(code)}`);
        if (cancelled) return;
        const party = r.data?.party as PartySnapshot;
        if (!party) {
          setError('Party not found');
          setLoading(false);
          return;
        }
        setSnapshot(party);
        setIsHost(!!user && user.id === party.hostUserId);
        setMembers(Math.max(1, party.members.filter((m) => !!m.user).length || 1));
        setIsPlaying(party.isPlaying);
        setPositionSec(party.positionMs / 1000);
        // Idempotent join (creates a member row).
        try {
          await api.post(`/parties/${encodeURIComponent(code)}/join`);
        } catch {
          // 410 = ended; ignore — we'll show "Party ended" state.
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load party';
        setError(msg);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [code, user]);

  const partyId = snapshot?.id;
  const partyStatus = snapshot?.status;

  // Socket lifecycle. Reconnects automatically; leave-on-unmount is best-effort.
  useEffect(() => {
    if (!partyId || partyStatus === 'ENDED') return;
    let mounted = true;

    (async () => {
      const sock = await connectPartiesNamespace(code, {
        token: accessToken || null,
        guestKey: getGuestCookie(),
      });
      if (!mounted) {
        sock.disconnect();
        return;
      }
      socketRef.current = sock;

      sock.on('state', (state: PartyState) => {
        setIsPlaying(state.isPlaying);
        setPositionSec(state.positionMs / 1000);
        setIsHost(!!state.isHost);
        if (audioRef.current && !isHost) {
          // Members re-seek silently when drift exceeds threshold. Host's own
          // <audio> is ground truth so we never seek the host element.
          const localMs = audioRef.current.currentTime * 1000;
          if (Math.abs(localMs - state.positionMs) > SYNC_THRESHOLD_MS) {
            audioRef.current.currentTime = state.positionMs / 1000;
          }
          if (state.isPlaying && audioRef.current.paused) {
            audioRef.current.play().catch(() => {/* autoplay blocked */});
          } else if (!state.isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
          }
        }
      });

      sock.on('member:joined', () => setMembers((n) => n + 1));
      sock.on('member:left', () => setMembers((n) => Math.max(1, n - 1)));
      sock.on('party:ended', () => {
        toast.info('Party ended');
        setSnapshot((s) => (s ? { ...s, status: 'ENDED' } : s));
      });
      sock.on('connect_error', (err: Error) => {
        // Auth or network problem; let socket.io retry. Don't toast each retry.
        console.warn('parties socket connect_error:', err.message);
      });
    })();

    return () => {
      mounted = false;
      const sock = socketRef.current;
      socketRef.current = null;
      sock?.disconnect();
    };
  }, [partyId, partyStatus, code, accessToken, isHost]);

  // Host-side periodic tick. Without this, joiners arriving mid-session don't
  // get a fresh state event for ~30s; the cron sweep also relies on this to
  // know the host is still alive.
  useEffect(() => {
    if (!isHost) return;
    const send = () => {
      if (!audioRef.current) return;
      socketRef.current?.emit('host:tick', {
        positionMs: Math.floor(audioRef.current.currentTime * 1000),
        isPlaying: !audioRef.current.paused,
      });
    };
    tickTimerRef.current = window.setInterval(send, TICK_INTERVAL_MS) as unknown as number;
    return () => {
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    };
  }, [isHost]);

  const togglePlayHost = () => {
    if (!isHost || !audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      socketRef.current?.emit('host:play', {
        positionMs: Math.floor(audioRef.current.currentTime * 1000),
      });
    } else {
      audioRef.current.pause();
      socketRef.current?.emit('host:pause', {
        positionMs: Math.floor(audioRef.current.currentTime * 1000),
      });
    }
  };

  const seekHost = (sec: number) => {
    if (!isHost || !audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, sec);
    socketRef.current?.emit('host:seek', { positionMs: Math.floor(sec * 1000) });
  };

  const endParty = async () => {
    if (!isHost || !snapshot) return;
    try {
      await api.post(`/parties/${encodeURIComponent(code)}/end`);
      toast.success('Party ended');
      router.push('/');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to end party');
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/party/${code}`);
      toast.success('Party link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto mb-3" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Joining party…</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center animate-fade-in">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Party not available</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">{error || 'Try a different code.'}</p>
        <Link href="/" className="text-purple-300 hover:underline">Back home</Link>
      </div>
    );
  }

  const ended = snapshot.status === 'ENDED';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-purple-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
          Listening party
        </span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
        {snapshot.host?.displayName || snapshot.host?.username || 'Someone'} is hosting
      </h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Code <span className="font-mono text-white">{snapshot.code}</span> · {members} listening
      </p>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-6">
        {snapshot.track ? (
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
              {snapshot.track.coverArt ? (
                <img src={snapshot.track.coverArt} alt={snapshot.track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/track/${snapshot.track.slug}`}
                className="text-base font-semibold text-white hover:underline truncate block"
              >
                {snapshot.track.title}
              </Link>
              {snapshot.track.agent && (
                <Link
                  href={`/agent/${snapshot.track.agent.slug}`}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white"
                >
                  {snapshot.track.agent.name}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Host hasn&apos;t picked a track yet.</p>
        )}

        {snapshot.track && (
          <div className="mt-5 space-y-3">
            <audio
              ref={audioRef}
              src={snapshot.track.audioUrl}
              preload="auto"
              onTimeUpdate={(e) => {
                if (isHost) setPositionSec((e.target as HTMLAudioElement).currentTime);
              }}
              onEnded={() => {
                if (isHost) socketRef.current?.emit('host:pause', { positionMs: 0 });
              }}
              crossOrigin="anonymous"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayHost}
                disabled={!isHost || ended}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={snapshot.track.duration || 1}
                step={1}
                value={Math.min(positionSec, snapshot.track.duration || 1)}
                onChange={(e) => seekHost(Number(e.target.value))}
                disabled={!isHost || ended}
                className="flex-1 disabled:opacity-50"
              />
              <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums w-20 text-right">
                {fmt(positionSec)} / {fmt(snapshot.track.duration || 0)}
              </span>
            </div>
            {!isHost && !ended && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                The host controls playback. You&apos;ll stay in sync automatically.
              </p>
            )}
            {ended && (
              <p className="text-xs text-rose-300">This party has ended.</p>
            )}
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-[hsl(var(--border))] flex flex-wrap items-center gap-2">
          <button
            onClick={copyShareLink}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-[hsl(var(--border))] text-sm font-medium text-white hover:bg-[hsl(var(--accent))]/20"
          >
            <Copy className="w-4 h-4" /> Copy share link
          </button>
          {isHost && !ended && (
            <button
              onClick={endParty}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-rose-500/40 text-sm font-medium text-rose-200 hover:bg-rose-500/20"
            >
              <X className="w-4 h-4" /> End party
            </button>
          )}
          {!isAuthenticated && (
            <Link
              href={`/login?redirect=/party/${code}`}
              className="text-xs text-purple-300 hover:underline ml-auto"
            >
              Log in to host your own
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> In the room ({members})
        </h2>
        <ul className="space-y-2">
          {snapshot.members.length === 0 && (
            <li className="text-sm text-[hsl(var(--muted-foreground))]">Just you — share the code to invite friends.</li>
          )}
          {snapshot.members.map((m) => {
            const isPartyHost = m.user?.id === snapshot.hostUserId;
            return (
              <li key={m.id} className="flex items-center gap-3 text-sm text-white">
                <div className="w-7 h-7 rounded-full bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
                  {m.user?.avatar ? (
                    <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[hsl(var(--muted-foreground))] text-xs">
                      {(m.user?.displayName || m.user?.username || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="truncate">
                  {m.user?.displayName || m.user?.username || 'Guest'}
                </span>
                {isPartyHost && (
                  <Crown className="w-3.5 h-3.5 text-amber-300" aria-label="Host" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

function getGuestCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)mym_party_guest=([a-f0-9]{16,64})/i);
  return m && m[1] ? m[1] : null;
}
