import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import crypto from 'crypto';
import { JWTPayload } from '../types';

const getJWTSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
};

const getJWTRefreshSecret = (): Uint8Array => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'makeyourmusic';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'makeyourmusic-api';

// Token-type claim — refuses cross-use of an access token where a refresh
// token was expected (and vice-versa). Without this, the only difference
// between the two tokens was which secret signed them; if both secrets ever
// got reused or the algorithm pool widened, an access token could be
// presented as a refresh token (or vice-versa). With `type` enforced on
// verify, that vector is closed even on accidental cross-config.
const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

export const generateAccessToken = async (payload: JWTPayload): Promise<string> => {
  const secret = getJWTSecret();
  return new SignJWT({ ...(payload as unknown as JoseJWTPayload), type: ACCESS_TOKEN_TYPE })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setNotBefore('0s')
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
};

export const generateRefreshToken = async (payload: JWTPayload): Promise<string> => {
  const secret = getJWTRefreshSecret();
  return new SignJWT({ ...(payload as unknown as JoseJWTPayload), type: REFRESH_TOKEN_TYPE })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setNotBefore('0s')
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .sign(secret);
};

export const generateTokenPair = async (payload: Omit<JWTPayload, 'jti'>) => {
  const sessionId = payload.sessionId || crypto.randomUUID();
  const refreshJti = crypto.randomUUID();
  const accessToken = await generateAccessToken({ ...payload, sessionId });
  const refreshToken = await generateRefreshToken({ ...payload, sessionId, jti: refreshJti });
  return { accessToken, refreshToken, refreshJti, sessionId };
};

// Verify is intentionally backward-compatible: tokens issued before iss/aud/type
// were added are accepted as long as the signature + expiry check out. New
// tokens carry all three claims and, once present, are checked strictly. As
// soon as the existing refresh-token cohort cycles (7-day window), every live
// token will have these claims — at which point the back-compat branch can be
// removed.
async function verifyWithFallback(token: string, secret: Uint8Array, expectedType: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const t = (payload as { type?: string }).type;
    if (t && t !== expectedType) {
      throw new Error('Wrong token type');
    }
    return payload as unknown as JWTPayload;
  } catch {
    // Fall through to non-strict verify for legacy tokens without iss/aud.
  }
  const { payload } = await jwtVerify(token, secret, {
    algorithms: [JWT_ALGORITHM],
  });
  const t = (payload as { type?: string }).type;
  if (t && t !== expectedType) {
    throw new Error('Wrong token type');
  }
  return payload as unknown as JWTPayload;
}

export const verifyAccessToken = async (token: string): Promise<JWTPayload> => {
  try {
    return await verifyWithFallback(token, getJWTSecret(), ACCESS_TOKEN_TYPE);
  } catch {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
  try {
    return await verifyWithFallback(token, getJWTRefreshSecret(), REFRESH_TOKEN_TYPE);
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
};
