import crypto from 'crypto';
import logger from './logger';

// Encryption key - MUST be set in production
// The key should be 64 hex characters (32 bytes) for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  logger.error('ENCRYPTION_KEY is not set in production! This will cause data decryption failures.');
  throw new Error('ENCRYPTION_KEY environment variable is required in production');
}
// Reject malformed keys early — silently zero-padding a short key was a
// catastrophic security flaw (operators with `ENCRYPTION_KEY=foo` got fake
// 256-bit encryption with effective 24 bits of entropy).
if (ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes) for AES-256');
}
// Fallback for development only - generates a new key each time (data will not persist)
const FALLBACK_KEY = ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
if (!ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') {
  logger.warn('ENCRYPTION_KEY not set - using temporary key. Encrypted data will not persist across restarts.');
}
const ALGORITHM = 'aes-256-gcm';

/**
 * Get 32-byte key from hex string. Throws on malformed input.
 */
function getKey(hexKey: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error('Encryption key is malformed — must be 64 hex chars');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt sensitive user data
 * Uses AES-256-GCM encryption (industry standard)
 *
 * IV is 12 bytes (96 bits) per the AES-GCM spec — that's the size NIST
 * recommends and that maximizes the safe encryption count under one key.
 * Older ciphertext written with 16-byte IVs is still decryptable because
 * decrypt() reads the IV from the encoded prefix, not from a fixed offset.
 */
export function encrypt(text: string): string {
  if (!text) return text;

  try {
    const key = getKey(ENCRYPTION_KEY || FALLBACK_KEY);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Encryption error', { error: errorMessage });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive user data
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  // Fail closed — input that doesn't match the IV:authTag:ciphertext shape is
  // not a valid encrypted payload. Silently echoing it back to callers would
  // leak whatever non-encrypted value happened to be stored (a clear sign of a
  // bug or a downgrade attack); callers must handle the throw.
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Failed to decrypt data: malformed ciphertext');
  }

  try {
    const key = getKey(ENCRYPTION_KEY || FALLBACK_KEY);
    const iv = Buffer.from(parts[0]!, 'hex');
    const authTag = Buffer.from(parts[1]!, 'hex');
    const encrypted = parts[2]!;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Decryption error', { error: errorMessage });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data for search purposes (one-way hash)
 * Used for searching encrypted emails while maintaining privacy.
 * Uses HMAC-SHA-256 keyed by EMAIL_SEARCH_PEPPER so a DB leak doesn't enable
 * targeted enumeration via rainbow tables.
 */
const SEARCH_PEPPER =
  process.env.EMAIL_SEARCH_PEPPER ||
  process.env.ENCRYPTION_KEY ||
  'dev-search-pepper-not-for-prod';
if (
  !process.env.EMAIL_SEARCH_PEPPER &&
  !process.env.ENCRYPTION_KEY &&
  process.env.NODE_ENV === 'production'
) {
  throw new Error('EMAIL_SEARCH_PEPPER (or ENCRYPTION_KEY) is required in production');
}

export function hashForSearch(text: string): string {
  if (!text) return text;
  return crypto
    .createHmac('sha256', SEARCH_PEPPER)
    .update(text.toLowerCase().trim())
    .digest('hex');
}
