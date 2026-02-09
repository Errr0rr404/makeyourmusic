import { create } from 'zustand';
import type { TrackItem } from '../types';

// ─── EQ Types ──────────────────────────────────────────────

export interface EQBand {
  frequency: number; // Hz
  gain: number;      // dB (-12 to +12)
  label: string;     // e.g. "60Hz", "1kHz"
}

export const DEFAULT_EQ_BANDS: EQBand[] = [
  { frequency: 60,   gain: 0, label: '60' },
  { frequency: 150,  gain: 0, label: '150' },
  { frequency: 400,  gain: 0, label: '400' },
  { frequency: 1000, gain: 0, label: '1K' },
  { frequency: 2400, gain: 0, label: '2.4K' },
  { frequency: 6000, gain: 0, label: '6K' },
  { frequency: 15000,gain: 0, label: '15K' },
];

export interface EQPreset {
  name: string;
  id: string;
  bands: number[]; // gain values matching DEFAULT_EQ_BANDS order
}

export const EQ_PRESETS: EQPreset[] = [
  { name: 'Flat',          id: 'flat',         bands: [0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost',    id: 'bass-boost',   bands: [6, 5, 3, 0, 0, 0, 0] },
  { name: 'Treble Boost',  id: 'treble-boost', bands: [0, 0, 0, 0, 2, 4, 6] },
  { name: 'Vocal',         id: 'vocal',        bands: [-2, -1, 0, 4, 4, 2, 0] },
  { name: 'Rock',          id: 'rock',         bands: [4, 3, 1, 0, 1, 3, 4] },
  { name: 'Pop',           id: 'pop',          bands: [-1, 2, 4, 4, 2, -1, -2] },
  { name: 'Jazz',          id: 'jazz',         bands: [3, 2, 1, 2, -1, 2, 4] },
  { name: 'Classical',     id: 'classical',    bands: [4, 3, 0, 0, 0, 2, 4] },
  { name: 'Electronic',    id: 'electronic',   bands: [4, 3, 1, 0, 1, 4, 5] },
  { name: 'Hip Hop',       id: 'hip-hop',      bands: [5, 4, 1, 0, 1, 2, 3] },
  { name: 'R&B',           id: 'rnb',          bands: [3, 5, 2, -1, 1, 3, 3] },
  { name: 'Acoustic',      id: 'acoustic',     bands: [3, 2, 0, 1, 2, 3, 2] },
  { name: 'Late Night',    id: 'late-night',   bands: [3, 2, 0, -2, 0, 2, 4] },
];

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

// ─── Player State ──────────────────────────────────────────

export interface PlayerState {
  currentTrack: TrackItem | null;
  queue: TrackItem[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';

  // Audio settings
  playbackSpeed: PlaybackSpeed;
  eqEnabled: boolean;
  eqPresetId: string;
  eqBands: EQBand[];
  crossfade: number;       // seconds (0 = off, 1-12)
  sleepTimer: number | null; // minutes remaining, null = off
  sleepTimerEnd: number | null; // timestamp when timer expires

  // UI state
  showSettings: boolean;
}

export interface PlayerActions {
  playTrack: (track: TrackItem, queue?: TrackItem[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: TrackItem) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;

  // Audio settings actions
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  toggleEQ: () => void;
  setEQPreset: (presetId: string) => void;
  setEQBandGain: (index: number, gain: number) => void;
  resetEQ: () => void;
  setCrossfade: (seconds: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  tickSleepTimer: () => void;
  toggleSettings: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',

  // Audio settings defaults
  playbackSpeed: 1,
  eqEnabled: false,
  eqPresetId: 'flat',
  eqBands: DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
  crossfade: 0,
  sleepTimer: null,
  sleepTimerEnd: null,

  // UI
  showSettings: false,

  playTrack: (track, queue) => {
    const newQueue = queue || [track];
    const index = newQueue.findIndex((t) => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: index >= 0 ? index : 0,
      isPlaying: true,
      progress: 0,
    });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    } else {
      set({ isPlaying: false });
      return;
    }

    set({
      currentTrack: queue[nextIndex],
      queueIndex: nextIndex,
      isPlaying: true,
      progress: 0,
    });
  },

  prevTrack: () => {
    const { queue, queueIndex, progress, repeat } = get();
    if (queue.length === 0) return;

    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, isPlaying: true, progress: 0 });
    } else if (repeat === 'all') {
      const prevIndex = queue.length - 1;
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, isPlaying: true, progress: 0 });
    } else {
      // At start with no repeat — just restart current track
      set({ progress: 0 });
    }
  },

  seek: (position) => set({ progress: position }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none',
    })),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  removeFromQueue: (trackId) => set((s) => {
    const newQueue = s.queue.filter((t) => t.id !== trackId);
    const newIndex = s.currentTrack
      ? newQueue.findIndex((t) => t.id === s.currentTrack!.id)
      : -1;
    return { queue: newQueue, queueIndex: newIndex >= 0 ? newIndex : s.queueIndex };
  }),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  // ─── Audio Settings Actions ────────────────────────────

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  toggleEQ: () => set((s) => ({ eqEnabled: !s.eqEnabled })),

  setEQPreset: (presetId) => {
    const preset = EQ_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newBands = DEFAULT_EQ_BANDS.map((band, i) => ({
      ...band,
      gain: preset.bands[i] ?? 0,
    }));
    set({ eqPresetId: presetId, eqBands: newBands, eqEnabled: true });
  },

  setEQBandGain: (index, gain) => {
    const clampedGain = Math.max(-12, Math.min(12, gain));
    set((s) => {
      const newBands = [...s.eqBands];
      const existing = newBands[index];
      if (existing) newBands[index] = { ...existing, gain: clampedGain };
      return { eqBands: newBands, eqPresetId: 'custom' };
    });
  },

  resetEQ: () => set({
    eqBands: DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
    eqPresetId: 'flat',
    eqEnabled: false,
  }),

  setCrossfade: (seconds) => set({ crossfade: Math.max(0, Math.min(12, seconds)) }),

  setSleepTimer: (minutes) => {
    if (minutes === null || minutes <= 0) {
      set({ sleepTimer: null, sleepTimerEnd: null });
    } else {
      set({
        sleepTimer: minutes,
        sleepTimerEnd: Date.now() + minutes * 60 * 1000,
      });
    }
  },

  tickSleepTimer: () => {
    const { sleepTimerEnd } = get();
    if (!sleepTimerEnd) return;

    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    if (remaining <= 0) {
      set({ isPlaying: false, sleepTimer: null, sleepTimerEnd: null });
    } else {
      set({ sleepTimer: Math.ceil(remaining / 60000) });
    }
  },

  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
}));
