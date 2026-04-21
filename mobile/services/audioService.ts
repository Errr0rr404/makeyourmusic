import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  Event,
  State,
  RepeatMode,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';
import { usePlayerStore } from '@morlo/shared';
import type { TrackItem } from '@morlo/shared';
import { getApi } from '@morlo/shared';
import { getLocalUri } from './downloadService';

let isInitialized = false;

/**
 * Initialize react-native-track-player with capabilities.
 * Call once on app boot.
 */
export async function setupPlayer(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 10, // 10 MB cache
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 1,
    });

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to setup TrackPlayer:', error);
    return false;
  }
}

/**
 * Convert our TrackItem to react-native-track-player's Track format.
 */
function toNativeTrack(track: TrackItem) {
  // Prefer an offline download if present — enables playback without network
  const localUri = getLocalUri(track.id);
  return {
    id: track.id,
    url: localUri || track.audioUrl,
    title: track.title,
    artist: track.agent.name,
    artwork: track.coverArt || undefined,
    duration: track.duration,
  };
}

/**
 * Sync the Zustand player store state to the native TrackPlayer.
 * Call this from a useEffect in the root layout.
 */
export function useSyncPlayerToNative() {
  const {
    currentTrack,
    queue,
    isPlaying,
    progress,
    repeat,
    shuffle,
    playbackSpeed,
  } = usePlayerStore();

  // This function is designed to be called inside useEffect
  return {
    syncQueue: async () => {
      if (!isInitialized || !currentTrack) return;

      try {
        const nativeTracks = queue.map(toNativeTrack);
        await TrackPlayer.reset();
        await TrackPlayer.add(nativeTracks);

        // Skip to the current track
        const idx = queue.findIndex((t) => t.id === currentTrack.id);
        if (idx >= 0) {
          await TrackPlayer.skip(idx);
        }
      } catch (err) {
        console.error('syncQueue error:', err);
      }
    },

    syncPlayState: async () => {
      if (!isInitialized) return;
      try {
        if (isPlaying) {
          await TrackPlayer.play();
        } else {
          await TrackPlayer.pause();
        }
      } catch (err) {
        console.error('syncPlayState error:', err);
      }
    },

    syncRepeatMode: async () => {
      if (!isInitialized) return;
      try {
        if (repeat === 'one') {
          await TrackPlayer.setRepeatMode(RepeatMode.Track);
        } else if (repeat === 'all') {
          await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        } else {
          await TrackPlayer.setRepeatMode(RepeatMode.Off);
        }
      } catch (err) {
        console.error('syncRepeatMode error:', err);
      }
    },

    syncPlaybackSpeed: async () => {
      if (!isInitialized) return;
      try {
        await TrackPlayer.setRate(playbackSpeed);
      } catch (err) {
        console.error('syncPlaybackSpeed error:', err);
      }
    },
  };
}

/**
 * Listen to native TrackPlayer events and sync state back to Zustand.
 * Call this from a useEffect in the root layout.
 */
export function setupNativePlayerListeners() {
  const store = usePlayerStore;

  // When the native player changes track (e.g. queue end, skip)
  const trackChangeSub = TrackPlayer.addEventListener(
    Event.PlaybackActiveTrackChanged,
    async (event) => {
      if (event.track) {
        const queue = store.getState().queue;
        const match = queue.find((t) => t.id === event.track?.id);
        if (match && match.id !== store.getState().currentTrack?.id) {
          store.setState({
            currentTrack: match,
            queueIndex: queue.indexOf(match),
            progress: 0,
          });
        }
      }
    },
  );

  // Track play counts
  const playbackSub = TrackPlayer.addEventListener(
    Event.PlaybackState,
    async (event) => {
      const state = event.state;
      if (state === State.Playing) {
        store.setState({ isPlaying: true });

        // Record play on the backend using track ID
        const currentTrack = store.getState().currentTrack;
        if (currentTrack) {
          try {
            const api = getApi();
            await api.post(`/tracks/${currentTrack.id}/play`, {
              durationPlayed: 0,
              completed: false,
            });
          } catch {
            // silent fail
          }
        }
      } else if (state === State.Paused) {
        store.setState({ isPlaying: false });
      }
    },
  );

  // Progress sync
  const progressSub = TrackPlayer.addEventListener(
    Event.PlaybackProgressUpdated,
    (event) => {
      store.setState({
        progress: event.position,
        duration: event.duration,
      });
    },
  );

  return () => {
    trackChangeSub.remove();
    playbackSub.remove();
    progressSub.remove();
  };
}

// Re-export hooks for convenience
export { usePlaybackState, useProgress, useActiveTrack };
