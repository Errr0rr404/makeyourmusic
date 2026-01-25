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
 * All uploads are stored in the 'kairux' folder
 */
export const uploadImageBuffer = async (
  buffer: Buffer,
  folder: string = 'products',
  filename?: string
): Promise<UploadResult> => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured');
  }

  // Prepend 'kairux' to all folder paths
  const cloudinaryFolder = folder ? `kairux/${folder}` : 'kairux';

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Limit max dimensions
          { quality: 'auto', fetch_format: 'auto' }, // Optimize for web
        ],
        public_id: filename ? `${cloudinaryFolder}/${filename}` : undefined,
        overwrite: false,
      },
      (error: any, result: any) => {
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
 * All uploads are stored in the 'kairux' folder
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

  // Prepend 'kairux' to all folder paths
  const cloudinaryFolder = folder ? `kairux/${folder}` : 'kairux';

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
      width: result.width || 0,
      height: result.height || 0,
    };
  } catch (error: any) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
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
  } catch (error: any) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

export default cloudinary;
