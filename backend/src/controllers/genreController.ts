import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

export const listGenres = async (_req: RequestWithUser, res: Response) => {
  try {
    const genres = await prisma.genre.findMany({
      include: { _count: { select: { tracks: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ genres });
  } catch (error) {
    logger.error('List genres error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list genres' });
  }
};

export const createGenre = async (req: RequestWithUser, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

    const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    const genre = await prisma.genre.create({ data: { name, slug, color } });
    res.status(201).json({ genre });
  } catch (error) {
    logger.error('Create genre error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create genre' });
  }
};

export const seedGenres = async (_req: RequestWithUser, res: Response) => {
  try {
    const defaultGenres = [
      { name: 'Electronic', slug: 'electronic', color: '#6366f1' },
      { name: 'Lo-Fi', slug: 'lo-fi', color: '#8b5cf6' },
      { name: 'Ambient', slug: 'ambient', color: '#06b6d4' },
      { name: 'Hip Hop', slug: 'hip-hop', color: '#f59e0b' },
      { name: 'Pop', slug: 'pop', color: '#ec4899' },
      { name: 'Rock', slug: 'rock', color: '#ef4444' },
      { name: 'Jazz', slug: 'jazz', color: '#f97316' },
      { name: 'Classical', slug: 'classical', color: '#a855f7' },
      { name: 'R&B', slug: 'r-and-b', color: '#14b8a6' },
      { name: 'Cinematic', slug: 'cinematic', color: '#64748b' },
      { name: 'Synthwave', slug: 'synthwave', color: '#e879f9' },
      { name: 'Chillwave', slug: 'chillwave', color: '#38bdf8' },
      { name: 'Trap', slug: 'trap', color: '#fb923c' },
      { name: 'House', slug: 'house', color: '#4ade80' },
      { name: 'Techno', slug: 'techno', color: '#818cf8' },
      { name: 'Drum & Bass', slug: 'drum-and-bass', color: '#facc15' },
    ];

    for (const genre of defaultGenres) {
      await prisma.genre.upsert({
        where: { slug: genre.slug },
        create: genre,
        update: {},
      });
    }

    const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
    res.json({ genres, message: 'Genres seeded successfully' });
  } catch (error) {
    logger.error('Seed genres error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to seed genres' });
  }
};
