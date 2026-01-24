import 'server-only';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  return secret;
};

const getJWTRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
  }
  return secret;
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

export const generateAccessToken = (payload: JWTPayload): string => {
  const secret = getJWTSecret();
  return jwt.sign(payload, secret, {
    expiresIn: JWT_EXPIRES_IN as string,
    algorithm: JWT_ALGORITHM,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret = getJWTRefreshSecret();
  return jwt.sign(payload, secret, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string,
    algorithm: JWT_ALGORITHM,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const secret = getJWTSecret();
    return jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const secret = getJWTRefreshSecret();
    return jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
