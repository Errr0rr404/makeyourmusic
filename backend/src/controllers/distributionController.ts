import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// Distribution to Spotify/Apple Music via a partner (DistroKid, TuneCore,
// SonoSuite, etc.). The actual API call is gated on a partnership +
// credentials. This controller queues the request and exposes status so
// creators can submit demand even before the integration ships.

export const requestDistribution = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const { partner, releaseDate } = req.body || {};
    const partnerName = typeof partner === 'string' ? partner.toLowerCase() : 'manual';
    if (!['distrokid', 'tunecore', 'manual'].includes(partnerName)) {
      res.status(400).json({ error: 'partner must be distrokid, tunecore, or manual' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track || track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can request distribution' });
      return;
    }

    const existing = await prisma.trackDistribution.findFirst({
      where: { trackId, status: { in: ['PENDING', 'SUBMITTED', 'LIVE'] } },
    });
    if (existing) {
      res.status(409).json({ error: 'Distribution already in progress', distribution: existing });
      return;
    }

    const dist = await prisma.trackDistribution.create({
      data: {
        trackId,
        partner: partnerName,
        status: 'PENDING',
        releaseDate: typeof releaseDate === 'string' ? new Date(releaseDate) : null,
      },
    });
    logger.info('Distribution requested', { trackId, partner: partnerName, distId: dist.id });
    res.status(202).json({ distribution: dist });
  } catch (error) {
    logger.error('requestDistribution error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to request distribution' });
  }
};

export const getDistribution = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const distributions = await prisma.trackDistribution.findMany({
      where: { trackId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ distributions });
  } catch (error) {
    logger.error('getDistribution error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get distribution' });
  }
};
