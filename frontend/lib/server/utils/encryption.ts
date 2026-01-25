import crypto from 'crypto';

// Encryption key - MUST be set in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error('ENCRYPTION_KEY is not set in production! This will cause data decryption failures.');
  throw new Error('ENCRYPTION_KEY environment variable is required in production');
}
// Fallback for development only - generates a new key each time (data will not persist)
const FALLBACK_KEY = ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
if (!ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') {
  console.warn('ENCRYPTION_KEY not set - using temporary key. Encrypted data will not persist across restarts.');
}
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive user data
 * Uses AES-256-GCM encryption (industry standard)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const key = Buffer.from((ENCRYPTION_KEY || FALLBACK_KEY).slice(0, 32).padEnd(32, '0'), 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Encryption error', { error: errorMessage });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive user data
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText; // Not encrypted
    
    const encryptionKey = ENCRYPTION_KEY || FALLBACK_KEY;
    const key = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0'), 'hex');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: unknown) {
    console.error('Decryption error', { error: error instanceof Error ? error.message : 'Unknown error' });
    // Return original if decryption fails (backward compatibility)
    return encryptedText;
  }
}

/**
 * Hash sensitive data for search purposes (one-way hash)
 * Used for searching encrypted emails while maintaining privacy
 */
export function hashForSearch(text: string): string {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}
