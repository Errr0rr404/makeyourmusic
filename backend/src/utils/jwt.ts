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

export const generateAccessToken = async (payload: JWTPayload): Promise<string> => {
  const secret = getJWTSecret();
  return new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
};

export const generateRefreshToken = async (payload: JWTPayload): Promise<string> => {
  const secret = getJWTRefreshSecret();
  return new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
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

export const verifyAccessToken = async (token: string): Promise<JWTPayload> => {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });
    return payload as unknown as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
  try {
    const secret = getJWTRefreshSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });
    return payload as unknown as JWTPayload;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
};
