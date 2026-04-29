import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        resource_type: resourceType,
        public_id: filename || undefined,
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

export default cloudinary;
