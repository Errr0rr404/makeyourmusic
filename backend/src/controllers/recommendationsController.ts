import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import {
  findSimilarTracks,
  computeFeatureVector,
} from '../utils/recommendations';

const TRACK_PUBLIC_SELECT = {
  id: true,
  title: true,
  slug: true,
  duration: true,
  audioUrl: true,
  coverArt: true,
  mood: true,
  bpm: true,
  playCount: true,
  likeCount: true,
  createdAt: true,
  agent: { select: { id: true, name: true, slug: true, avatar: true } },
  genre: { select: { id: true, name: true, slug: true } },
} as const;

// "More like this" — given a track id, return its closest neighbors.
export const similarTracks = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 50);
    const seed = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, featureVector: true },
    });
    if (!seed) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    const seedVec = (seed.featureVector as number[]) || [];
    if (!seedVec.length) {
      res.json({ tracks: [] });
      return;
    }
    const scored = await findSimilarTracks(seedVec, {
      limit,
      excludeIds: [seed.id],
    });
    if (!scored.length) {
      res.json({ tracks: [] });
      return;
    }
    const ids = scored.map((s) => s.id);
    const tracks = await prisma.track.findMany({
      where: { id: { in: ids } },
      select: TRACK_PUBLIC_SELECT,
    });
    // Restore similarity order
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const ordered = scored.map((s) => byId.get(s.id)).filter(Boolean);
    res.json({ tracks: ordered });
  } catch (error) {
    logger.error('similarTracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to compute similar tracks' });
  }
};

// Infinite radio — given a seed track (or genre/mood), returns a paginated
// list of tracks the player can stream end-to-end. Uses cursor pagination
// so the front-end can keep the queue full without re-scoring on every call.
export const radio = async (req: RequestWithUser, res: Response) => {
  try {
    const seedTrackId = req.query.seed as string | undefined;
    const genreSlug = req.query.genre as string | undefined;
    const mood = req.query.mood as string | undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 60);
    // Cap excludeIds to prevent a malicious client from passing 50,000 ids
    // and blowing up Prisma's query planner / hitting Postgres parameter limit.
    // Validate shape too — silently dropping garbage saves a query.
    const excludeIds = String(req.query.excludeIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 36)
      .slice(0, 200);

    let seedVec: number[] | null = null;

    if (seedTrackId) {
      const seed = await prisma.track.findUnique({
        where: { id: seedTrackId },
        select: { featureVector: true },
      });
      if (seed?.featureVector?.length) seedVec = seed.featureVector as number[];
    }

    if (!seedVec) {
      // No seed track: synthesize a vector from query inputs so radio still
      // works for "lo-fi mood" or "/genre/electronic" entry points.
      seedVec = computeFeatureVector({
        duration: 180,
        bpm: null,
        mood: mood || null,
        tags: [],
        genre: genreSlug ? { slug: genreSlug } : null,
        generationGenre: genreSlug,
        generationMood: mood,
      });
    }

    let genreId: string | undefined;
    if (genreSlug) {
      const g = await prisma.genre.findUnique({ where: { slug: genreSlug }, select: { id: true } });
      genreId = g?.id;
    }

    const scored = await findSimilarTracks(seedVec, { limit, excludeIds, genreId });
    if (!scored.length) {
      res.json({ tracks: [] });
      return;
    }
    const ids = scored.map((s) => s.id);
    const tracks = await prisma.track.findMany({
      where: { id: { in: ids } },
      select: TRACK_PUBLIC_SELECT,
    });
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const ordered = scored.map((s) => byId.get(s.id)).filter(Boolean);
    res.json({ tracks: ordered });
  } catch (error) {
    logger.error('radio error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to build radio queue' });
  }
};

// Made-for-you — uses the user's recent likes + plays as the seed. Falls
// back to trending if there's no listening history yet.
export const madeForYou = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userId = req.user.userId;
    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 60);

    // Recent likes + completed plays form the user's "taste signal".
    const [likes, plays] = await Promise.all([
      prisma.like.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { track: { select: { id: true, featureVector: true } } },
      }),
      prisma.play.findMany({
        where: { userId, completed: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { track: { select: { id: true, featureVector: true } } },
      }),
    ]);

    const vectors: number[][] = [];
    const seen = new Set<string>();
    for (const row of [...likes, ...plays]) {
      const t = row.track;
      if (!t || seen.has(t.id) || !t.featureVector?.length) continue;
      seen.add(t.id);
      vectors.push(t.featureVector as number[]);
    }

    if (!vectors.length || !vectors[0]) {
      // No listening history yet — fall back to trending.
      const trending = await prisma.track.findMany({
        where: { isPublic: true, status: 'ACTIVE', takedownStatus: null },
        orderBy: [{ trendingScore: 'desc' }, { playCount: 'desc' }],
        take: limit,
        select: TRACK_PUBLIC_SELECT,
      });
      res.json({ tracks: trending, source: 'trending' });
      return;
    }

    // Average the user's vectors into a single taste centroid.
    const dim = vectors[0].length;
    const centroid = new Array<number>(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) centroid[i] = (centroid[i] ?? 0) + (v[i] ?? 0);
    }
    for (let i = 0; i < dim; i++) centroid[i] = (centroid[i] ?? 0) / vectors.length;

    const scored = await findSimilarTracks(centroid, {
      limit,
      excludeIds: Array.from(seen),
    });
    if (!scored.length) {
      res.json({ tracks: [], source: 'taste' });
      return;
    }
    const ids = scored.map((s) => s.id);
    const tracks = await prisma.track.findMany({
      where: { id: { in: ids } },
      select: TRACK_PUBLIC_SELECT,
    });
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const ordered = scored.map((s) => byId.get(s.id)).filter(Boolean);
    res.json({ tracks: ordered, source: 'taste' });
  } catch (error) {
    logger.error('madeForYou error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to build personalized list' });
  }
};

// Trending — returns tracks ordered by trendingScore (computed by a separate
// cron). Falls back to playCount if trendingScore has not been initialized.
export const trending = async (req: RequestWithUser, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 60);
    const tracks = await prisma.track.findMany({
      where: { isPublic: true, status: 'ACTIVE', takedownStatus: null },
      orderBy: [{ trendingScore: 'desc' }, { playCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: TRACK_PUBLIC_SELECT,
    });
    res.json({ tracks });
  } catch (error) {
    logger.error('trending error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load trending' });
  }
};
