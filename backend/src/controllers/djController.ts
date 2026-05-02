// Real-time AI improv DJ mode.
//
// A DjSession is a continuous, host-driven AI mix:
//   1. Host starts the session with a "vibe" prompt.
//   2. Server creates the first MusicGeneration (slot 0) and kicks off the
//      worker. As soon as the gen completes the host's <audio> can play it.
//   3. While slot 0 is playing, server pre-generates slot 1 ("buffered next").
//      The Socket.IO `/dj` namespace broadcasts `dj:next` when slot 1 is ready
//      so members can pre-buffer.
//   4. When the host advances (their player flips to the next slot), the
//      server promotes nextTrackId → currentTrackId and kicks off the
//      generation for the slot AFTER that (sliding window of two ready slots).
//   5. Mid-session the host can change the vibe; the next pending generation
//      reads the latest currentVibe.
//
// The Socket.IO layer (realtime.ts) handles the live event fan-out; this
// controller owns CRUD + chained generation kick-off.

import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { processMusicGeneration } from './aiGenerationController';
import { assertCanGenerate } from '../utils/aiUsage';

// Same alphabet as ListeningParty for visual consistency.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateCode(len = 6): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return out;
}

const MAX_VIBE_LEN = 500;
const DJ_TRACK_DURATION_SEC = 90; // generations are ~90s; host crossfades into the next.

// Build the music-generation prompt seed from the vibe text. We bias toward
// instrumental for DJ mode — vocals across rapid transitions feel jarring;
// the user can opt out per-session if they want vocals.
function buildPromptForVibe(vibe: string): string {
  return `DJ mix segment: ${vibe.trim().slice(0, MAX_VIBE_LEN)}. Smooth intro and outro for crossfading; club-ready energy.`;
}

// Create the next-slot generation row + kick off the worker. Returns the
// MusicGeneration id so the caller can wire the DjSessionTrack record.
async function kickOffSlot(params: {
  userId: string;
  vibe: string;
  durationSec?: number;
}): Promise<string> {
  const gen = await prisma.musicGeneration.create({
    data: {
      userId: params.userId,
      prompt: buildPromptForVibe(params.vibe),
      durationSec: params.durationSec ?? DJ_TRACK_DURATION_SEC,
      isInstrumental: true,
      provider: 'minimax',
      status: 'PENDING',
    },
    select: { id: true },
  });
  // Run the worker in the background. Errors land on the row's status/errorMessage,
  // so we don't need to await or surface them here.
  void processMusicGeneration(gen.id).catch((err) => {
    logger.warn('djController: processMusicGeneration crashed', {
      generationId: gen.id,
      error: (err as Error).message,
    });
  });
  return gen.id;
}

async function createSessionWithUniqueCode(hostUserId: string): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const session = await prisma.djSession.create({
        data: { code, hostUserId },
        select: { id: true, code: true },
      });
      return session;
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') continue;
      throw err;
    }
  }
  throw new Error('Failed to allocate DJ session code');
}

// POST /api/dj — start a new session.
export const createSession = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { vibe } = req.body || {};
    const trimmedVibe = typeof vibe === 'string' ? vibe.trim().slice(0, MAX_VIBE_LEN) : '';
    if (!trimmedVibe) {
      res.status(400).json({ error: 'vibe is required (e.g. "deep house, 122bpm, peak time energy")' });
      return;
    }

    // Burn one generation slot up-front; the second one fires when slot 0
    // hits the lookahead window. Use the same daily cap.
    await assertCanGenerate(req.user.userId);

    const session = await createSessionWithUniqueCode(req.user.userId);

    const generationId = await kickOffSlot({ userId: req.user.userId, vibe: trimmedVibe });
    const slot = await prisma.djSessionTrack.create({
      data: {
        sessionId: session.id,
        generationId,
        vibePrompt: trimmedVibe,
        position: 0,
      },
      select: { id: true, position: true },
    });
    await prisma.djSession.update({
      where: { id: session.id },
      data: { currentVibe: trimmedVibe, currentTrackId: slot.id },
    });

    res.status(201).json({ session: { id: session.id, code: session.code }, slotId: slot.id });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      res.status(429).json({
        error: (error as Error).message,
        usage: (error as { usage?: unknown }).usage,
      });
      return;
    }
    logger.error('createSession (dj) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start DJ session' });
  }
};

// GET /api/dj/:code — snapshot for joiners.
export const getSession = async (req: RequestWithUser, res: Response) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const session = await prisma.djSession.findUnique({
      where: { code },
      include: {
        host: { select: { id: true, username: true, displayName: true, avatar: true } },
        tracks: {
          orderBy: { position: 'asc' },
          take: 12,
        },
      },
    });
    if (!session) {
      res.status(404).json({ error: 'DJ session not found' });
      return;
    }

    // Resolve audioUrl for each track (looking up the MusicGeneration the
    // slot points at) so the client can immediately start playing slot 0
    // when its generation has completed.
    const generationIds = session.tracks
      .map((t) => t.generationId)
      .filter((id): id is string => !!id);
    const generations = generationIds.length
      ? await prisma.musicGeneration.findMany({
          where: { id: { in: generationIds } },
          select: { id: true, status: true, audioUrl: true, durationSec: true },
        })
      : [];
    const genById = new Map(generations.map((g) => [g.id, g]));
    const tracks = session.tracks.map((t) => ({
      id: t.id,
      position: t.position,
      vibePrompt: t.vibePrompt,
      generationId: t.generationId,
      generation: t.generationId ? genById.get(t.generationId) || null : null,
    }));

    res.json({
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        currentVibe: session.currentVibe,
        currentTrackId: session.currentTrackId,
        nextTrackId: session.nextTrackId,
        startedAt: session.startedAt,
        host: session.host,
        tracks,
      },
    });
  } catch (error) {
    logger.error('getSession (dj) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load session' });
  }
};

// POST /api/dj/:code/vibe — host updates the live vibe. Affects the NEXT
// pending slot, not the currently-playing one.
export const updateVibe = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const code = String(req.params.code || '').toUpperCase();
    const { vibe } = req.body || {};
    const trimmedVibe = typeof vibe === 'string' ? vibe.trim().slice(0, MAX_VIBE_LEN) : '';
    if (!trimmedVibe) {
      res.status(400).json({ error: 'vibe is required' });
      return;
    }
    const session = await prisma.djSession.findUnique({
      where: { code },
      select: { id: true, hostUserId: true, status: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.hostUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the host can change the vibe' });
      return;
    }
    if (session.status === 'ENDED') {
      res.status(409).json({ error: 'Session has ended' });
      return;
    }
    await prisma.djSession.update({
      where: { id: session.id },
      data: { currentVibe: trimmedVibe, lastTickAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('updateVibe (dj) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update vibe' });
  }
};

// POST /api/dj/:code/advance — host signals "I just moved to the next slot."
// We promote nextTrackId → currentTrackId and kick off generation for the
// slot AFTER that. Idempotent: if the host calls this twice for the same
// position we bail.
export const advance = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const code = String(req.params.code || '').toUpperCase();
    const session = await prisma.djSession.findUnique({
      where: { code },
      include: {
        tracks: { orderBy: { position: 'desc' }, take: 1 },
      },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.hostUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the host can advance' });
      return;
    }
    if (session.status === 'ENDED') {
      res.status(409).json({ error: 'Session has ended' });
      return;
    }

    const lastSlot = session.tracks[0];
    const lastPosition = lastSlot?.position ?? -1;
    const vibeForNext = session.currentVibe || lastSlot?.vibePrompt || 'club-ready instrumental';

    // Daily-quota gate per slot creation.
    try {
      await assertCanGenerate(session.hostUserId);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 429) {
        // Cap reached: end the session gracefully rather than silently failing.
        await prisma.djSession.update({
          where: { id: session.id },
          data: { status: 'ENDED', endedAt: new Date() },
        });
        res.status(429).json({ error: 'Daily AI generation cap reached — session ended.' });
        return;
      }
      throw err;
    }

    const generationId = await kickOffSlot({ userId: session.hostUserId, vibe: vibeForNext });
    const newSlot = await prisma.djSessionTrack.create({
      data: {
        sessionId: session.id,
        generationId,
        vibePrompt: vibeForNext,
        position: lastPosition + 1,
      },
      select: { id: true, position: true },
    });

    // currentTrackId moves to the slot the host just advanced TO (which was
    // formerly nextTrackId). nextTrackId becomes the new slot.
    await prisma.djSession.update({
      where: { id: session.id },
      data: {
        currentTrackId: session.nextTrackId || newSlot.id,
        nextTrackId: newSlot.id,
        lastTickAt: new Date(),
      },
    });

    res.json({ slotId: newSlot.id, position: newSlot.position });
  } catch (error) {
    logger.error('advance (dj) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to advance session' });
  }
};

// POST /api/dj/:code/end — host ends the session.
export const endSession = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const code = String(req.params.code || '').toUpperCase();
    const session = await prisma.djSession.findUnique({
      where: { code },
      select: { id: true, hostUserId: true, status: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.hostUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the host can end this session' });
      return;
    }
    if (session.status !== 'ENDED') {
      await prisma.djSession.update({
        where: { id: session.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }
    res.json({ ok: true });
  } catch (error) {
    logger.error('endSession (dj) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to end session' });
  }
};

// GET /api/dj/mine — list the user's active sessions.
export const listMySessions = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const sessions = await prisma.djSession.findMany({
      where: { hostUserId: req.user.userId, status: { in: ['LIVE', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
      select: { id: true, code: true, status: true, startedAt: true, currentVibe: true },
    });
    res.json({ sessions });
  } catch (error) {
    logger.error('listMySessions (dj) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list sessions' });
  }
};
