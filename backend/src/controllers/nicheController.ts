import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { NICHE_DEFINITIONS, getNiche } from '../utils/niches';
import { computeFeatureVector, findSimilarTracks } from '../utils/recommendations';

export const listNiches = async (_req: RequestWithUser, res: Response) => {
  res.json({ niches: NICHE_DEFINITIONS });
};

// Niche landing page payload — surface a curated track list seeded from the
// niche's genre/mood, plus the prompt templates so the frontend can show
// one-click create buttons.
export const nicheLanding = async (req: RequestWithUser, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const niche = getNiche(slug);
    if (!niche) {
      res.status(404).json({ error: 'Niche not found' });
      return;
    }
    const seedVec = computeFeatureVector({
      duration: 180,
      mood: niche.seedMood ?? null,
      tags: [],
      generationGenre: niche.seedGenre,
      generationMood: niche.seedMood,
      generationEra: niche.seedEra,
    });
    const scored = await findSimilarTracks(seedVec, { limit: 30 });
    const ids = scored.map((s) => s.id);
    const tracks = ids.length
      ? await prisma.track.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            title: true,
            slug: true,
            audioUrl: true,
            coverArt: true,
            duration: true,
            mood: true,
            agent: { select: { name: true, slug: true, avatar: true } },
          },
        })
      : [];
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const ordered = scored.map((s) => byId.get(s.id)).filter(Boolean);
    res.json({ niche, tracks: ordered });
  } catch (error) {
    logger.error('nicheLanding error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load niche' });
  }
};
