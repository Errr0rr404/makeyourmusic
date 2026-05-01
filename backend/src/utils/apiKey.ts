import crypto from 'crypto';

// API keys are hashed at rest. The raw key is shown to the user once at
// creation and never persisted; we lookup-by-hash on each authenticated
// request. Prefix is the first 8 chars of the raw key, kept in plain so
// the dashboard can show a non-secret reminder of which key is which.
//
// Hash uses HMAC-SHA-256 with API_KEY_HMAC_SECRET so that a leaked DB doesn't
// enable raw-key→hash lookups via rainbow tables. Falls back to ENCRYPTION_KEY
// (which already exists in production) when API_KEY_HMAC_SECRET is unset.

const PREFIX = 'mym_'; // visible prefix to distinguish music4ai keys

function getHmacSecret(): string {
  const secret =
    process.env.API_KEY_HMAC_SECRET ||
    process.env.ENCRYPTION_KEY ||
    (process.env.NODE_ENV !== 'production' ? 'dev-api-key-hmac-not-for-prod' : '');
  if (!secret) {
    throw new Error('API_KEY_HMAC_SECRET (or ENCRYPTION_KEY) is required in production');
  }
  return secret;
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(28).toString('base64url');
  const raw = `${PREFIX}${random}`;
  const prefix = raw.slice(0, 12); // mym_ + 8 chars
  const hash = hashApiKey(raw);
  return { raw, prefix, hash };
}

export function hashApiKey(raw: string): string {
  return crypto.createHmac('sha256', getHmacSecret()).update(raw).digest('hex');
}
