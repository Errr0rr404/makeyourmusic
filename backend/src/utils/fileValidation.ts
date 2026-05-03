import type { Request } from 'express';

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
]);

export const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

export const GENERAL_UPLOAD_MIME_TYPES = new Set([
  ...AUDIO_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
]);

function hasPrefix(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function hasAscii(buffer: Buffer, value: string, offset = 0): boolean {
  if (buffer.length < offset + value.length) return false;
  return buffer.toString('ascii', offset, offset + value.length) === value;
}

function hasIsoBmffSignature(buffer: Buffer): boolean {
  // MP4/M4A/MOV all use ISO BMFF with an ftyp box at byte offset 4.
  return hasAscii(buffer, 'ftyp', 4);
}

export function hasValidFileSignature(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case 'image/jpeg':
      return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/gif':
      return hasAscii(buffer, 'GIF87a') || hasAscii(buffer, 'GIF89a');
    case 'image/webp':
      return hasAscii(buffer, 'RIFF') && hasAscii(buffer, 'WEBP', 8);
    case 'audio/mpeg':
    case 'audio/mp3':
      return hasAscii(buffer, 'ID3') || (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0);
    case 'audio/wav':
    case 'audio/x-wav':
      return hasAscii(buffer, 'RIFF') && hasAscii(buffer, 'WAVE', 8);
    case 'audio/ogg':
    case 'video/ogg':
      return hasAscii(buffer, 'OggS');
    case 'audio/flac':
      return hasAscii(buffer, 'fLaC');
    case 'audio/aac':
      return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1]! & 0xf0) === 0xf0;
    case 'audio/mp4':
    case 'audio/m4a':
    case 'audio/x-m4a':
    case 'video/mp4':
    case 'video/quicktime':
      return hasIsoBmffSignature(buffer);
    case 'audio/webm':
    case 'video/webm':
      return hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}

export function validateBufferedUpload(
  file: { buffer?: Buffer; mimetype?: string },
  allowedMimeTypes: ReadonlySet<string>,
): string | null {
  const mimetype = file.mimetype || '';
  if (!allowedMimeTypes.has(mimetype)) {
    return 'Unsupported file type';
  }
  if (!file.buffer || file.buffer.length === 0) {
    return 'Uploaded file is empty';
  }
  if (!hasValidFileSignature(file.buffer, mimetype)) {
    return 'File content does not match the declared type';
  }
  return null;
}

export function createMimeFileFilter(allowedMimeTypes: ReadonlySet<string>) {
  return (_req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type'));
  };
}
