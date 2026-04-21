'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePlayerStore } from '@/lib/store/playerStore';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ListMusic, SlidersHorizontal, ListOrdered,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { audioEngine } from '@/lib/audioEngine';
import { PlayerSettings } from './PlayerSettings';
import { QueuePanel } from './QueuePanel';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if a URL is same-origin (or relative).
 * Only same-origin audio can use crossOrigin="anonymous" + Web Audio API
 * without the remote server sending CORS headers.
 */
function isSameOrigin(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.origin === window.location.origin;
  } catch {
    return true; // relative URL
  }
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRecordedRef = useRef(false);
  const engineInitRef = useRef(false);
  const isPlayingRef = useRef(false);

  const {
    currentTrack, isPlaying, volume, progress, duration,
    shuffle, repeat, togglePlay, nextTrack, prevTrack,
    setVolume, setProgress, setDuration, toggleShuffle, toggleRepeat,
    playbackSpeed, eqEnabled, eqBands, showSettings, toggleSettings,
    sleepTimerEnd, tickSleepTimer,
    showQueue, toggleQueue, queue,
  } = usePlayerStore();

  // Keep ref in sync for use in non-reactive effects
  isPlayingRef.current = isPlaying;

  // Keyboard shortcuts help dialog state (? opens it)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Global keyboard shortcuts (Space, arrows, M, N, P, S, R, ?)
  useKeyboardShortcuts(audioRef, () => setShowShortcutsHelp(true));

  // Load track & optionally init audio engine (only for same-origin audio)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const sameOrigin = isSameOrigin(currentTrack.audioUrl);

    // Set crossOrigin before changing src — required for Web Audio API,
    // but only works when the server sends CORS headers (same-origin or CORS-enabled CDN)
    if (sameOrigin) {
      audio.crossOrigin = 'anonymous';
    } else {
      audio.removeAttribute('crossorigin');
    }

    audio.src = currentTrack.audioUrl;
    audio.playbackRate = playbackSpeed;
    playRecordedRef.current = false;

    // Initialize audio engine only for same-origin sources
    if (sameOrigin && !engineInitRef.current) {
      audioEngine.init(audio);
      engineInitRef.current = true;
    } else if (!sameOrigin && engineInitRef.current) {
      // Switching from same-origin to cross-origin: disconnect engine
      audioEngine.destroy();
      engineInitRef.current = false;
    }

    if (isPlayingRef.current) {
      audio.play().catch(() => {});
    }
  }, [currentTrack, playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      // Ensure engine is initialized on play (only for same-origin audio)
      if (!engineInitRef.current && currentTrack && isSameOrigin(currentTrack.audioUrl)) {
        audioEngine.init(audio);
        engineInitRef.current = true;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Volume — apply to gain node when engine is active, otherwise on element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (engineInitRef.current) {
      audioEngine.setVolume(volume);
      audio.volume = 1; // Let the gain node control volume
    } else {
      audio.volume = volume;
    }
  }, [volume]);

  // Sync playback speed
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackSpeed;
    if (engineInitRef.current) audioEngine.setPlaybackSpeed(playbackSpeed);
  }, [playbackSpeed]);

  // Sync EQ
  useEffect(() => {
    if (engineInitRef.current) {
      audioEngine.updateEQ(eqBands, eqEnabled);
    }
  }, [eqBands, eqEnabled]);

  // Sleep timer tick
  useEffect(() => {
    if (!sleepTimerEnd) return;
    const interval = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd, tickSleepTimer]);

  // Media Session API — OS-level media controls (lock screen, notification center, etc.)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.agent?.name || 'Unknown Artist',
      album: 'Morlo.ai',
      artwork: currentTrack.coverArt
        ? [
            { src: currentTrack.coverArt, sizes: '96x96', type: 'image/png' },
            { src: currentTrack.coverArt, sizes: '256x256', type: 'image/png' },
            { src: currentTrack.coverArt, sizes: '512x512', type: 'image/png' },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => { if (!isPlayingRef.current) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlayingRef.current) togglePlay(); });
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
        setProgress(details.seekTime);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [currentTrack, togglePlay, prevTrack, nextTrack, setProgress]);

  // Keep media session playback state in sync
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Update media session position state for seek bar
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: playbackSpeed,
        position: Math.min(progress, duration),
      });
    } catch {
      // setPositionState may throw if values are invalid
    }
  }, [progress, duration, playbackSpeed]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);

    // Record play after 30 seconds
    if (audio.currentTime > 30 && !playRecordedRef.current && currentTrack) {
      playRecordedRef.current = true;
      api.post(`/tracks/${currentTrack.id}/play`, {
        durationPlayed: Math.floor(audio.currentTime),
        completed: false,
      }).catch(() => {});
    }
  }, [currentTrack, setProgress]);

  const handleEnded = useCallback(() => {
    if (repeat === 'one') {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } else {
      // Record completed play
      if (currentTrack) {
        api.post(`/tracks/${currentTrack.id}/play`, {
          durationPlayed: Math.floor(duration),
          completed: true,
        }).catch(() => {});
      }
      nextTrack();
    }
  }, [repeat, nextTrack, currentTrack, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgress(time);
  };

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const hasActiveSettings = eqEnabled || playbackSpeed !== 1 || sleepTimerEnd !== null;

  return (
    <>
      {/* Settings Panel (above player) */}
      <PlayerSettings />
      <AnimatePresence>
        {showQueue && <QueuePanel />}
      </AnimatePresence>
      <KeyboardShortcutsDialog open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

      <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] z-50 flex items-center px-4">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          onEnded={handleEnded}
        />

        {/* Track Info */}
        <div className="flex items-center gap-3 w-auto sm:w-[240px] min-w-0 sm:min-w-[180px]">
          <div className="w-12 h-12 rounded-md overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
            {currentTrack.coverArt ? (
              <img src={currentTrack.coverArt} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Link href={`/track/${currentTrack.slug}`} className="text-sm font-medium text-white truncate block hover:underline">
              {currentTrack.title}
            </Link>
            {currentTrack.agent && (
              <Link href={`/agent/${currentTrack.agent.slug}`} className="text-xs text-[hsl(var(--muted-foreground))] truncate block hover:underline">
                {currentTrack.agent.name}
              </Link>
            )}
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex-1 flex flex-col items-center max-w-[600px] mx-auto">
          <div className="flex items-center gap-2 sm:gap-4 mb-1">
            <button onClick={toggleShuffle} aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'} className={`p-1 hidden sm:block transition-colors ${shuffle ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={prevTrack} aria-label="Previous track" className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
              {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
            </button>
            <button onClick={nextTrack} aria-label="Next track" className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>
            <button onClick={toggleRepeat} aria-label={`Repeat: ${repeat}`} className={`p-1 hidden sm:block transition-colors ${repeat !== 'none' ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))] w-10 text-right">{formatTime(progress)}</span>
            <div className="flex-1 relative group">
              <div className="h-1 rounded-full bg-[hsl(var(--secondary))]">
                <div className="h-full rounded-full bg-white group-hover:bg-[hsl(var(--accent))] transition-colors" style={{ width: `${progressPercent}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))] w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="hidden sm:flex items-center gap-2 w-[200px] justify-end">
          {/* Queue Button */}
          <button
            onClick={toggleQueue}
            aria-label="Queue"
            className={`p-1.5 rounded-md transition-colors relative ${
              showQueue
                ? 'text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.15)]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--secondary))]'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            {queue.length > 1 && !showQueue && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-[hsl(var(--accent))] text-white rounded-full w-4 h-4 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>

          {/* Settings/EQ Button */}
          <button
            onClick={toggleSettings}
            aria-label="Audio settings"
            className={`p-1.5 rounded-md transition-colors relative ${
              showSettings
                ? 'text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.15)]'
                : hasActiveSettings
                  ? 'text-[hsl(var(--accent))] hover:bg-[hsl(var(--secondary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--secondary))]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveSettings && !showSettings && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[hsl(var(--accent))]" />
            )}
          </button>

          {/* Speed Indicator (when not 1x) */}
          {playbackSpeed !== 1 && (
            <span className="text-[10px] font-semibold text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.15)] px-1.5 py-0.5 rounded-md">
              {playbackSpeed}x
            </span>
          )}

          {/* Volume */}
          <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)} aria-label={volume === 0 ? 'Unmute' : 'Mute'} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="w-20 relative group">
            <div className="h-1 rounded-full bg-[hsl(var(--secondary))]">
              <div className="h-full rounded-full bg-white group-hover:bg-[hsl(var(--accent))] transition-colors" style={{ width: `${volume * 100}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Mobile settings button */}
        <button
          onClick={toggleSettings}
          aria-label="Audio settings"
          className={`sm:hidden p-2 ml-2 transition-colors ${
            showSettings || hasActiveSettings
              ? 'text-[hsl(var(--accent))]'
              : 'text-[hsl(var(--muted-foreground))]'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
