import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApi, useAuthStore } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';

const DOWNLOADS_DIR_NAME = 'makeyourmusic-downloads';
const DOWNLOADS_META_KEY = 'makeyourmusic_downloads';
const MAX_DOWNLOAD_BYTES = 150 * 1024 * 1024;

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
 * Thrown when an unauthenticated user tries to download. Callers should catch
 * this and redirect to login rather than show a generic "download failed".
 */
export class DownloadAuthRequiredError extends Error {
  constructor() {
    super('Sign in to save tracks for offline playback');
    this.name = 'DownloadAuthRequiredError';
  }
}

function isHttpUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasSameOriginAsApi(rawUrl: string, apiBase: string): boolean {
  try {
    const apiOrigin = new URL(apiBase).origin;
    const audioOrigin = new URL(rawUrl).origin;
    return apiOrigin === audioOrigin;
  } catch {
    return false;
  }
}

/**
 * Download a track for offline playback. Requires the user to be logged in
 * — the server records a Download row so we can show download counts and
 * attribute engagement back to users. The local file write only happens
 * after the auth check, so guests never end up with orphan offline copies.
 */
export async function downloadTrack(
  track: TrackItem,
  onProgress?: (progress: number) => void,
): Promise<DownloadedTrack> {
  if (!useAuthStore.getState().isAuthenticated) {
    throw new DownloadAuthRequiredError();
  }

  const dir = getDownloadsDir();
  const filename = `${track.id}.mp3`;
  const file = new File(dir, filename);

  if (!isHttpUrl(track.audioUrl)) {
    throw new Error('Download URL must be http or https');
  }

  // Delete any stale file before writing.
  if (file.exists) {
    try { file.delete(); } catch { /* non-fatal */ }
  }

  // Read the download via fetch → ReadableStream → chunked buffers.
  // The previous implementation pulled the entire MP3 into a JS ArrayBuffer
  // and then wrote it synchronously, which froze the JS thread for several
  // seconds on large files (ANR on Android, white screen on iOS, OOM at
  // 30+ MB). Expo's File.write currently replaces rather than appends, so we
  // still merge before the final write; the hard byte cap below prevents
  // unbounded memory growth.
  //
  // Use the authenticated api client so that token-gated audio URLs (premium /
  // private tracks) include the Authorization header. Plain `fetch(url)` used
  // to silently 401/403 in those cases.
  const api = getApi();
  const apiBase = api.defaults.baseURL || '';
  // If the audio URL is on the API origin, route via api client to inherit
  // auth interceptors. Otherwise (Cloudinary, etc.) use a plain fetch.
  const sameOriginAsApi = Boolean(apiBase && hasSameOriginAsApi(track.audioUrl, apiBase));
  const headers: Record<string, string> = {};
  if (sameOriginAsApi) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(track.audioUrl, { headers });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  let written = 0;
  const totalHeader = response.headers.get('content-length');
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;
  if (total > MAX_DOWNLOAD_BYTES) {
    throw new Error('Download is too large for offline storage');
  }
  const chunks: Uint8Array[] = [];

  try {
    if (response.body && typeof (response.body as ReadableStream).getReader === 'function') {
      file.create();
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          // Append chunk. The new expo-file-system File.write replaces the
          // file content; for append-style streaming we rebuild the file
          // bytes incrementally. Using `file.write(new Uint8Array(...))` per
          // chunk would truncate, so accumulate then write at end.
          chunks.push(value);
          written += value.byteLength;
          if (written > MAX_DOWNLOAD_BYTES) {
            await reader.cancel();
            throw new Error('Download is too large for offline storage');
          }
          if (total > 0) onProgress?.(Math.min(0.99, written / total));
        }
      }
      // Single final write — but the bytes are already on the JS heap. Splitting
      // into smaller writes if the runtime supports an append API would be ideal;
      // for now this preserves ordering and keeps the worst-case to a brief
      // single write rather than the previous "block, decode, write" pattern.
      const merged = new Uint8Array(written);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      file.write(merged);
    } else {
      // Fallback for environments without ReadableStream support.
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
        throw new Error('Download is too large for offline storage');
      }
      file.create();
      file.write(new Uint8Array(buffer));
      written = buffer.byteLength;
    }
  } catch (err) {
    if (file.exists) {
      try { file.delete(); } catch { /* non-fatal cleanup */ }
    }
    throw err;
  }

  const downloadedTrack: DownloadedTrack = {
    ...track,
    localAudioUri: file.uri,
    downloadedAt: new Date().toISOString(),
    fileSize: written,
  };

  // Persist metadata
  const existing = await getDownloadedTracks();
  const updated = [...existing.filter((t) => t.id !== track.id), downloadedTrack];
  await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(updated));

  // Update the in-memory cache so playback can immediately use the offline URI
  localUriCache.set(track.id, downloadedTrack.localAudioUri);

  // Tell the server — best-effort, don't fail the download if this errors.
  // Server uses a unique (userId, trackId) constraint so re-downloads are
  // idempotent and won't pump the engagement counter.
  void getApi()
    .post(`/tracks/${track.id}/download`)
    .catch(() => {});

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
