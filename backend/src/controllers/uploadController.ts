import { Response } from 'express';
import { RequestWithUser } from '../types';
import { uploadBuffer } from '../utils/cloudinary';
import logger from '../utils/logger';
import multer from 'multer';

// Multer config for memory storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac',
      'video/mp4', 'video/webm', 'video/ogg',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export const handleUpload = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

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
