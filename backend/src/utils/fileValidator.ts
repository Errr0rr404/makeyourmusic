/**
 * File signature (magic bytes) validation for common image formats
 * This prevents MIME type spoofing attacks
 */

// File signatures for common image formats
const FILE_SIGNATURES: { [key: string]: Buffer[] } = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46]), Buffer.from([0x57, 0x45, 0x42, 0x50])],
};

/**
 * Validate file signature matches declared MIME type
 * @param buffer File buffer
 * @param mimeType Declared MIME type
 * @returns true if signature matches, false otherwise
 */
export const validateFileSignature = (buffer: Buffer, mimeType: string): boolean => {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const signatures = FILE_SIGNATURES[mimeType.toLowerCase()];
  if (!signatures) {
    return false; // Unknown MIME type
  }

  // Check if file starts with any of the expected signatures
  return signatures.some((signature) => {
    return buffer.subarray(0, signature.length).equals(signature);
  });
};

/**
 * Sanitize filename to prevent path traversal and other attacks
 * @param filename Original filename
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path separators and parent directory references
  let sanitized = filename.replace(/[/\\?%*:|"<>]/g, '');
  
  // Remove leading dots and spaces
  sanitized = sanitized.replace(/^[.\s]+/, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 255);
  
  // If empty after sanitization, use default
  if (!sanitized) {
    sanitized = 'image';
  }
  
  return sanitized;
};

/**
 * Validate and sanitize folder path to prevent path traversal
 * @param folder Folder path
 * @returns Sanitized folder path or 'products' as default
 */
export const sanitizeFolder = (folder: string): string => {
  if (!folder || typeof folder !== 'string') {
    return 'products';
  }

  // Remove path separators and parent directory references
  let sanitized = folder.trim().replace(/[/\\\.\.]/g, '');
  
  // Remove non-alphanumeric characters except hyphens and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 50);
  
  // If empty after sanitization, use default
  if (!sanitized) {
    return 'products';
  }
  
  return sanitized.toLowerCase();
};

/**
 * Validate file extension matches MIME type
 */
const EXTENSION_TO_MIME: { [key: string]: string[] } = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
};

export const validateExtensionMatchesMime = (filename: string, mimeType: string): boolean => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const allowedMimes = EXTENSION_TO_MIME[ext];
  
  if (!allowedMimes) {
    return false; // Unknown extension
  }
  
  return allowedMimes.includes(mimeType.toLowerCase());
};
