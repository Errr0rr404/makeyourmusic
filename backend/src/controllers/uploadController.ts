import { Response } from 'express';
import { RequestWithUser } from '../types';
import { uploadBuffer } from '../utils/cloudinary';
import logger from '../utils/logger';
import multer from 'multer';
import {
  createMimeFileFilter,
  GENERAL_UPLOAD_MIME_TYPES,
  validateBufferedUpload,
  VIDEO_MIME_TYPES,
} from '../utils/fileValidation';

// Multer config for memory storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
    fields: 20,
    fieldSize: 64 * 1024,
    parts: 25,
  },
  fileFilter: createMimeFileFilter(GENERAL_UPLOAD_MIME_TYPES),
});

// Video uploads — Clips and any future user-uploaded video flow. 200MB
// covers ~60s mobile recordings even at high bitrate.
export const videoUpload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 64 * 1024,
    parts: 15,
  },
  fileFilter: createMimeFileFilter(VIDEO_MIME_TYPES),
});

export const handleVideoUpload = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file provided' }); return; }
    const validationError = validateBufferedUpload(file, VIDEO_MIME_TYPES);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    if (!file.mimetype.startsWith('video/')) {
      res.status(400).json({ error: 'File must be a video' });
      return;
    }
    const result = await uploadBuffer(file.buffer, 'clips/raw', 'video');
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    logger.error('Video upload error', { error: (error as Error).message });
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Per-user daily upload byte quota — caps Cloudinary cost-DoS by a
// single account. Tracked in-memory; fine as a hard ceiling.
const DAILY_UPLOAD_BYTES_CAP = 2 * 1024 * 1024 * 1024; // 2 GB / user / day
const uploadBytesByUser = new Map<string, { day: string; bytes: number }>();
function tryReserveUploadBudget(userId: string, bytes: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const existing = uploadBytesByUser.get(userId);
  if (!existing || existing.day !== day) {
    if (bytes > DAILY_UPLOAD_BYTES_CAP) return false;
    uploadBytesByUser.set(userId, { day, bytes });
    return true;
  }
  if (existing.bytes + bytes > DAILY_UPLOAD_BYTES_CAP) return false;
  existing.bytes += bytes;
  return true;
}

export const handleUpload = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file provided' }); return; }
    const validationError = validateBufferedUpload(file, GENERAL_UPLOAD_MIME_TYPES);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    if (!tryReserveUploadBudget(req.user.userId, file.size || file.buffer?.length || 0)) {
      res.status(429).json({ error: 'Daily upload quota exceeded.' });
      return;
    }

    let folder = 'general';
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';

    if (file.mimetype.startsWith('audio/')) {
      folder = 'audio';
      resourceType = 'video'; // Cloudinary treats audio as video type
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'videos';
      resourceType = 'video';
    } else if (file.mimetype.startsWith('image/')) {
      folder = 'images';
      resourceType = 'image';
    }

    const result = await uploadBuffer(file.buffer, folder, resourceType);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type,
    });
  } catch (error) {
    logger.error('Upload error', { error: (error as Error).message });
    res.status(500).json({ error: 'Upload failed' });
  }
};
