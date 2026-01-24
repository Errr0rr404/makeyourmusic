import crypto from 'crypto';

interface StoredRefreshToken {
  userId: string;
  sessionId: string;
  refreshJti: string;
  expiresAt: number;
  userAgent?: string;
  ip?: string;
  revoked: boolean;
}

// In-memory store; replace with Redis/DB in production deployments.
const refreshTokenStore = new Map<string, StoredRefreshToken>();

export const persistRefreshToken = (
  refreshJti: string,
  data: Omit<StoredRefreshToken, 'refreshJti' | 'revoked'>
) => {
  refreshTokenStore.set(refreshJti, {
    ...data,
    refreshJti,
    revoked: false,
  });
};

export const isRefreshTokenValid = (refreshJti: string, userId: string) => {
  const token = refreshTokenStore.get(refreshJti);
  if (!token) return false;
  if (token.revoked) return false;
  if (token.userId !== userId) return false;
  if (Date.now() > token.expiresAt) return false;
  return true;
};

export const revokeRefreshToken = (refreshJti: string) => {
  const token = refreshTokenStore.get(refreshJti);
  if (token) {
    token.revoked = true;
    refreshTokenStore.set(refreshJti, token);
  }
};

export const rotateRefreshToken = (
  oldJti: string,
  newJti: string,
  data: Omit<StoredRefreshToken, 'refreshJti' | 'revoked'>
) => {
  revokeRefreshToken(oldJti);
  persistRefreshToken(newJti, data);
};

export const purgeExpiredRefreshTokens = () => {
  const now = Date.now();
  for (const [key, token] of refreshTokenStore.entries()) {
    if (token.expiresAt <= now) {
      refreshTokenStore.delete(key);
    }
  }
};

// Opportunistic cleanup
setInterval(purgeExpiredRefreshTokens, 30 * 60 * 1000).unref?.();

export const generateTokenFingerprint = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
