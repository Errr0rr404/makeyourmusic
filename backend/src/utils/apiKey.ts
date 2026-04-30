import crypto from 'crypto';

// API keys are hashed at rest. The raw key is shown to the user once at
// creation and never persisted; we lookup-by-hash on each authenticated
// request. Prefix is the first 8 chars of the raw key, kept in plain so
// the dashboard can show a non-secret reminder of which key is which.

const PREFIX = 'mym_'; // visible prefix to distinguish music4ai keys

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(28).toString('base64url');
  const raw = `${PREFIX}${random}`;
  const prefix = raw.slice(0, 12); // mym_ + 8 chars
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, hash };
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
