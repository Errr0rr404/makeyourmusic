import { create } from 'zustand';
import type { TrackItem } from '../types';

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
}

export interface PlayerActions {
  playTrack: (track: TrackItem, queue?: TrackItem[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: TrackItem) => void;
  clearQueue: () => void;
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
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;

    // Restart if more than 3 seconds into the track
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    set({
      currentTrack: queue[prevIndex],
      queueIndex: prevIndex,
      isPlaying: true,
      progress: 0,
    });
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none',
    })),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),
}));
