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
  width: number;
  height: number;
}

/**
 * Upload image buffer to Cloudinary
 */
export const uploadImageBuffer = async (
  buffer: Buffer,
  folder: string = 'products',
  filename?: string
): Promise<UploadResult> => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Limit max dimensions
          { quality: 'auto', fetch_format: 'auto' }, // Optimize for web
        ],
        public_id: filename ? `${folder}/${filename}` : undefined,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width || 0,
            height: result.height || 0,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    // Convert buffer to stream
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
  folder: string = 'products'
): Promise<UploadResult> => {
  // Check credentials without revealing which one is missing (prevent information disclosure)
  const hasCredentials = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  
  if (!hasCredentials) {
    throw new Error('Image upload service is not configured');
  }

  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width || 0,
      height: result.height || 0,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Cloudinary upload failed: ${errorMessage}`);
  }
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  // Check credentials without revealing which one is missing (prevent information disclosure)
  const hasCredentials = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  
  if (!hasCredentials) {
    throw new Error('Image upload service is not configured');
  }
  
  // Sanitize publicId to prevent injection attacks
  if (!publicId || typeof publicId !== 'string') {
    throw new Error('Invalid image identifier');
  }
  
  // Remove path traversal attempts
  const sanitizedPublicId = publicId.replace(/[/\\\.\.]/g, '');
  
  try {
    await cloudinary.uploader.destroy(sanitizedPublicId);
  } catch (error: unknown) {
    throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default cloudinary;
