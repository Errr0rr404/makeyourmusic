import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// 6-char base32 (Crockford) party code. Avoids ambiguous characters
// (0/O, 1/I/L) so users can read codes off a screen.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateCode(len = 6): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  }
  return out;
}

// Tries up to N times to insert with a unique code; backstop in case of an
// extremely unlikely collision. ALPHABET^6 ≈ 887M codes per length-6, so
// realistically the first attempt succeeds.
async function createPartyWithUniqueCode(
  hostUserId: string,
  trackId: string | null
): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const party = await prisma.listeningParty.create({
        data: { code, hostUserId, trackId },
        select: { id: true, code: true },
      });
      return party;
    } catch (err) {
      const msg = (err as { code?: string })?.code;
      // Unique-constraint collision → retry.
      if (msg === 'P2002') continue;
      throw err;
    }
  }
  throw new Error('Failed to allocate party code');
}

// Hashed cookie used as anon-member identifier. We never store the raw cookie.
const GUEST_COOKIE_NAME = 'mym_party_guest';
function getOrSetGuestKey(req: RequestWithUser, res: Response): string {
  const existing = (req as unknown as { cookies?: Record<string, string> }).cookies?.[GUEST_COOKIE_NAME];
  if (typeof existing === 'string' && /^[a-f0-9]{32,64}$/i.test(existing)) {
    return existing;
  }
  const fresh = crypto.randomBytes(16).toString('hex');
  // 30-day cookie. Not httpOnly so the frontend can also read & pass it
  // back via socket.handshake.auth.guestKey (it carries no auth weight on its own).
  res.cookie(GUEST_COOKIE_NAME, fresh, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return fresh;
}

// POST /api/parties — host creates a new party.
export const createParty = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { trackId } = req.body || {};
    let resolvedTrackId: string | null = null;
    if (typeof trackId === 'string' && trackId.length > 0) {
      const track = await prisma.track.findUnique({
        where: { id: trackId },
        select: { id: true, isPublic: true, status: true, agent: { select: { ownerId: true } } },
      });
      if (!track) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
      const ownerOk = track.agent?.ownerId === req.user.userId;
      if ((!track.isPublic || track.status !== 'ACTIVE') && !ownerOk) {
        res.status(403).json({ error: 'Cannot start a party on this track' });
        return;
      }
      resolvedTrackId = track.id;
    }

    const party = await createPartyWithUniqueCode(req.user.userId, resolvedTrackId);
    logger.info('Party created', { partyId: party.id, code: party.code, hostUserId: req.user.userId });
    res.status(201).json({ party });
  } catch (error) {
    logger.error('createParty error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create party' });
  }
};

// GET /api/parties/:code — snapshot for joiners.
export const getParty = async (req: RequestWithUser, res: Response) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const party = await prisma.listeningParty.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        positionMs: true,
        isPlaying: true,
        startedAt: true,
        hostUserId: true,
        host: { select: { id: true, username: true, displayName: true, avatar: true } },
        track: {
          select: {
            id: true,
            slug: true,
            title: true,
            audioUrl: true,
            coverArt: true,
            duration: true,
            agent: { select: { id: true, name: true, slug: true } },
          },
        },
        members: {
          where: { leftAt: null },
          select: {
            id: true,
            joinedAt: true,
            user: { select: { id: true, username: true, displayName: true, avatar: true } },
          },
        },
      },
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    res.json({ party });
  } catch (error) {
    logger.error('getParty error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load party' });
  }
};

// POST /api/parties/:code/join — record membership; returns the same snapshot.
export const joinParty = async (req: RequestWithUser, res: Response) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const party = await prisma.listeningParty.findUnique({
      where: { code },
      select: { id: true, status: true },
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    if (party.status === 'ENDED') {
      res.status(410).json({ error: 'Party has ended' });
      return;
    }

    let userId: string | null = null;
    let guestKey: string | null = null;
    if (req.user) {
      userId = req.user.userId;
    } else {
      guestKey = getOrSetGuestKey(req, res);
    }

    // Upsert by (party, userId) or (party, guestKey). Prisma can't express "OR"
    // upsert across two unique tuples, so we do find→update→create manually.
    const existing = await prisma.listeningPartyMember.findFirst({
      where: {
        partyId: party.id,
        ...(userId ? { userId } : { guestKey }),
      },
    });
    if (existing) {
      if (existing.leftAt) {
        await prisma.listeningPartyMember.update({
          where: { id: existing.id },
          data: { leftAt: null, joinedAt: new Date() },
        });
      }
    } else {
      try {
        await prisma.listeningPartyMember.create({
          data: { partyId: party.id, userId, guestKey },
        });
      } catch (err) {
        // Concurrent join with the same identity — already counted; ignore.
        if ((err as { code?: string }).code !== 'P2002') throw err;
      }
    }

    res.json({ partyId: party.id, code, guestKey });
  } catch (error) {
    logger.error('joinParty error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to join party' });
  }
};

// POST /api/parties/:code/leave
export const leaveParty = async (req: RequestWithUser, res: Response) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const party = await prisma.listeningParty.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    let userId: string | null = null;
    let guestKey: string | null = null;
    if (req.user) {
      userId = req.user.userId;
    } else {
      guestKey = (req as unknown as { cookies?: Record<string, string> }).cookies?.[GUEST_COOKIE_NAME] || null;
    }
    await prisma.listeningPartyMember.updateMany({
      where: {
        partyId: party.id,
        leftAt: null,
        ...(userId ? { userId } : guestKey ? { guestKey } : { id: '_no_match_' }),
      },
      data: { leftAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('leaveParty error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to leave party' });
  }
};

// POST /api/parties/:code/end — host only.
export const endParty = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const code = String(req.params.code || '').toUpperCase();
    const party = await prisma.listeningParty.findUnique({
      where: { code },
      select: { id: true, hostUserId: true, status: true },
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    if (party.hostUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the host can end this party' });
      return;
    }
    if (party.status === 'ENDED') {
      res.json({ ok: true });
      return;
    }
    await prisma.listeningParty.update({
      where: { id: party.id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
    // Disconnect any live sockets so members don't keep ticking on a dead party.
    try {
      const { broadcastPartyEnded } = await import('../realtime');
      broadcastPartyEnded(party.id);
    } catch {
      // realtime module may not be attached in unit tests
    }
    res.json({ ok: true });
  } catch (error) {
    logger.error('endParty error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to end party' });
  }
};

// GET /api/parties/mine — list parties the user is currently hosting.
export const listMyParties = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const parties = await prisma.listeningParty.findMany({
      where: { hostUserId: req.user.userId, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        code: true,
        startedAt: true,
        track: { select: { id: true, title: true, slug: true, coverArt: true } },
      },
    });
    res.json({ parties });
  } catch (error) {
    logger.error('listMyParties error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list parties' });
  }
};
