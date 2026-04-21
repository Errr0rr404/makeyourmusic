import { create } from 'zustand';
import type { TrackItem } from '../types';
import { getApi } from '../api';

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
  { frequency: 15000, gain: 0, label: '15K' },
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

type PersistedPlayerPrefs = {
  playbackSpeed: PlaybackSpeed;
  eqEnabled: boolean;
  eqPresetId: string;
  eqBands: EQBand[];
  crossfade: number;
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  autoplay: boolean;
};

const PREFS_STORAGE_KEY = "music4ai-player-prefs-v1";

function loadPlayerPrefs(): Partial<PersistedPlayerPrefs> {
  try {
    if (typeof globalThis === "undefined") return {};
    const ls = (globalThis as any).localStorage;
    if (!ls) return {};
    const raw = ls.getItem(PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedPlayerPrefs>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistPlayerPrefs(update: Partial<PersistedPlayerPrefs>): void {
  try {
    if (typeof globalThis === "undefined") return;
    const ls = (globalThis as any).localStorage;
    if (!ls) return;
    const current = loadPlayerPrefs();
    const next = { ...current, ...update };
    ls.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local persistence is best-effort only.
  }
}

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
  autoplay: boolean;

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
  showQueue: boolean;
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
  toggleAutoplay: () => void;
  addToQueue: (track: TrackItem) => void;
  appendToQueue: (tracks: TrackItem[]) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  /** Fetch similar tracks and append to queue if autoplay is on and we're near the end. */
  autoFillIfNeeded: () => Promise<void>;

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
  toggleQueue: () => void;
  moveInQueue: (fromIndex: number, toIndex: number) => void;
}

export type PlayerStore = PlayerState & PlayerActions;

const persistedPrefs = loadPlayerPrefs();

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: typeof persistedPrefs.volume === "number" ? persistedPrefs.volume : 0.8,
  progress: 0,
  duration: 0,
  shuffle: typeof persistedPrefs.shuffle === "boolean" ? persistedPrefs.shuffle : false,
  repeat: persistedPrefs.repeat ?? 'none',
  autoplay: typeof persistedPrefs.autoplay === "boolean" ? persistedPrefs.autoplay : true,

  // Audio settings defaults
  playbackSpeed: persistedPrefs.playbackSpeed ?? 1,
  eqEnabled: typeof persistedPrefs.eqEnabled === "boolean" ? persistedPrefs.eqEnabled : false,
  eqPresetId: persistedPrefs.eqPresetId ?? 'flat',
  eqBands: Array.isArray(persistedPrefs.eqBands) && persistedPrefs.eqBands.length === DEFAULT_EQ_BANDS.length
    ? persistedPrefs.eqBands
    : DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
  crossfade: typeof persistedPrefs.crossfade === "number" ? persistedPrefs.crossfade : 0,
  sleepTimer: null,
  sleepTimerEnd: null,

  // UI
  showSettings: false,
  showQueue: false,

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
    const { queue, queueIndex, shuffle, repeat, autoplay } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    } else if (autoplay) {
      // Radio mode: fetch similar and keep playing. Fire-and-forget.
      get().autoFillIfNeeded().then(() => {
        const fresh = get();
        if (fresh.queueIndex < fresh.queue.length - 1) {
          const ni = fresh.queueIndex + 1;
          set({
            currentTrack: fresh.queue[ni],
            queueIndex: ni,
            isPlaying: true,
            progress: 0,
          });
        } else {
          set({ isPlaying: false });
        }
      });
      return;
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

    // Pre-fetch more tracks if we're nearing the end and autoplay is on
    if (autoplay && queue.length - 1 - nextIndex <= 2) {
      void get().autoFillIfNeeded();
    }
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
  setVolume: (volume) => {
    const next = Math.max(0, Math.min(1, volume));
    persistPlayerPrefs({ volume: next });
    set({ volume: next });
  },
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () =>
    set((s) => {
      const shuffle = !s.shuffle;
      persistPlayerPrefs({ shuffle });
      return { shuffle };
    }),
  toggleRepeat: () =>
    set((s) => {
      const repeat = s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none';
      persistPlayerPrefs({ repeat });
      return { repeat };
    }),
  toggleAutoplay: () =>
    set((s) => {
      const autoplay = !s.autoplay;
      persistPlayerPrefs({ autoplay });
      return { autoplay };
    }),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  appendToQueue: (tracks) => set((s) => {
    // Dedupe — skip tracks already in queue
    const existing = new Set(s.queue.map((t) => t.id));
    const fresh = tracks.filter((t) => !existing.has(t.id));
    return { queue: [...s.queue, ...fresh] };
  }),
  removeFromQueue: (trackId) => set((s) => {
    const newQueue = s.queue.filter((t) => t.id !== trackId);
    const newIndex = s.currentTrack
      ? newQueue.findIndex((t) => t.id === s.currentTrack!.id)
      : -1;
    return { queue: newQueue, queueIndex: newIndex >= 0 ? newIndex : s.queueIndex };
  }),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  autoFillIfNeeded: async () => {
    const { autoplay, currentTrack, queue, queueIndex } = get();
    if (!autoplay || !currentTrack) return;
    // Only fill when we're on the last track (or there's nothing after)
    const tracksRemaining = queue.length - 1 - queueIndex;
    if (tracksRemaining > 2) return;

    try {
      const api = getApi();
      const slugOrId = (currentTrack as any).slug || currentTrack.id;
      const res = await api.get(`/tracks/${slugOrId}/similar?limit=10`);
      const similar: TrackItem[] = (res.data?.tracks || []).filter(
        (t: TrackItem) => t.id !== currentTrack.id
      );
      if (similar.length > 0) {
        get().appendToQueue(similar);
      }
    } catch {
      // Non-critical — if it fails, nothing bad happens
    }
  },

  // ─── Audio Settings Actions ────────────────────────────

  setPlaybackSpeed: (speed) => {
    persistPlayerPrefs({ playbackSpeed: speed });
    set({ playbackSpeed: speed });
  },

  toggleEQ: () =>
    set((s) => {
      const eqEnabled = !s.eqEnabled;
      persistPlayerPrefs({ eqEnabled });
      return { eqEnabled };
    }),

  setEQPreset: (presetId) => {
    const preset = EQ_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newBands = DEFAULT_EQ_BANDS.map((band, i) => ({
      ...band,
      gain: preset.bands[i] ?? 0,
    }));
    persistPlayerPrefs({ eqPresetId: presetId, eqBands: newBands, eqEnabled: true });
    set({ eqPresetId: presetId, eqBands: newBands, eqEnabled: true });
  },

  setEQBandGain: (index, gain) => {
    const clampedGain = Math.max(-12, Math.min(12, gain));
    set((s) => {
      const newBands = [...s.eqBands];
      const existing = newBands[index];
      if (existing) newBands[index] = { ...existing, gain: clampedGain };
      persistPlayerPrefs({ eqBands: newBands, eqPresetId: 'custom' });
      return { eqBands: newBands, eqPresetId: 'custom' };
    });
  },

  resetEQ: () => {
    const eqBands = DEFAULT_EQ_BANDS.map((b) => ({ ...b }));
    persistPlayerPrefs({ eqBands, eqPresetId: 'flat', eqEnabled: false });
    set({
      eqBands,
      eqPresetId: 'flat',
      eqEnabled: false,
    });
  },

  setCrossfade: (seconds) => {
    const crossfade = Math.max(0, Math.min(12, seconds));
    persistPlayerPrefs({ crossfade });
    set({ crossfade });
  },

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

  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings, showQueue: false })),
  toggleQueue: () => set((s) => ({ showQueue: !s.showQueue, showSettings: false })),
  moveInQueue: (fromIndex, toIndex) => set((s) => {
    const newQueue = [...s.queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    if (moved) newQueue.splice(toIndex, 0, moved);
    // Recalculate queueIndex to keep current track selected
    const newIdx = s.currentTrack ? newQueue.findIndex((t) => t.id === s.currentTrack!.id) : -1;
    return { queue: newQueue, queueIndex: newIdx };
  }),
}));
