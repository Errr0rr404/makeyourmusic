'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePlayerStore } from '@/lib/store/playerStore';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ListMusic, SlidersHorizontal, ListOrdered, Square,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import api from '@/lib/api';
import { audioEngine } from '@/lib/audioEngine';
import { PlayerSettings } from './PlayerSettings';
import { QueuePanel } from './QueuePanel';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useIsVintage, TransportButton, VUMeterStereo, Readout, TapeProgress, LedDot } from '@/components/vintage';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Whether an audio URL can flow through Web Audio API (and therefore EQ).
 *
 * Same-origin URLs always work. Cross-origin URLs work when the host returns
 * CORS-permissive headers and we set crossOrigin="anonymous" on the element.
 * Cloudinary's `res.cloudinary.com` delivery returns `access-control-allow-origin: *`
 * for video/raw/audio assets, so it qualifies. Extend CORS_HOSTS as new
 * trusted hosts are added (e.g. R2, S3 with CORS configured).
 */
const CORS_HOSTS = new Set<string>([
  'res.cloudinary.com',
]);

function isSameOrigin(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return true;
    return CORS_HOSTS.has(parsed.hostname);
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
  const crossfadePromoteTimeoutRef = useRef<number | null>(null);
  const crossfadeSafetyTimeoutRef = useRef<number | null>(null);

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

  const isVintage = useIsVintage();

  const getActiveEl = () => (activeSlotRef.current === 'a' ? audioARef.current : audioBRef.current);
  const getInactiveEl = () => (activeSlotRef.current === 'a' ? audioBRef.current : audioARef.current);

  const cancelCrossfade = useCallback(() => {
    if (crossfadeTimerRef.current) {
      window.clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    if (crossfadePromoteTimeoutRef.current) {
      window.clearTimeout(crossfadePromoteTimeoutRef.current);
      crossfadePromoteTimeoutRef.current = null;
    }
    if (crossfadeSafetyTimeoutRef.current) {
      window.clearTimeout(crossfadeSafetyTimeoutRef.current);
      crossfadeSafetyTimeoutRef.current = null;
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
    // Intentionally NOT depending on `volume` or `playbackSpeed` — those
    // have their own dedicated effects below. Including them here meant
    // dragging the volume slider during a crossfade would cancel the
    // crossfade and reload the same src, causing an audible stutter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, cancelCrossfade, tryInitEngine]);

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
      album: 'MakeYourMusic',
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
      crossfadePromoteTimeoutRef.current = window.setTimeout(() => {
        crossfadePromoteTimeoutRef.current = null;
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
        if (Number.isFinite(inactive.duration)) setDuration(inactive.duration);
        setProgress(inactive.currentTime || 0);
      }, crossfade * 1000 + 50);
    };

    if (inactive.readyState >= 2) {
      startGains();
    } else {
      const onCanPlay = () => {
        inactive.removeEventListener('canplay', onCanPlay);
        if (crossfadeSafetyTimeoutRef.current) {
          window.clearTimeout(crossfadeSafetyTimeoutRef.current);
          crossfadeSafetyTimeoutRef.current = null;
        }
        if (crossfadingRef.current) startGains();
      };
      inactive.addEventListener('canplay', onCanPlay);
      crossfadeSafetyTimeoutRef.current = window.setTimeout(() => {
        inactive.removeEventListener('canplay', onCanPlay);
        crossfadeSafetyTimeoutRef.current = null;
        if (crossfadingRef.current && inactive.readyState < 2) cancelCrossfade();
      }, 5000);
    }
  }, [crossfade, repeat, queue, queueIndex, shuffle, playbackSpeed, volume, nextTrack, cancelCrossfade, setDuration, setProgress]);

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
      if (currentTrack && !playRecordedRef.current) {
        playRecordedRef.current = true;
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

      {/* Hidden audio elements (shared between skins). */}
      <audio
        ref={audioARef}
        crossOrigin="anonymous"
        className="hidden"
        onTimeUpdate={() => { if (activeSlotRef.current === 'a') handleTimeUpdate(); }}
        onLoadedMetadata={() => {
          if (activeSlotRef.current === 'a' && audioARef.current) setDuration(audioARef.current.duration);
        }}
        onEnded={() => { if (activeSlotRef.current === 'a') handleEnded(); }}
      />
      <audio
        ref={audioBRef}
        crossOrigin="anonymous"
        className="hidden"
        onTimeUpdate={() => { if (activeSlotRef.current === 'b') handleTimeUpdate(); }}
        onLoadedMetadata={() => {
          if (activeSlotRef.current === 'b' && audioBRef.current) setDuration(audioBRef.current.duration);
        }}
        onEnded={() => { if (activeSlotRef.current === 'b') handleEnded(); }}
      />

      {isVintage ? (
        <VintageDeckChrome
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          duration={duration}
          progressPercent={progressPercent}
          shuffle={shuffle}
          repeat={repeat}
          showQueue={showQueue}
          showSettings={showSettings}
          hasActiveSettings={hasActiveSettings}
          playbackSpeed={playbackSpeed}
          volume={volume}
          queueLength={queue.length}
          togglePlay={togglePlay}
          prevTrack={prevTrack}
          nextTrack={nextTrack}
          toggleShuffle={toggleShuffle}
          toggleRepeat={toggleRepeat}
          toggleQueue={toggleQueue}
          toggleSettings={toggleSettings}
          setVolume={setVolume}
          handleSeek={handleSeek}
        />
      ) : (
      <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[color:var(--bg-elev-1)] border-t border-[color:var(--stroke)] z-50 flex items-center gap-2 px-3 sm:gap-4 sm:px-4 md:px-6">
        {/* Track Info */}
        <div className="flex flex-1 items-center gap-2 min-w-0 sm:w-[260px] sm:flex-none sm:gap-3">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-[color:var(--bg-elev-3)] flex-shrink-0 shadow-lg shadow-black/40">
            {currentTrack.coverArt ? (
              <img src={currentTrack.coverArt} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                   style={{ background: 'var(--aurora)', opacity: 0.6 }}>
                <ListMusic className="w-5 h-5 text-white/80" />
              </div>
            )}
            {isPlaying && (
              <span className="absolute bottom-1 right-1 inline-flex gap-[2px] items-end px-1 py-0.5 rounded-sm bg-black/60">
                <span className="eq-bar" style={{ width: 2, height: 8 }} />
                <span className="eq-bar" style={{ width: 2, height: 8 }} />
                <span className="eq-bar" style={{ width: 2, height: 8 }} />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <Link href={`/track/${currentTrack.slug}`} className="text-sm font-semibold text-white truncate block hover:underline">
              {currentTrack.title}
            </Link>
            {currentTrack.agent && (
              <Link href={`/agent/${currentTrack.agent.slug}`} className="text-xs text-[color:var(--text-mute)] truncate block hover:underline hover:text-white">
                {currentTrack.agent.name}
              </Link>
            )}
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex w-[144px] flex-none min-w-0 flex-col items-center sm:flex-1 sm:w-auto sm:max-w-[640px] sm:mx-auto">
          <div className="flex items-center gap-3 sm:gap-5 mb-1.5">
            <button
              onClick={toggleShuffle}
              aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
              className={`p-1 hidden sm:block transition-colors ${
                shuffle ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-mute)] hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={prevTrack} aria-label="Previous track" className="p-1 text-[color:var(--text-soft)] hover:text-white transition-colors">
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-black/40"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-black" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
              )}
            </button>
            <button onClick={nextTrack} aria-label="Next track" className="p-1 text-[color:var(--text-soft)] hover:text-white transition-colors">
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
            <button
              onClick={toggleRepeat}
              aria-label={`Repeat: ${repeat}`}
              className={`p-1 hidden sm:block transition-colors ${
                repeat !== 'none' ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-mute)] hover:text-white'
              }`}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="hidden text-[11px] tabular-nums text-[color:var(--text-mute)] w-10 text-right sm:block">{formatTime(progress)}</span>
            <div className="flex-1 relative group">
              <div className="h-1 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white group-hover:bg-[color:var(--brand)] transition-colors"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={progress}
                onChange={handleSeek}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={duration || 0}
                aria-valuenow={progress}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="hidden text-[11px] tabular-nums text-[color:var(--text-mute)] w-10 sm:block">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 w-[200px] justify-end">
          <button
            onClick={toggleQueue}
            aria-label="Queue"
            className={`p-2 rounded-md transition-colors relative ${
              showQueue
                ? 'text-[color:var(--brand)] bg-[color:var(--brand-soft)]'
                : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            {queue.length > 1 && !showQueue && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-[color:var(--brand)] text-white rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={toggleSettings}
            aria-label="Audio settings"
            className={`p-2 rounded-md transition-colors relative ${
              showSettings
                ? 'text-[color:var(--brand)] bg-[color:var(--brand-soft)]'
                : hasActiveSettings
                  ? 'text-[color:var(--brand)] hover:bg-white/[0.06]'
                  : 'text-[color:var(--text-mute)] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveSettings && !showSettings && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[color:var(--brand)]" />
            )}
          </button>

          {playbackSpeed !== 1 && (
            <span className="text-[10px] font-bold text-[color:var(--brand)] bg-[color:var(--brand-soft)] px-1.5 py-0.5 rounded-md">
              {playbackSpeed}×
            </span>
          )}

          <button
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            className="p-1.5 text-[color:var(--text-mute)] hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="w-24 relative group">
            <div className="h-1 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white group-hover:bg-[color:var(--brand)] transition-colors"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={toggleSettings}
          aria-label="Audio settings"
          className={`sm:hidden p-2 transition-colors ${
            showSettings || hasActiveSettings
              ? 'text-[color:var(--brand)]'
              : 'text-[color:var(--text-mute)]'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>
      )}
    </>
  );
}

/* ───────────────────────── VINTAGE DECK CHROME ─────────────────────────── */

interface VintageDeckProps {
  currentTrack: NonNullable<ReturnType<typeof usePlayerStore.getState>['currentTrack']>;
  isPlaying: boolean;
  progress: number;
  duration: number;
  progressPercent: number;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  showQueue: boolean;
  showSettings: boolean;
  hasActiveSettings: boolean;
  playbackSpeed: number;
  volume: number;
  queueLength: number;
  togglePlay: () => void;
  prevTrack: () => void;
  nextTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleQueue: () => void;
  toggleSettings: () => void;
  setVolume: (v: number) => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function VintageDeckChrome({
  currentTrack,
  isPlaying,
  progress,
  duration,
  shuffle,
  repeat,
  showQueue,
  showSettings,
  hasActiveSettings,
  playbackSpeed,
  volume,
  queueLength,
  togglePlay,
  prevTrack,
  nextTrack,
  toggleShuffle,
  toggleRepeat,
  toggleQueue,
  toggleSettings,
  setVolume,
  handleSeek,
}: VintageDeckProps) {
  const remaining = Math.max(0, duration - progress);
  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, '0')}`;
  };
  const tapeProgress = duration > 0 ? progress / duration : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: 'var(--player-height)',
        background:
          'linear-gradient(180deg, #6b4423 0%, #3e2614 8%, #2b1d10 100%)',
        borderTop: '2px solid #1a1009',
        boxShadow: '0 -4px 14px rgba(0, 0, 0, 0.50)',
      }}
    >
      {/* Brushed-metal faceplate */}
      <div
        className="absolute inset-x-2 top-1.5 bottom-1.5 flex items-center gap-3 px-3 sm:px-5"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 50%), repeating-linear-gradient(90deg, var(--metal) 0px, var(--metal) 1px, var(--metal-shadow) 1px, var(--metal-shadow) 2px)',
          backgroundColor: 'var(--metal)',
          border: '1px solid var(--metal-shadow)',
          borderRadius: 4,
          boxShadow:
            'inset 0 1px 0 rgba(255, 255, 255, 0.20), inset 0 -1px 0 rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Cassette window — cover art with subtle reels overlay */}
        <Link
          href={`/track/${currentTrack.slug}`}
          className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 overflow-hidden"
          style={{
            background: '#0a0604',
            border: '1px solid #1a1009',
            borderRadius: 2,
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.85)',
          }}
        >
          {currentTrack.coverArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentTrack.coverArt} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-mute)]">
              <ListMusic className="w-5 h-5" />
            </div>
          )}
          {/* REC/PLAY indicator dot */}
          <span className="absolute top-1 right-1 flex items-center gap-1">
            <LedDot on={isPlaying} color="red" size={6} pulse={isPlaying} />
          </span>
        </Link>

        {/* Track info + counter */}
        <div className="hidden sm:flex flex-col min-w-0 w-[200px]">
          <Link
            href={`/track/${currentTrack.slug}`}
            className="text-sm font-display uppercase tracking-wide truncate text-[var(--text)] hover:underline"
          >
            {currentTrack.title}
          </Link>
          {currentTrack.agent && (
            <Link
              href={`/agent/${currentTrack.agent.slug}`}
              className="text-[11px] truncate hover:underline"
              style={{ fontFamily: 'var(--font-label)', color: 'var(--text-mute)' }}
            >
              {currentTrack.agent.name}
            </Link>
          )}
          <div className="mt-1 flex items-center gap-2">
            <Readout size="sm" glow="red">{fmt(progress)}</Readout>
            <span className="text-[10px] text-[var(--text-mute)] font-mono">−{fmt(remaining)}</span>
          </div>
        </div>

        {/* Tape window with reels — flex grow */}
        <div className="flex-1 min-w-0 max-w-[480px] mx-auto flex flex-col gap-1.5">
          <div className="relative group">
            <TapeProgress progress={tapeProgress} spinning={isPlaying} />
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={handleSeek}
              aria-label="Seek"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {/* Transport row */}
          <div className="flex items-center justify-center gap-2">
            <TransportButton
              size="sm"
              variant="metal"
              onClick={toggleShuffle}
              active={shuffle}
              aria-label="Shuffle"
              className="hidden sm:inline-flex"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </TransportButton>
            <TransportButton size="sm" variant="metal" onClick={prevTrack} aria-label="Rewind">
              <SkipBack className="w-4 h-4" fill="currentColor" />
            </TransportButton>
            <TransportButton
              size="md"
              variant="red"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Stop' : 'Play'}
            >
              {isPlaying ? <Square className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
            </TransportButton>
            <TransportButton size="sm" variant="metal" onClick={nextTrack} aria-label="Fast forward">
              <SkipForward className="w-4 h-4" fill="currentColor" />
            </TransportButton>
            <TransportButton
              size="sm"
              variant="metal"
              onClick={toggleRepeat}
              active={repeat !== 'none'}
              aria-label="Repeat"
              className="hidden sm:inline-flex"
            >
              {repeat === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </TransportButton>
          </div>
        </div>

        {/* Right-side controls: VU meter + queue + settings + volume */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <VUMeterStereo segments={10} thickness={3} />

          <button
            onClick={toggleQueue}
            aria-label="Queue"
            className="relative px-2 py-1.5"
            style={{
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 11,
              color: showQueue ? 'var(--brand)' : 'var(--text-soft)',
              background: showQueue
                ? 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 100%)'
                : 'transparent',
              borderRadius: 2,
              boxShadow: showQueue ? 'inset 0 1px 3px rgba(0,0,0,0.55)' : 'none',
            }}
          >
            <ListOrdered className="w-3.5 h-3.5 inline mr-1" />
            CUE {queueLength > 1 && <span className="text-[var(--brand)]">{queueLength}</span>}
          </button>

          <button
            onClick={toggleSettings}
            aria-label="Audio settings"
            className="relative px-2 py-1.5"
            style={{
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 11,
              color: showSettings || hasActiveSettings ? 'var(--brand)' : 'var(--text-soft)',
              background: showSettings
                ? 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 100%)'
                : 'transparent',
              borderRadius: 2,
              boxShadow: showSettings ? 'inset 0 1px 3px rgba(0,0,0,0.55)' : 'none',
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" />
            EQ
            {playbackSpeed !== 1 && <span className="ml-1 text-[var(--brand)]">{playbackSpeed}×</span>}
            {hasActiveSettings && !showSettings && <LedDot color="amber" size={5} className="absolute -top-0.5 -right-0.5" />}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="text-[var(--text-soft)] hover:text-[var(--text)]"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              className="w-20"
            />
          </div>
        </div>

        {/* Mobile right-side: just settings */}
        <button
          onClick={toggleSettings}
          aria-label="Audio settings"
          className="md:hidden flex-shrink-0 px-2 py-1.5"
          style={{
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            fontSize: 11,
            color: showSettings || hasActiveSettings ? 'var(--brand)' : 'var(--text-soft)',
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
