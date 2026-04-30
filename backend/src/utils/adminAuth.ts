import { SignJWT, jwtVerify } from 'jose';
import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { RequestWithUser } from '../types';

// A separate password gate on top of the existing admin role check. Verifying
// the password yields a short-lived signed token kept in the browser; every
// /api/admin/* request must carry it. This is intentionally orthogonal to the
// user JWT — it's a "are you sitting at the admin terminal" check, not "are
// you logged in as an admin user". Only the latter alone is too easy to leak
// via stolen cookies / a forgotten admin account.

const ADMIN_TOKEN_TTL = '12h';
const ADMIN_TOKEN_HEADER = 'x-admin-token';

const adminSecret = (): Uint8Array => {
  const seed =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'music4ai-admin-fallback-please-set-ADMIN_SESSION_SECRET';
  // Pad/derive to 32 bytes so HS256 always has enough entropy even with short envs.
  return crypto.createHash('sha256').update(seed).digest();
};

const constantTimeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

let warnedMissing = false;

export const verifyAdminPassword = (input: string): boolean => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 6) {
    // Refuse all logins when no password is configured. Forces the operator
    // to set ADMIN_PASSWORD before the panel becomes reachable. Log once so
    // the misconfiguration is visible in the logs without spamming.
    if (!warnedMissing) {
      // eslint-disable-next-line no-console
      console.warn(
        '[admin] ADMIN_PASSWORD not set (or shorter than 6 chars). Admin panel login is disabled until you set it.'
      );
      warnedMissing = true;
    }
    return false;
  }
  if (typeof input !== 'string' || input.length === 0) return false;
  return constantTimeEqual(input, expected);
};

export const issueAdminToken = async (): Promise<string> => {
  const secret = adminSecret();
  return new SignJWT({ scope: 'admin-panel' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_TTL)
    .sign(secret);
};

const verifyAdminToken = async (token: string): Promise<boolean> => {
  try {
    const { payload } = await jwtVerify(token, adminSecret(), {
      algorithms: ['HS256'],
    });
    return payload.scope === 'admin-panel';
  } catch {
    return false;
  }
};

export const requireAdminPanelToken = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Allow the password-verify endpoint itself through unconditionally — it's
  // the only way to acquire a token in the first place.
  if (req.path === '/auth/verify') return next();

  const raw = req.header(ADMIN_TOKEN_HEADER);
  if (!raw || typeof raw !== 'string') {
    res.status(401).json({ error: 'Admin panel password required', code: 'ADMIN_PANEL_LOCKED' });
    return;
  }
  const ok = await verifyAdminToken(raw);
  if (!ok) {
    res.status(401).json({ error: 'Admin panel session expired', code: 'ADMIN_PANEL_LOCKED' });
    return;
  }
  next();
};

export const ADMIN_TOKEN_HEADER_NAME = ADMIN_TOKEN_HEADER;
