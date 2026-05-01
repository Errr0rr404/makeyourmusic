import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  Event,
  State,
  RepeatMode,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
  AndroidAudioContentType,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';
import { usePlayerStore } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { getApi } from '@makeyourmusic/shared';
import { getLocalUri } from './downloadService';

let isInitialized = false;
let playRecordedForTrackId: string | null = null;
// True while syncQueue() is mid-flight. We use this to:
//   1. Suppress syncPlayState() so it doesn't call play() on an empty queue.
//   2. Suppress native→zustand updates that fire transiently while
//      reset/add/skip are in progress. TrackPlayer can briefly mark the first
//      queued item active during add(), which would otherwise overwrite the
//      user's selected track before skip(index) completes.
let isSyncingQueue = false;
let queueSyncInFlight = false;
let queueSyncPending = false;
let lastNativeQueueKey = '';
let suppressNativeTrackEventsUntil = 0;
let pendingSeekPosition: number | null = null;

/**
 * Initialize react-native-track-player with capabilities.
 * Call once on app boot.
 */
export async function setupPlayer(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    // Configure iOS audio session BEFORE setupPlayer so background audio,
    // silent-mode playback, and proper interruption handling all work
    // on the first track. Without this, iOS silences the player when the
    // ringer switch is off and audio doesn't duck for Siri/calls.
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 10, // 10 MB cache
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      iosCategoryOptions: [
        IOSCategoryOptions.AllowBluetooth,
        IOSCategoryOptions.AllowAirPlay,
      ],
      androidAudioContentType: AndroidAudioContentType.Music,
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

async function rebuildNativeQueue(nativeTracks: ReturnType<typeof toNativeTrack>[], queueKey: string) {
  await TrackPlayer.reset();
  await TrackPlayer.add(nativeTracks);
  lastNativeQueueKey = queueKey;
}

async function syncLatestQueueToNative() {
  const snapshot = usePlayerStore.getState();
  const requestedTrack = snapshot.currentTrack;

  if (!requestedTrack) {
    if (lastNativeQueueKey) {
      await TrackPlayer.reset();
      lastNativeQueueKey = '';
    }
    return;
  }

  let requestedQueue = snapshot.queue.length > 0 ? snapshot.queue : [requestedTrack];
  let requestedIndex = requestedQueue.findIndex((t) => t.id === requestedTrack.id);

  if (requestedIndex < 0) {
    requestedQueue = [requestedTrack, ...requestedQueue.filter((t) => t.id !== requestedTrack.id)];
    requestedIndex = 0;
    usePlayerStore.setState({ queue: requestedQueue, queueIndex: 0 });
  }

  const queueKey = requestedQueue.map((t) => t.id).join(',');
  const nativeTracks = requestedQueue.map(toNativeTrack);

  try {
    if (lastNativeQueueKey !== queueKey) {
      await rebuildNativeQueue(nativeTracks, queueKey);
    }
    await TrackPlayer.skip(requestedIndex, 0);
  } catch {
    // If native state drifted from our cache, rebuild once and apply the
    // selection again. This keeps agent-list taps from falling back to item 0.
    lastNativeQueueKey = '';
    await rebuildNativeQueue(nativeTracks, queueKey);
    await TrackPlayer.skip(requestedIndex, 0);
  }

  playRecordedForTrackId = null;
  const pendingSeek = pendingSeekPosition;
  pendingSeekPosition = null;

  const latest = usePlayerStore.getState();
  if (latest.currentTrack?.id === requestedTrack.id && latest.queueIndex !== requestedIndex) {
    usePlayerStore.setState({
      queueIndex: requestedIndex,
      progress: pendingSeek ?? 0,
    });
  }

  if (pendingSeek !== null) {
    await TrackPlayer.seekTo(pendingSeek);
  }

  // Apply play state AFTER the queue is loaded. The separate syncPlayState
  // effect fires on the same render, so without this the native player can get
  // play() on an empty queue and require a second tap.
  if (usePlayerStore.getState().isPlaying) {
    await TrackPlayer.play();
  } else {
    await TrackPlayer.pause();
  }
  suppressNativeTrackEventsUntil = Date.now() + 500;

  const after = usePlayerStore.getState();
  const afterQueueKey = after.queue.map((t) => t.id).join(',');
  if (after.currentTrack?.id !== requestedTrack.id || afterQueueKey !== queueKey) {
    queueSyncPending = true;
  }
}

/**
 * Sync the Zustand player store state to the native TrackPlayer.
 * Call this from a useEffect in the root layout.
 */
export function useSyncPlayerToNative() {
  // This function is designed to be called inside useEffect
  return {
    syncQueue: async () => {
      if (!isInitialized) return;

      if (queueSyncInFlight) {
        queueSyncPending = true;
        return;
      }

      queueSyncInFlight = true;
      isSyncingQueue = true;
      try {
        do {
          queueSyncPending = false;
          await syncLatestQueueToNative();
        } while (queueSyncPending);
      } catch (err) {
        console.error('syncQueue error:', err);
      } finally {
        queueSyncInFlight = false;
        isSyncingQueue = false;
      }
    },

    syncPlayState: async () => {
      if (!isInitialized) return;
      if (isSyncingQueue) return;
      try {
        const { isPlaying } = usePlayerStore.getState();
        if (isPlaying) {
          await TrackPlayer.play();
        } else {
          await TrackPlayer.pause();
        }
      } catch (err) {
        console.error('syncPlayState error:', err);
      }
    },

    syncSeek: async (position: number) => {
      if (!isInitialized) return;
      const next = Math.max(0, position);
      if (isSyncingQueue || queueSyncInFlight) {
        pendingSeekPosition = next;
        return;
      }
      try {
        await TrackPlayer.seekTo(next);
      } catch (err) {
        pendingSeekPosition = next;
        console.error('syncSeek error:', err);
      }
    },

    syncRepeatMode: async () => {
      if (!isInitialized) return;
      try {
        const { repeat } = usePlayerStore.getState();
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
        const { playbackSpeed } = usePlayerStore.getState();
        await TrackPlayer.setRate(playbackSpeed);
      } catch (err) {
        console.error('syncPlaybackSpeed error:', err);
      }
    },
  };
}

// Module-level guard. Repeated calls to setupNativePlayerListeners() — most
// commonly via Fast Refresh remount of the root layout — used to add a fresh
// listener each time, so a single track-change event would fire N times,
// inflate `tracks/:id/play` counts, and write to the store N times.
let _nativeListenersCleanup: (() => void) | null = null;

/**
 * Listen to native TrackPlayer events and sync state back to Zustand.
 * Call this from a useEffect in the root layout. Idempotent: subsequent
 * calls return the existing cleanup without re-registering.
 */
export function setupNativePlayerListeners() {
  if (_nativeListenersCleanup) {
    // Already wired up — reuse the existing cleanup so the caller's effect
    // can still tear down on unmount without re-registering listeners.
    return _nativeListenersCleanup;
  }

  const store = usePlayerStore;

  // When the native player changes track (e.g. queue end, skip)
  const trackChangeSub = TrackPlayer.addEventListener(
    Event.PlaybackActiveTrackChanged,
    async (event) => {
      if (isSyncingQueue) return;
      if (event.track) {
        const queue = store.getState().queue;
        const match = queue.find((t) => t.id === event.track?.id);
        if (
          match &&
          Date.now() < suppressNativeTrackEventsUntil &&
          match.id !== store.getState().currentTrack?.id
        ) {
          return;
        }
        if (match && match.id !== store.getState().currentTrack?.id) {
          store.setState({
            currentTrack: match,
            queueIndex: queue.indexOf(match),
            progress: 0,
          });
          playRecordedForTrackId = null;
        }
      }
    },
  );

  // Native playback state
  const playbackSub = TrackPlayer.addEventListener(
    Event.PlaybackState,
    (event) => {
      // Ignore transient Paused/Playing events emitted during reset/add/skip;
      // syncQueue applies the user's desired play state at the end of its run.
      if (isSyncingQueue) return;
      const state = event.state;
      if (state === State.Playing) {
        store.setState({ isPlaying: true });
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

      const currentTrack = store.getState().currentTrack;
      if (!currentTrack || playRecordedForTrackId === currentTrack.id) return;

      const completionThreshold = event.duration > 0
        ? Math.max(1, Math.min(30, event.duration - 1))
        : 30;
      if (event.position >= completionThreshold) {
        playRecordedForTrackId = currentTrack.id;
        const completed = event.duration > 0 && event.position >= event.duration - 1;
        const api = getApi();
        void api.post(`/tracks/${currentTrack.id}/play`, {
          durationPlayed: Math.floor(event.position),
          completed,
        }).catch(() => {
          // silent fail
        });
      }
    },
  );

  const cleanup = () => {
    trackChangeSub.remove();
    playbackSub.remove();
    progressSub.remove();
    _nativeListenersCleanup = null;
  };
  _nativeListenersCleanup = cleanup;
  return cleanup;
}

// Re-export hooks for convenience
export { usePlaybackState, useProgress, useActiveTrack };
