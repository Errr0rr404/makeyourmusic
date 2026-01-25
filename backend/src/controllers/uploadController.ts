import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler';
import { uploadImageBuffer } from '../utils/cloudinary';
import { validateFileSignature, sanitizeFilename, sanitizeFolder, validateExtensionMatchesMime } from '../utils/fileValidator';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File filter - only allow images with proper validation
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type
  if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return cb(new AppError('Only JPEG, PNG, GIF, and WebP images are allowed', 400));
  }
  
  // Check file extension matches MIME type
  if (!validateExtensionMatchesMime(file.originalname, file.mimetype)) {
    return cb(new AppError('File extension does not match file type', 400));
  }
  
  cb(null, true);
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

/**
 * Upload image to Cloudinary
 * POST /api/upload/image
 */
export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Validate file signature matches declared MIME type (prevents MIME type spoofing)
    if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
      throw new AppError('Invalid file type: file signature does not match declared type', 400);
    }

    // Sanitize folder path to prevent path traversal
    const folder = sanitizeFolder(req.body.folder as string);

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(req.file.originalname);

    // Upload to Cloudinary
    const result = await uploadImageBuffer(req.file.buffer, folder, sanitizedFilename);

    res.status(200).json({
      success: true,
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Upload multiple images to Cloudinary
 * POST /api/upload/images
 */
export const uploadImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    // Validate all files before uploading
    const files = req.files as Express.Multer.File[];
    for (const file of files) {
      // Validate file signature matches declared MIME type
      if (!validateFileSignature(file.buffer, file.mimetype)) {
        throw new AppError(`Invalid file type for ${file.originalname}: file signature does not match declared type`, 400);
      }
      
      // Check file extension matches MIME type
      if (!validateExtensionMatchesMime(file.originalname, file.mimetype)) {
        throw new AppError(`File extension does not match file type for ${file.originalname}`, 400);
      }
    }

    // Sanitize folder path to prevent path traversal
    const folder = sanitizeFolder(req.body.folder as string);
    
    const uploadPromises = files.map((file) => {
      const sanitizedFilename = sanitizeFilename(file.originalname);
      return uploadImageBuffer(file.buffer, folder, sanitizedFilename);
    });

    const results = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      images: results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      })),
    });
  } catch (error) {
    return next(error);
  }
};
