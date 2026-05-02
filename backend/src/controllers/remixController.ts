// Remix loop — kick off a new MusicGeneration seeded from an existing public
// track, with optional creative overrides (mood / genre / energy / era).
//
// The remix appears as a normal generation in the requester's drafts; once
// they publish it via /api/ai/generations/:id/publish, the publish path picks
// up the parentTrackId we set here and (a) carries it onto the new Track for
// analytics lineage, (b) creates a TrackRemix edge, and (c) notifies the
// original creator.
//
// Discovery:
//   GET /api/tracks/:idOrSlug/remixes  — child remixes of a parent track
//   GET /api/remixes/feed              — global recent-remixes feed
//   GET /api/users/:userId/remixes     — a user's own remix history

import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { processMusicGeneration } from './aiGenerationController';
import { assertCanGenerate } from '../utils/aiUsage';
import { sanitizeLyrics } from '../utils/lyricsSanitizer';

const MAX_NOTE_LEN = 280;

// POST /api/tracks/:idOrSlug/remix
// Body: { agentId, prompt?, mood?, genre?, energy?, era?, isInstrumental?, note? }
// Returns: 202 { generation, usage } — same shape as createVariation.
export const createRemix = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const idOrSlug = req.params.idOrSlug as string;
    const source = await prisma.track.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        id: true,
        title: true,
        lyrics: true,
        mood: true,
        bpm: true,
        key: true,
        aiPrompt: true,
        aiModel: true,
        isPublic: true,
        status: true,
        takedownStatus: true,
        agent: { select: { ownerId: true } },
        genre: { select: { id: true, name: true } },
      },
    });
    if (!source) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    // Owners can remix their own private tracks; everyone else needs public + active.
    const isOwner = source.agent?.ownerId === req.user.userId;
    if (!isOwner && (!source.isPublic || source.status !== 'ACTIVE' || source.takedownStatus)) {
      res.status(403).json({ error: 'Track is not remixable' });
      return;
    }

    const usage = await assertCanGenerate(req.user.userId);

    const {
      agentId,
      prompt,
      mood,
      genre,
      energy,
      era,
      isInstrumental,
      note,
    } = req.body || {};

    if (typeof agentId !== 'string' || !agentId) {
      res.status(400).json({ error: 'agentId is required' });
      return;
    }
    const agent = await prisma.aiAgent.findUnique({
      where: { id: agentId },
      select: { id: true, ownerId: true },
    });
    if (!agent || agent.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'You do not own this agent' });
      return;
    }

    const finalNote =
      typeof note === 'string' && note.trim()
        ? note.trim().slice(0, MAX_NOTE_LEN)
        : null;

    // Build the remix prompt — start from the source's prompt + add the
    // user's creative direction. If they supplied a prompt explicitly, use it
    // verbatim; otherwise we suffix the source prompt with the override hints.
    const overrideBits: string[] = [];
    if (mood && typeof mood === 'string') overrideBits.push(`Remix mood: ${mood}`);
    if (genre && typeof genre === 'string') overrideBits.push(`Remix genre: ${genre}`);
    if (energy && typeof energy === 'string') overrideBits.push(`Remix energy: ${energy}`);
    if (era && typeof era === 'string') overrideBits.push(`Remix era: ${era}`);
    if (finalNote) overrideBits.push(`Remix direction: ${finalNote}`);

    const basePrompt = typeof prompt === 'string' && prompt.trim()
      ? prompt.trim()
      : source.aiPrompt || `Remix of "${source.title}"`;
    const finalPrompt =
      overrideBits.length > 0
        ? `${basePrompt}\n${overrideBits.join('\n')}`
        : basePrompt;

    const finalIsInstrumental =
      typeof isInstrumental === 'boolean' ? isInstrumental : false;

    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: agent.id,
        title: `${source.title} (remix)`,
        prompt: finalPrompt.slice(0, 2000),
        // Re-use source lyrics by default unless instrumental — the remix
        // typically keeps lyrics; users can edit before publish.
        lyrics: finalIsInstrumental
          ? null
          : source.lyrics
            ? sanitizeLyrics(source.lyrics) || null
            : null,
        genre: typeof genre === 'string' ? genre.slice(0, 50) : source.genre?.name || null,
        mood: typeof mood === 'string' ? mood.slice(0, 50) : source.mood,
        energy: typeof energy === 'string' ? energy.slice(0, 50) : null,
        era: typeof era === 'string' ? era.slice(0, 50) : null,
        isInstrumental: finalIsInstrumental,
        provider: 'minimax',
        providerModel: process.env.MINIMAX_MUSIC_MODEL || 'music-2.6',
        status: 'PENDING',
        parentTrackId: source.id,
        remixNote: finalNote,
      },
    });

    // Fire-and-forget; same pattern as createVariation.
    void processMusicGeneration(generation.id);

    res.status(202).json({
      generation,
      usage: { ...usage, remaining: usage.remaining - 1 },
    });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      res.status(429).json({
        error: (error as Error).message,
        usage: (error as { usage?: unknown }).usage,
      });
      return;
    }
    logger.error('Create remix error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create remix' });
  }
};

// GET /api/tracks/:idOrSlug/remixes — child remixes of a parent track. Public
// endpoint; only ACTIVE + isPublic remix tracks are surfaced.
export const listRemixesOfTrack = async (req: RequestWithUser, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;
    const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 50);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const parent = await prisma.track.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true },
    });
    if (!parent) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    const remixes = await prisma.trackRemix.findMany({
      where: {
        parentTrackId: parent.id,
        remixTrack: { status: 'ACTIVE', isPublic: true, takedownStatus: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        remixTrack: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverArt: true,
            duration: true,
            playCount: true,
            likeCount: true,
            agent: { select: { id: true, name: true, slug: true, avatar: true } },
          },
        },
        remixer: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    const hasMore = remixes.length > limit;
    const items = hasMore ? remixes.slice(0, limit) : remixes;

    res.json({
      remixes: items.map((r) => ({
        id: r.id,
        note: r.note,
        createdAt: r.createdAt,
        track: r.remixTrack,
        remixer: r.remixer,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    logger.error('listRemixesOfTrack error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list remixes' });
  }
};

// GET /api/remixes/feed — global recent-remixes discovery feed.
export const remixDiscoveryFeed = async (req: RequestWithUser, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 50);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const remixes = await prisma.trackRemix.findMany({
      where: {
        remixTrack: { status: 'ACTIVE', isPublic: true, takedownStatus: null },
        parentTrack: { status: 'ACTIVE', isPublic: true, takedownStatus: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        remixTrack: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverArt: true,
            duration: true,
            playCount: true,
            likeCount: true,
            agent: { select: { id: true, name: true, slug: true, avatar: true } },
          },
        },
        parentTrack: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverArt: true,
            agent: { select: { id: true, name: true, slug: true } },
          },
        },
        remixer: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    const hasMore = remixes.length > limit;
    const items = hasMore ? remixes.slice(0, limit) : remixes;

    res.json({
      remixes: items.map((r) => ({
        id: r.id,
        note: r.note,
        createdAt: r.createdAt,
        track: r.remixTrack,
        parent: r.parentTrack,
        remixer: r.remixer,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    logger.error('remixDiscoveryFeed error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load remix feed' });
  }
};
