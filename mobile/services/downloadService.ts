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

  // Download using fetch + file write
  const response = await fetch(track.audioUrl);
  if (!response.ok) throw new Error('Download failed');

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();

  // Write to file using the new API
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
    // file might not exist
  }

  const existing = await getDownloadedTracks();
  const updated = existing.filter((t) => t.id !== trackId);
  await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(updated));
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
}
