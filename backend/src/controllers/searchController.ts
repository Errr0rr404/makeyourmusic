// Vector + text search across tracks, agents, and lyrics.
//
// We do NOT depend on pgvector — true ANN search would require an extension
// install most managed Postgres (Railway, Supabase) lock down. Instead we
// hybrid-rank in two phases:
//
//   1. Text candidate set (Postgres ILIKE over title + lyrics + tags + agent
//      name) — narrows the corpus to ~200 candidates fast.
//   2. Cosine re-rank using the existing Track.featureVector (computed at
//      publish time from genre/mood/era/bpm/etc., see utils/recommendations).
//
// Result is "find tracks like this idea" with both lexical and semantic
// signal, no extra infra. When real audio embeddings land we can switch the
// vector source under the hood without changing the API surface.

import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { cosineSimilarity, computeFeatureVector } from '../utils/recommendations';

interface Filters {
  bpmMin?: number;
  bpmMax?: number;
  durationMinSec?: number;
  durationMaxSec?: number;
  key?: string;
  isInstrumental?: boolean;
  era?: string;
  genreSlug?: string;
  language?: string;
}

function parseFilters(q: Record<string, string | string[] | undefined>): Filters {
  const num = (v: string | string[] | undefined): number | undefined => {
    if (typeof v !== 'string') return undefined;
    const n = parseInt(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bool = (v: string | string[] | undefined): boolean | undefined => {
    if (typeof v !== 'string') return undefined;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  };
  return {
    bpmMin: num(q.bpmMin),
    bpmMax: num(q.bpmMax),
    durationMinSec: num(q.durationMinSec),
    durationMaxSec: num(q.durationMaxSec),
    key: typeof q.key === 'string' ? q.key : undefined,
    isInstrumental: bool(q.isInstrumental),
    era: typeof q.era === 'string' ? q.era : undefined,
    genreSlug: typeof q.genreSlug === 'string' ? q.genreSlug : undefined,
    language: typeof q.language === 'string' ? q.language : undefined,
  };
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 40);
}

// Map free-text tokens to a synthetic feature vector by guessing genre/mood/era.
// The recommendations vector slots are case-insensitive substring matches, so
// we just feed each token through as both genre and mood to light up matching
// dimensions. Crude but effective for "lofi study" → lofi+study slots fire.
function queryToFeatureVector(query: string): number[] {
  const tokens = tokenize(query);
  // Synthesize a TrackFeatureInput from heuristics. We don't know BPM/duration
  // — leave them unset so those slots stay 0 and don't drag scores around.
  const moodToken = tokens.find((t) =>
    ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic',
     'uplifting', 'melancholy', 'dark', 'dreamy', 'epic', 'tense', 'playful',
     'sensual', 'aggressive', 'peaceful', 'hopeful', 'lonely', 'triumphant'].includes(t)
  );
  const energyToken = tokens.find((t) =>
    ['low', 'medium', 'high', 'explosive', 'chill', 'hype'].includes(t)
  );
  const eraToken = tokens.find((t) =>
    ['60s', '70s', '80s', '90s', '00s', '10s', '20s', 'modern', 'futuristic', 'classical'].includes(t)
  );

  return computeFeatureVector({
    duration: 180,
    generationGenre: tokens[0] || null,
    generationSubGenre: tokens[1] || null,
    generationMood: moodToken || null,
    generationEnergy: energyToken || null,
    generationEra: eraToken || null,
  });
}

const TEXT_TITLE_WEIGHT = 3;
const TEXT_LYRICS_WEIGHT = 2;
const TEXT_TAG_WEIGHT = 1;
const TEXT_AGENT_WEIGHT = 1.5;
const VECTOR_WEIGHT = 4;

interface ScoredHit {
  trackId: string;
  textScore: number;
  vecScore: number;
  total: number;
}

// GET /api/search/tracks?q=...&limit=20&...filters
export const searchTracks = async (req: RequestWithUser, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 50);
    const filters = parseFilters(req.query as Record<string, string | string[] | undefined>);

    if (!q && !filters.genreSlug) {
      res.status(400).json({ error: 'Provide q (search query) or genreSlug filter' });
      return;
    }

    const tokens = tokenize(q);
    // Build a Postgres OR over each token across multiple columns. We cap
    // at 5 tokens to keep query plans bounded.
    const safeTokens = tokens.slice(0, 5);

    const whereBase: Record<string, unknown> = {
      status: 'ACTIVE',
      isPublic: true,
      takedownStatus: null,
    };
    if (typeof filters.bpmMin === 'number') (whereBase as Record<string, unknown>).bpm = { ...(whereBase as { bpm?: Record<string, number> }).bpm, gte: filters.bpmMin };
    if (typeof filters.bpmMax === 'number') (whereBase as { bpm?: Record<string, number> }).bpm = { ...(whereBase as { bpm?: Record<string, number> }).bpm, lte: filters.bpmMax };
    if (typeof filters.durationMinSec === 'number') (whereBase as { duration?: Record<string, number> }).duration = { ...(whereBase as { duration?: Record<string, number> }).duration, gte: filters.durationMinSec };
    if (typeof filters.durationMaxSec === 'number') (whereBase as { duration?: Record<string, number> }).duration = { ...(whereBase as { duration?: Record<string, number> }).duration, lte: filters.durationMaxSec };
    if (typeof filters.key === 'string') (whereBase as { key?: string }).key = filters.key;
    if (filters.genreSlug) (whereBase as { genre?: { slug: string } }).genre = { slug: filters.genreSlug };

    // Phase 1: candidate retrieval. Pull up to 200 candidates via text
    // matching; if no query was supplied we just take the most-recent active
    // public tracks under the filters.
    const orClauses: Record<string, unknown>[] = [];
    if (safeTokens.length > 0) {
      for (const t of safeTokens) {
        orClauses.push({ title: { contains: t, mode: 'insensitive' } });
        orClauses.push({ lyrics: { contains: t, mode: 'insensitive' } });
        orClauses.push({ tags: { has: t } });
        orClauses.push({ agent: { is: { name: { contains: t, mode: 'insensitive' } } } });
      }
    }

    const where = orClauses.length > 0
      ? { ...whereBase, OR: orClauses }
      : whereBase;

    const candidates = await prisma.track.findMany({
      where: where as never,
      orderBy: [{ trendingScore: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      select: {
        id: true,
        title: true,
        slug: true,
        coverArt: true,
        duration: true,
        playCount: true,
        likeCount: true,
        lyrics: true,
        tags: true,
        featureVector: true,
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: { select: { id: true, name: true, slug: true } },
      },
    });

    // Phase 2: hybrid score. Text match contributes per-column weighted hits;
    // vector match contributes cosine-similarity against the synthesized
    // query vector. Hits are normalized to roughly comparable ranges.
    const queryVec = q ? queryToFeatureVector(q) : null;

    const scored: (ScoredHit & {
      track: typeof candidates[number];
    })[] = candidates.map((t) => {
      let textScore = 0;
      if (safeTokens.length > 0) {
        const titleLc = t.title.toLowerCase();
        const lyricsLc = (t.lyrics || '').toLowerCase();
        const agentLc = t.agent.name.toLowerCase();
        for (const tok of safeTokens) {
          if (titleLc.includes(tok)) textScore += TEXT_TITLE_WEIGHT;
          if (lyricsLc.includes(tok)) textScore += TEXT_LYRICS_WEIGHT;
          if (t.tags.some((tag: string) => tag.toLowerCase().includes(tok))) textScore += TEXT_TAG_WEIGHT;
          if (agentLc.includes(tok)) textScore += TEXT_AGENT_WEIGHT;
        }
      }
      let vecScore = 0;
      if (queryVec && Array.isArray(t.featureVector) && t.featureVector.length === queryVec.length) {
        vecScore = Math.max(0, cosineSimilarity(queryVec, t.featureVector as number[])) * VECTOR_WEIGHT;
      }
      return {
        trackId: t.id,
        textScore,
        vecScore,
        total: textScore + vecScore,
        track: t,
      };
    });

    scored.sort((a, b) => b.total - a.total);
    const top = scored.slice(0, limit);

    res.json({
      query: q,
      filters,
      tokens: safeTokens,
      total: top.length,
      tracks: top.map((s) => ({
        id: s.track.id,
        title: s.track.title,
        slug: s.track.slug,
        coverArt: s.track.coverArt,
        duration: s.track.duration,
        playCount: s.track.playCount,
        likeCount: s.track.likeCount,
        agent: s.track.agent,
        genre: s.track.genre,
        score: parseFloat(s.total.toFixed(3)),
      })),
    });
  } catch (error) {
    logger.error('searchTracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Search failed' });
  }
};

// GET /api/search/agents?q=...
export const searchAgents = async (req: RequestWithUser, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 50);
    if (!q) {
      res.status(400).json({ error: 'q is required' });
      return;
    }

    const agents = await prisma.aiAgent.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q.toLowerCase(), mode: 'insensitive' } },
        ],
      },
      orderBy: { followerCount: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        avatar: true,
        bio: true,
        followerCount: true,
        totalPlays: true,
      },
    });
    res.json({ query: q, agents });
  } catch (error) {
    logger.error('searchAgents error', { error: (error as Error).message });
    res.status(500).json({ error: 'Search failed' });
  }
};
