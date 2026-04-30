// Types
export * from './types';

// Storage adapter
export { type StorageAdapter, WebStorageAdapter, setStorageAdapter, getStorage } from './storage';

// API client
export { createApi, getApi, onTokenRefreshed } from './api';

// Stores
export { usePlayerStore, DEFAULT_EQ_BANDS, EQ_PRESETS, PLAYBACK_SPEEDS } from './stores/playerStore';
export type { EQBand, EQPreset, PlaybackSpeed, PlayerState, PlayerActions, PlayerStore } from './stores/playerStore';
export { useAuthStore } from './stores/authStore';
export type { AuthState, AuthActions, AuthStore } from './stores/authStore';

// Utilities
export { formatDuration, formatCount, slugify, formatDate, truncateText, debounce } from './utils';

// Music creation catalog (genres, moods, energy, vocal styles, eras)
export {
  GENRE_TREE,
  MOOD_OPTIONS,
  ENERGY_OPTIONS,
  VOCAL_STYLE_OPTIONS,
  ERA_OPTIONS,
  PRIMARY_GENRE_NAMES,
  findSubgenreHint,
  findGenre,
  findEnergyHint,
  findVocalStyleHint,
  findEraHint,
} from './musicCatalog';
export type {
  PrimaryGenre,
  Subgenre,
  MoodOption,
  EnergyOption,
  VocalStyleOption,
  EraOption,
} from './musicCatalog';
