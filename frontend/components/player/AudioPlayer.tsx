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
 * Same-origin URLs (and the CORS-enabled ones our app sets crossOrigin on)
 * can flow through Web Audio API. Cross-origin without CORS headers cannot,
 * so the engine is bypassed and we control volume/crossfade on the elements.
 */
function isSameOrigin(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.origin === window.location.origin;
  } catch {
    return true;
  }
}

type Slot = 'a' | 'b';
const otherSlot = (s: Slot): Slot => (s === 'a' ? 'b' : 'a');

export function AudioPlayer() {
  // Two audio elements so we can overlap during a crossfade.
  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);

  // Which element is currently the "active" one driving the UI / store.
  const activeSlotRef = useRef<Slot>('a');
  // The track id loaded on the inactive element (so we can detect interruptions).
  const preloadedTrackIdRef = useRef<string | null>(null);
  // True while a crossfade is mid-flight; suppresses the load-effect for one cycle.
  const skipNextLoadRef = useRef(false);
  const crossfadingRef = useRef(false);
  const crossfadeTimerRef = useRef<number | null>(null);

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
    crossfade, queueIndex,
  } = usePlayerStore();

  isPlayingRef.current = isPlaying;

  const getActiveEl = () => (activeSlotRef.current === 'a' ? audioARef.current : audioBRef.current);
  const getInactiveEl = () => (activeSlotRef.current === 'a' ? audioBRef.current : audioARef.current);

  const cancelCrossfade = useCallback(() => {
    if (crossfadeTimerRef.current) {
      window.clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    crossfadingRef.current = false;
    preloadedTrackIdRef.current = null;
    // Reset gains: active full, inactive silent
    if (engineInitRef.current) {
      audioEngine.setSlotGain(activeSlotRef.current, 1);
      audioEngine.setSlotGain(otherSlot(activeSlotRef.current), 0);
    } else {
      const inactive = getInactiveEl();
      if (inactive) {
        try { inactive.pause(); } catch {}
        inactive.volume = 0;
      }
      const active = getActiveEl();
      if (active) active.volume = volume;
    }
  }, [volume]);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  useKeyboardShortcuts(audioARef, () => setShowShortcutsHelp(true));

  // Try to lazily init the engine once both elements are mounted and the
  // current source is same-origin. Cross-origin breaks Web Audio.
  const tryInitEngine = useCallback(() => {
    if (engineInitRef.current) return;
    const a = audioARef.current;
    const b = audioBRef.current;
    if (!a || !b || !currentTrack) return;
    if (!isSameOrigin(currentTrack.audioUrl)) return;
    audioEngine.init(a, b);
    engineInitRef.current = true;
  }, [currentTrack]);

  // Load track on the active element when currentTrack changes — unless a
  // crossfade just promoted it, in which case the new track is already playing.
  useEffect(() => {
    if (!currentTrack) return;
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      // Crossfade just completed; the freshly-active element already has the
      // right src. Just make sure metadata/play state is right.
      const active = getActiveEl();
      if (active && isPlayingRef.current) {
        active.play().catch(() => {});
      }
      return;
    }

    // A user action (skip, play different track) replaced the queue head.
    // Cancel any in-flight crossfade and load on the active element.
    cancelCrossfade();

    const active = getActiveEl();
    if (!active) return;

    const sameOrigin = isSameOrigin(currentTrack.audioUrl);
    if (sameOrigin) active.crossOrigin = 'anonymous';
    else active.removeAttribute('crossorigin');

    active.src = currentTrack.audioUrl;
    active.playbackRate = playbackSpeed;
    playRecordedRef.current = false;

    tryInitEngine();

    if (engineInitRef.current) {
      // Active gain full, inactive muted
      audioEngine.setSlotGain(activeSlotRef.current, 1);
      audioEngine.setSlotGain(otherSlot(activeSlotRef.current), 0);
      audioEngine.setVolume(volume);
      active.volume = 1; // master gain handles user volume
    } else {
      active.volume = volume;
      const inactive = getInactiveEl();
      if (inactive) inactive.volume = 0;
    }

    if (isPlayingRef.current) {
      active.play().catch(() => {});
    }
  }, [currentTrack, playbackSpeed, volume, cancelCrossfade, tryInitEngine]);

  useEffect(() => {
    const el = getActiveEl();
    if (!el) return;
    if (isPlaying) {
      tryInitEngine();
      el.play().catch(() => {});
    } else {
      el.pause();
      // Pause inactive too if it's mid-crossfade
      const inactive = getInactiveEl();
      if (inactive) try { inactive.pause(); } catch {}
    }
  }, [isPlaying, tryInitEngine]);

  // Volume — masters through the gain node when engine is active.
  useEffect(() => {
    const active = getActiveEl();
    if (!active) return;
    if (engineInitRef.current) {
      audioEngine.setVolume(volume);
      active.volume = 1;
      const inactive = getInactiveEl();
      if (inactive) inactive.volume = 1;
    } else {
      active.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioARef.current) audioARef.current.playbackRate = playbackSpeed;
    if (audioBRef.current) audioBRef.current.playbackRate = playbackSpeed;
    if (engineInitRef.current) audioEngine.setPlaybackSpeed(playbackSpeed);
  }, [playbackSpeed]);

  useEffect(() => {
    if (engineInitRef.current) audioEngine.updateEQ(eqBands, eqEnabled);
  }, [eqBands, eqEnabled]);

  useEffect(() => {
    if (!sleepTimerEnd) return;
    const interval = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd, tickSleepTimer]);

  // Media Session API
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
      const el = getActiveEl();
      if (details.seekTime != null && el) {
        el.currentTime = details.seekTime;
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

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: playbackSpeed,
        position: Math.min(progress, duration),
      });
    } catch {}
  }, [progress, duration, playbackSpeed]);

  // Kick off a crossfade: load the next track on the inactive element, ramp
  // gains in opposite directions over `crossfade` seconds, then promote it.
  const startCrossfade = useCallback(() => {
    if (crossfadingRef.current) return;
    if (crossfade <= 0 || repeat === 'one') return;
    if (queue.length === 0 || queueIndex < 0 || queueIndex >= queue.length - 1) return;
    if (shuffle) return; // pick is randomized in nextTrack(); skip predictive crossfade

    const next = queue[queueIndex + 1];
    if (!next) return;

    const inactive = getInactiveEl();
    const active = getActiveEl();
    if (!inactive || !active) return;

    // Load next on inactive
    const sameOrigin = isSameOrigin(next.audioUrl);
    if (sameOrigin) inactive.crossOrigin = 'anonymous';
    else inactive.removeAttribute('crossorigin');
    inactive.src = next.audioUrl;
    inactive.playbackRate = playbackSpeed;
    inactive.currentTime = 0;
    preloadedTrackIdRef.current = next.id;

    crossfadingRef.current = true;

    const startGains = () => {
      inactive.play().catch(() => {});
      const targetSlot: Slot = otherSlot(activeSlotRef.current);
      if (engineInitRef.current) {
        audioEngine.rampSlotGain(activeSlotRef.current, 0, crossfade);
        audioEngine.rampSlotGain(targetSlot, 1, crossfade);
      } else {
        // Linear interpolation via interval (~30fps)
        inactive.volume = 0;
        const startActiveVol = active.volume;
        const t0 = performance.now();
        const dur = crossfade * 1000;
        crossfadeTimerRef.current = window.setInterval(() => {
          const t = Math.min(1, (performance.now() - t0) / dur);
          active.volume = Math.max(0, startActiveVol * (1 - t));
          inactive.volume = Math.min(volume, volume * t);
          if (t >= 1 && crossfadeTimerRef.current) {
            window.clearInterval(crossfadeTimerRef.current);
            crossfadeTimerRef.current = null;
          }
        }, 33);
      }

      // Promote after the ramp completes.
      window.setTimeout(() => {
        if (!crossfadingRef.current) return;
        try { active.pause(); } catch {}
        if (engineInitRef.current) {
          audioEngine.setSlotGain(activeSlotRef.current, 0);
          audioEngine.setSlotGain(targetSlot, 1);
        } else {
          inactive.volume = volume;
        }
        activeSlotRef.current = targetSlot;
        crossfadingRef.current = false;
        preloadedTrackIdRef.current = null;
        // Tell the load-effect that the freshly-active element already has the
        // new track loaded and playing.
        skipNextLoadRef.current = true;
        playRecordedRef.current = false;
        nextTrack();
      }, crossfade * 1000 + 50);
    };

    if (inactive.readyState >= 2) {
      startGains();
    } else {
      const onCanPlay = () => {
        inactive.removeEventListener('canplay', onCanPlay);
        if (crossfadingRef.current) startGains();
      };
      inactive.addEventListener('canplay', onCanPlay);
      // Safety: if it never loads in time, abort
      window.setTimeout(() => {
        inactive.removeEventListener('canplay', onCanPlay);
        if (crossfadingRef.current && inactive.readyState < 2) cancelCrossfade();
      }, 5000);
    }
  }, [crossfade, repeat, queue, queueIndex, shuffle, playbackSpeed, volume, nextTrack, cancelCrossfade]);

  const handleTimeUpdate = useCallback(() => {
    const audio = getActiveEl();
    if (!audio) return;
    setProgress(audio.currentTime);

    if (audio.currentTime > 30 && !playRecordedRef.current && currentTrack) {
      playRecordedRef.current = true;
      api.post(`/tracks/${currentTrack.id}/play`, {
        durationPlayed: Math.floor(audio.currentTime),
        completed: false,
      }).catch(() => {});
    }

    // Crossfade trigger: enter overlap window.
    if (
      !crossfadingRef.current &&
      crossfade > 0 &&
      audio.duration &&
      audio.duration - audio.currentTime <= crossfade + 0.05
    ) {
      startCrossfade();
    }
  }, [currentTrack, setProgress, crossfade, startCrossfade]);

  const handleEnded = useCallback(() => {
    // If a crossfade promoted the next track, the active element changed and
    // the previous (now-paused) element fired `ended` — ignore it here.
    if (crossfadingRef.current) return;
    if (repeat === 'one') {
      const audio = getActiveEl();
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } else {
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
    const el = getActiveEl();
    if (el) el.currentTime = time;
    setProgress(time);
  };

  // Cleanup any ramping interval on unmount.
  useEffect(() => () => cancelCrossfade(), [cancelCrossfade]);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const hasActiveSettings = eqEnabled || playbackSpeed !== 1 || sleepTimerEnd !== null || crossfade > 0;

  return (
    <>
      <PlayerSettings />
      <AnimatePresence>
        {showQueue && <QueuePanel />}
      </AnimatePresence>
      <KeyboardShortcutsDialog open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

      <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] z-50 flex items-center px-4">
        <audio
          ref={audioARef}
          onTimeUpdate={() => { if (activeSlotRef.current === 'a') handleTimeUpdate(); }}
          onLoadedMetadata={() => {
            if (activeSlotRef.current === 'a' && audioARef.current) setDuration(audioARef.current.duration);
          }}
          onEnded={() => { if (activeSlotRef.current === 'a') handleEnded(); }}
        />
        <audio
          ref={audioBRef}
          onTimeUpdate={() => { if (activeSlotRef.current === 'b') handleTimeUpdate(); }}
          onLoadedMetadata={() => {
            if (activeSlotRef.current === 'b' && audioBRef.current) setDuration(audioBRef.current.duration);
          }}
          onEnded={() => { if (activeSlotRef.current === 'b') handleEnded(); }}
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

        <div className="hidden sm:flex items-center gap-2 w-[200px] justify-end">
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

          {playbackSpeed !== 1 && (
            <span className="text-[10px] font-semibold text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.15)] px-1.5 py-0.5 rounded-md">
              {playbackSpeed}x
            </span>
          )}

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
