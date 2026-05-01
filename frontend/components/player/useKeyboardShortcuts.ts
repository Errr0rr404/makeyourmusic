'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { toast } from '@/lib/store/toastStore';

/**
 * Global keyboard shortcuts for the music player.
 * Renders nothing — purely side-effect based.
 *
 * Shortcuts:
 *  Space       — Play / Pause
 *  ArrowLeft   — Seek backward 5s
 *  ArrowRight  — Seek forward 5s
 *  ArrowUp     — Volume up 5%
 *  ArrowDown   — Volume down 5%
 *  M           — Mute / Unmute
 *  N           — Next track
 *  P           — Previous track (when not in an input)
 *  S           — Toggle shuffle
 *  R           — Toggle repeat
 */
export const SHORTCUTS = [
  { keys: ['Space'], description: 'Play / Pause' },
  { keys: ['←'], description: 'Seek backward 5 seconds' },
  { keys: ['→'], description: 'Seek forward 5 seconds' },
  { keys: ['↑'], description: 'Volume up 5%' },
  { keys: ['↓'], description: 'Volume down 5%' },
  { keys: ['M'], description: 'Mute / Unmute' },
  { keys: ['N'], description: 'Next track' },
  { keys: ['P'], description: 'Previous track' },
  { keys: ['S'], description: 'Toggle shuffle' },
  { keys: ['R'], description: 'Cycle repeat mode' },
  { keys: ['?'], description: 'Show this help' },
];

export function useKeyboardShortcuts(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  onShowHelp?: () => void
) {
  const {
    currentTrack, isPlaying, volume, togglePlay, nextTrack, prevTrack,
    setVolume, setProgress, toggleShuffle, toggleRepeat, shuffle, repeat,
  } = usePlayerStore();

  // Remember the volume from before mute so unmute restores it. A ref instead
  // of a window global avoids polluting global scope and persists per-tab.
  const prevVolRef = useRef<number>(0.8);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs, textareas, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

      // ? opens the help modal even when no track is loaded
      if (e.key === '?' && onShowHelp) {
        e.preventDefault();
        onShowHelp();
        return;
      }

      if (!currentTrack) return;

      const audio = audioRef.current;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (audio) {
            const newTime = Math.max(0, audio.currentTime - 5);
            audio.currentTime = newTime;
            setProgress(newTime);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (audio) {
            const newTime = Math.min(audio.duration || 0, audio.currentTime + 5);
            audio.currentTime = newTime;
            setProgress(newTime);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;

        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          if (volume > 0) {
            prevVolRef.current = volume;
            setVolume(0);
            toast.info('Muted');
          } else {
            setVolume(prevVolRef.current || 0.8);
            toast.info('Unmuted');
          }
          break;

        case 'n':
        case 'N':
          e.preventDefault();
          nextTrack();
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          prevTrack();
          break;

        case 's':
        case 'S':
          e.preventDefault();
          toggleShuffle();
          toast.info(`Shuffle ${!shuffle ? 'on' : 'off'}`);
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          toggleRepeat();
          {
            const nextRepeat = repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none';
            toast.info(`Repeat: ${nextRepeat}`);
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // `isPlaying` is intentionally NOT in deps — it's never read inside the
    // handler, and re-registering the listener on every play/pause briefly
    // dropped keypresses during the swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentTrack, volume, shuffle, repeat,
    togglePlay, nextTrack, prevTrack, setVolume, setProgress,
    toggleShuffle, toggleRepeat, audioRef, onShowHelp,
  ]);
}
