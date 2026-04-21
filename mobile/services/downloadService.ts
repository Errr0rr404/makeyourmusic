import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrackItem } from '@morlo/shared';

const DOWNLOADS_DIR_NAME = 'morlo-downloads';
const DOWNLOADS_META_KEY = 'morlo_downloads';

export interface DownloadedTrack extends TrackItem {
  localAudioUri: string;
  downloadedAt: string;
  fileSize: number;
}

// In-memory cache of trackId → localAudioUri so that sync-style callers
// (e.g. the audioService that converts tracks to native format) can resolve
// offline URIs without an async AsyncStorage roundtrip per track.
const localUriCache = new Map<string, string>();
let cacheHydrated = false;

export async function hydrateDownloadCache(): Promise<void> {
  try {
    const all = await getDownloadedTracks();
    localUriCache.clear();
    for (const t of all) {
      localUriCache.set(t.id, t.localAudioUri);
    }
  } finally {
    cacheHydrated = true;
  }
}

/** Synchronously look up a downloaded track's local file URI. */
export function getLocalUri(trackId: string): string | null {
  return localUriCache.get(trackId) || null;
}

export function isCacheHydrated(): boolean {
  return cacheHydrated;
}

/**
 * Get the downloads directory, creating it if needed.
 */
function getDownloadsDir(): Directory {
  const dir = new Directory(Paths.document, DOWNLOADS_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/**
 * Get all downloaded tracks metadata.
 */
export async function getDownloadedTracks(): Promise<DownloadedTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Check if a track is already downloaded.
 */
export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  // Fast path: if cache is hydrated, no need to touch AsyncStorage
  if (cacheHydrated) return localUriCache.has(trackId);
  const tracks = await getDownloadedTracks();
  return tracks.some((t) => t.id === trackId);
}

/**
 * Download a track for offline playback.
 */
export async function downloadTrack(
  track: TrackItem,
  onProgress?: (progress: number) => void,
): Promise<DownloadedTrack> {
  const dir = getDownloadsDir();
  const filename = `${track.id}.mp3`;
  const file = new File(dir, filename);

  // Delete any stale file before writing (File.write only creates fresh)
  if (file.exists) {
    try { file.delete(); } catch { /* non-fatal */ }
  }
  file.create();

  // Download via fetch → arrayBuffer → write. For very large files this
  // could be improved with createDownloadResumable, but works for typical songs.
  const response = await fetch(track.audioUrl);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  const buffer = await response.arrayBuffer();
  file.write(new Uint8Array(buffer));

  const downloadedTrack: DownloadedTrack = {
    ...track,
    localAudioUri: file.uri,
    downloadedAt: new Date().toISOString(),
    fileSize: buffer.byteLength,
  };

  // Persist metadata
  const existing = await getDownloadedTracks();
  const updated = [...existing.filter((t) => t.id !== track.id), downloadedTrack];
  await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(updated));

  // Update the in-memory cache so playback can immediately use the offline URI
  localUriCache.set(track.id, downloadedTrack.localAudioUri);

  onProgress?.(1);
  return downloadedTrack;
}

/**
 * Remove a downloaded track.
 */
export async function removeDownload(trackId: string): Promise<void> {
  const dir = getDownloadsDir();
  const file = new File(dir, `${trackId}.mp3`);

  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // File might be missing or permission issue — the metadata cleanup below
    // is the source of truth; ignore here.
  }

  const existing = await getDownloadedTracks();
  const updated = existing.filter((t) => t.id !== trackId);
  await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(updated));
  localUriCache.delete(trackId);
}

/**
 * Get total download size in bytes.
 */
export async function getDownloadSize(): Promise<number> {
  const tracks = await getDownloadedTracks();
  return tracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);
}

/**
 * Clear all downloads.
 */
export async function clearAllDownloads(): Promise<void> {
  const dir = getDownloadsDir();
  try {
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // ignore
  }
  await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify([]));
  localUriCache.clear();
}
