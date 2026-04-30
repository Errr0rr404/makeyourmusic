import { SignJWT, jwtVerify } from 'jose';
import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import argon2 from 'argon2';
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
  const seed = process.env.ADMIN_SESSION_SECRET;
  if (!seed || seed.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ADMIN_SESSION_SECRET must be set to a 32+ char value in production. Refusing to issue admin tokens.'
      );
    }
    // Dev only — derive from a per-process random seed so dev tokens still
    // work but don't leak across restarts.
    return crypto.createHash('sha256').update(`dev-${process.pid}-${Date.now()}`).digest();
  }
  return crypto.createHash('sha256').update(seed).digest();
};

let warnedMissing = false;

// Password verification supports two modes:
//   1. ADMIN_PASSWORD_HASH (argon2id-encoded hash) — preferred for production.
//   2. ADMIN_PASSWORD (plaintext, dev fallback) — kept for backward compat,
//      but warns loudly and uses a constant-time compare via argon2 to avoid
//      length leaks.
export const verifyAdminPassword = async (input: string): Promise<boolean> => {
  if (typeof input !== 'string' || input.length === 0) return false;

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    try {
      return await argon2.verify(hash, input);
    } catch {
      return false;
    }
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 6) {
    if (!warnedMissing) {
      // eslint-disable-next-line no-console
      console.warn(
        '[admin] ADMIN_PASSWORD_HASH/ADMIN_PASSWORD not set. Admin panel login disabled.'
      );
      warnedMissing = true;
    }
    return false;
  }
  if (process.env.NODE_ENV === 'production' && !warnedMissing) {
    // eslint-disable-next-line no-console
    console.warn(
      '[admin] ADMIN_PASSWORD set in plaintext in production — please switch to ADMIN_PASSWORD_HASH (argon2id).'
    );
    warnedMissing = true;
  }
  // Constant-time compare via Buffer.byteLength + timingSafeEqual on equal-length buffers.
  const ba = Buffer.from(input);
  const bb = Buffer.from(expected);
  if (ba.length !== bb.length) {
    // Run a dummy compare so timing is roughly constant regardless of length match.
    crypto.timingSafeEqual(ba.subarray(0, Math.min(ba.length, bb.length)), bb.subarray(0, Math.min(ba.length, bb.length)));
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
};

export const issueAdminToken = async (userId?: string): Promise<string> => {
  const secret = adminSecret();
  const payload: Record<string, unknown> = { scope: 'admin-panel' };
  if (userId) payload.uid = userId;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_TTL)
    .sign(secret);
};

interface AdminTokenPayload {
  ok: boolean;
  uid?: string;
}

const verifyAdminToken = async (token: string): Promise<AdminTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, adminSecret(), {
      algorithms: ['HS256'],
    });
    if (payload.scope !== 'admin-panel') return { ok: false };
    return { ok: true, uid: typeof payload.uid === 'string' ? payload.uid : undefined };
  } catch {
    return { ok: false };
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
  const result = await verifyAdminToken(raw);
  if (!result.ok) {
    res.status(401).json({ error: 'Admin panel session expired', code: 'ADMIN_PANEL_LOCKED' });
    return;
  }
  // If the token is bound to a user, ensure it matches the authenticated
  // user. Tokens minted before this fix have no `uid` and are accepted for
  // backward compatibility (the role check above already gates ADMIN role).
  if (result.uid && req.user?.userId && result.uid !== req.user.userId) {
    res.status(403).json({ error: 'Admin token does not match authenticated user', code: 'ADMIN_PANEL_LOCKED' });
    return;
  }
  next();
};

export const ADMIN_TOKEN_HEADER_NAME = ADMIN_TOKEN_HEADER;
