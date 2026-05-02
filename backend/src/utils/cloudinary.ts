import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import crypto from 'crypto';
import logger from './logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Boot-time warning when Cloudinary is missing in production. We don't throw
// to avoid taking the API down at boot when the operator is briefly without
// creds — but we make the misconfiguration loud in logs. Provider-URL
// fallbacks for audio uploads will produce 404s once the upstream URL
// expires (typically a few hours).
if (
  process.env.NODE_ENV === 'production' &&
  !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
) {
  logger.error(
    '[cloudinary] credentials missing in production — audio/cover uploads will fall back to provider URLs that expire'
  );
}

export interface UploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  resource_type?: string;
}

function checkCredentials(): void {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured');
  }
}

/**
 * Upload a file buffer to Cloudinary
 * Supports image, video, and audio (raw) resource types
 */
export const uploadBuffer = async (
  buffer: Buffer,
  folder: string = 'general',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto',
  filename?: string
): Promise<UploadResult> => {
  checkCredentials();

  const cloudinaryFolder = `makeyourmusic/${folder}`;

  // Collision-safe public_id. With overwrite:false, two same-millisecond
  // uploads with the same filename would otherwise throw — append a short
  // crypto-random suffix to keep them unique without changing semantics
  // when callers pass a stable filename.
  const uniqueId = filename ? `${filename}-${crypto.randomBytes(3).toString('hex')}` : undefined;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        resource_type: resourceType,
        public_id: uniqueId,
        overwrite: false,
      },
      (error: any, result: any) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width || undefined,
            height: result.height || undefined,
            duration: result.duration || undefined,
            format: result.format || undefined,
            resource_type: result.resource_type || undefined,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Upload image from base64 string
 */
export const uploadImageBase64 = async (
  base64String: string,
  folder: string = 'images'
): Promise<UploadResult> => {
  checkCredentials();

  // Hard size cap. Even if a future caller bypasses the 1MB JSON body limit
  // (e.g. by routing through multipart), we refuse to push runaway 50MB
  // images at Cloudinary on every request. base64 length × 0.75 ≈ raw bytes.
  const MAX_RAW_BYTES = 8 * 1024 * 1024;
  const rawByteEstimate = Math.floor(base64String.length * 0.75);
  if (rawByteEstimate > MAX_RAW_BYTES) {
    throw new Error(`Image too large: ${rawByteEstimate} bytes (max ${MAX_RAW_BYTES})`);
  }

  const cloudinaryFolder = `makeyourmusic/${folder}`;

  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: cloudinaryFolder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width || undefined,
      height: result.height || undefined,
    };
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Upload audio file for streaming
 */
export const uploadAudio = async (
  buffer: Buffer,
  filename?: string
): Promise<UploadResult> => {
  return uploadBuffer(buffer, 'audio', 'video', filename);
};

/**
 * Upload video file
 */
export const uploadVideo = async (
  buffer: Buffer,
  filename?: string
): Promise<UploadResult> => {
  return uploadBuffer(buffer, 'videos', 'video', filename);
};

/**
 * Upload cover art image
 */
export const uploadCoverArt = async (
  buffer: Buffer,
  filename?: string
): Promise<UploadResult> => {
  return uploadBuffer(buffer, 'covers', 'image', filename);
};

/**
 * Delete a resource from Cloudinary
 */
export const deleteResource = async (publicId: string, resourceType: string = 'image'): Promise<void> => {
  checkCredentials();

  if (!publicId || typeof publicId !== 'string') {
    throw new Error('Invalid resource identifier');
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error: any) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }
};

/**
 * Extract a Cloudinary public_id from one of its delivery URLs.
 *
 * Cloudinary URL shape:
 *   https://res.cloudinary.com/<cloud>/<resource>/upload/[<transforms>/][v<version>/]<public_id>.<ext>
 *
 * Transform segments contain `_` or `,`; version segments match `v\d+`. We
 * strip both before reading the trailing public_id (which itself can contain
 * slashes — folders are part of the id).
 */
export function publicIdFromCloudinaryUrl(url: string): string {
  if (typeof url !== 'string') return '';
  const idx = url.indexOf('/upload/');
  if (idx < 0) return '';
  const rest = url.slice(idx + '/upload/'.length).split('?')[0] ?? '';
  const segments = rest.split('/');
  // Cloudinary's known transform-prefix set. Use an explicit list so a folder
  // named like `ab_cdef` doesn't get mis-classified as a transform segment.
  // (See https://cloudinary.com/documentation/transformation_reference for the full list.)
  const TRANSFORM_PREFIXES = new Set([
    'a', 'ar', 'b', 'bo', 'c', 'co', 'd', 'dl', 'dn', 'dpr', 'e', 'eo', 'f', 'fl', 'g',
    'h', 'l', 'o', 'p', 'pg', 'q', 'r', 'so', 't', 'u', 'vc', 'w', 'x', 'y', 'z',
  ]);
  function isTransformSegment(seg: string): boolean {
    if (seg.includes(',')) return true; // multi-flag transform always uses commas
    // A transform "atom" looks like `f_auto` / `w_400` / `c_fill` — letters+`_`+value
    const m = /^([a-z]{1,3})_/i.exec(seg);
    if (!m) return false;
    return TRANSFORM_PREFIXES.has(m[1]!.toLowerCase());
  }
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    if (!seg) { i++; continue; }
    if (/^v\d+$/.test(seg)) { i++; break; }
    if (i < segments.length - 1 && isTransformSegment(seg)) {
      i++;
      continue;
    }
    break;
  }
  const idWithExt = segments.slice(i).join('/');
  return idWithExt.replace(/\.[a-z0-9]+$/i, '');
}

export interface ClipMuxOptions {
  /** Public id of the user's raw video upload (resource_type=video). */
  rawVideoPublicId: string;
  /** Public id of the Track audio (uploaded as resource_type=video in this codebase). */
  audioPublicId: string;
  /** Slice of the source video to keep, in milliseconds. */
  trimStartMs: number;
  trimEndMs: number;
  /** Offset into the Track audio at which the overlay should begin, in ms. */
  audioStartMs: number;
  /** When true, burn a small "music4ai" watermark in the corner. */
  watermark?: boolean;
}

/**
 * Build a Cloudinary delivery URL that:
 *   1. Trims the user's video to [trimStartMs..trimEndMs] and mutes its audio.
 *   2. Overlays the chosen Track's audio, starting `audioStartMs` into that
 *      track and lasting exactly the trimmed length.
 *   3. Caps width at 1080 and applies auto-quality / mp4 delivery.
 *
 * The URL is lazy — Cloudinary materializes the derived asset on first hit
 * and CDN-caches it after that. No worker, no temp disk.
 */
export function buildClipUrl(opts: ClipMuxOptions): string {
  checkCredentials();

  const { rawVideoPublicId, audioPublicId, trimStartMs, trimEndMs, audioStartMs, watermark } = opts;

  if (trimEndMs <= trimStartMs) {
    throw new Error('trimEndMs must be greater than trimStartMs');
  }
  const clipDurationMs = trimEndMs - trimStartMs;

  // Cloudinary takes seconds for offsets/durations; allow 3 decimals.
  const fmt = (ms: number) => (ms / 1000).toFixed(3).replace(/\.?0+$/, '');

  const transformation: Record<string, unknown>[] = [
    // 1) Trim the source video and drop its original audio. We mute by
    //    setting audio_codec=none rather than relying on the overlay to
    //    "replace" — Cloudinary still passes through original audio with
    //    overlays unless this is set.
    {
      start_offset: fmt(trimStartMs),
      end_offset: fmt(trimEndMs),
      audio_codec: 'none',
    },
    // 2) Overlay the Track audio, sliced to the same window. Audio uploaded
    //    via this codebase lives in resource_type=video, so the overlay
    //    spec uses `video:` prefix (Cloudinary will use the audio stream).
    //    The nested transformation slices the audio source itself — without
    //    it, only the layer placement (start_offset on the layer) shifts in
    //    the timeline, not which part of the audio plays.
    {
      overlay: {
        resource_type: 'video',
        public_id: audioPublicId,
        transformation: [
          {
            start_offset: fmt(audioStartMs),
            end_offset: fmt(audioStartMs + clipDurationMs),
          },
        ],
      },
    },
    { flags: 'layer_apply' },
  ];

  // 3) Optional watermark — a small text burn-in for free-tier downloads.
  if (watermark) {
    transformation.push({
      overlay: {
        font_family: 'Arial',
        font_size: 28,
        font_weight: 'bold',
        text: 'music4ai',
      },
      color: '#FFFFFF',
      opacity: 70,
      gravity: 'south_east',
      x: 24,
      y: 24,
    });
    transformation.push({ flags: 'layer_apply' });
  }

  // 4) Sizing + delivery
  transformation.push({ width: 1080, crop: 'limit' });
  transformation.push({ quality: 'auto', fetch_format: 'mp4' });

  return cloudinary.url(rawVideoPublicId, {
    resource_type: 'video',
    transformation,
    secure: true,
    sign_url: false,
  });
}

/**
 * Build a download URL for the track audio with an optional outro tag.
 * Free-tier listeners get a 2-second audio outro (the "Made with
 * MakeYourMusic" tag) appended; Premium users get the clean version.
 *
 * The outro must be uploaded to Cloudinary as a video resource (the audio
 * upload convention used elsewhere in this codebase) and its public id set
 * via the `MYM_OUTRO_AUDIO_PUBLIC_ID` env var. When the env var isn't set,
 * the helper returns the clean URL — so missing config is non-breaking.
 */
export function buildAudioDownloadUrl(audioPublicId: string, opts: { withOutro: boolean }): string {
  checkCredentials();
  const outroPublicId = process.env.MYM_OUTRO_AUDIO_PUBLIC_ID;
  if (!opts.withOutro || !outroPublicId) {
    return cloudinary.url(audioPublicId, {
      resource_type: 'video',
      format: 'mp3',
      secure: true,
    });
  }
  // Concat the outro after the source audio. Cloudinary's `splice` flag on
  // an overlay layer appends rather than mixes — so the outro plays after
  // the track ends instead of bleeding into it.
  return cloudinary.url(audioPublicId, {
    resource_type: 'video',
    format: 'mp3',
    secure: true,
    transformation: [
      { audio_codec: 'aac' },
      {
        overlay: {
          resource_type: 'video',
          public_id: outroPublicId,
        },
        flags: 'splice',
      },
      { flags: 'layer_apply' },
    ],
  });
}

/**
 * Build a thumbnail URL for a clip — single frame from the trimmed window,
 * centered horizontally, JPEG.
 */
export function buildClipThumbnailUrl(
  rawVideoPublicId: string,
  trimStartMs: number
): string {
  checkCredentials();
  const fmt = (ms: number) => (ms / 1000).toFixed(3).replace(/\.?0+$/, '');
  return cloudinary.url(rawVideoPublicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { start_offset: fmt(trimStartMs) },
      { width: 720, crop: 'limit' },
      { quality: 'auto' },
    ],
    secure: true,
  });
}

export default cloudinary;
