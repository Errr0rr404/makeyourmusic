import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { pollStemsJob, startStemsJob, StemProviderUnavailable, STEM_PROVIDER_ID } from '../utils/stems';

// Kick off a stem-separation job for a track the caller owns. Idempotent:
// if a TrackStems row already exists in PENDING/PROCESSING/READY we surface
// it directly rather than re-running.
export const requestStems = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can request stems' });
      return;
    }

    const existing = await prisma.trackStems.findUnique({ where: { trackId } });
    if (existing && existing.status !== 'FAILED') {
      res.json({ stems: existing });
      return;
    }

    try {
      const job = await startStemsJob(track.audioUrl);
      const stems = await prisma.trackStems.upsert({
        where: { trackId },
        create: {
          trackId,
          status: 'PROCESSING',
          provider: STEM_PROVIDER_ID,
          providerJobId: job.jobId,
        },
        update: {
          status: 'PROCESSING',
          provider: STEM_PROVIDER_ID,
          providerJobId: job.jobId,
          errorMessage: null,
        },
      });
      res.status(202).json({ stems });
    } catch (err) {
      if (err instanceof StemProviderUnavailable) {
        res.status(503).json({ error: 'Stem separation is not yet available' });
        return;
      }
      throw err;
    }
  } catch (error) {
    logger.error('requestStems error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to request stems' });
  }
};

// Poll status and, when the upstream is done, persist the four stem URLs.
export const getStems = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const stems = await prisma.trackStems.findUnique({ where: { trackId } });
    if (!stems) {
      res.status(404).json({ error: 'No stems for this track' });
      return;
    }
    if (stems.status === 'PROCESSING' && stems.providerJobId) {
      try {
        const result = await pollStemsJob(stems.providerJobId);
        if (result.status === 'succeeded' && result.output) {
          const updated = await prisma.trackStems.update({
            where: { trackId },
            data: {
              status: 'READY',
              drumsUrl: result.output.drums || null,
              bassUrl: result.output.bass || null,
              vocalsUrl: result.output.vocals || null,
              otherUrl: result.output.other || null,
            },
          });
          res.json({ stems: updated });
          return;
        }
        if (result.status === 'failed' || result.status === 'canceled') {
          await prisma.trackStems.update({
            where: { trackId },
            data: {
              status: 'FAILED',
              errorMessage: result.error || 'Stem job failed',
            },
          });
        }
      } catch (err) {
        logger.warn('Stems poll failed', { trackId, error: (err as Error).message });
      }
    }
    res.json({ stems });
  } catch (error) {
    logger.error('getStems error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get stems' });
  }
};

// Owner sets a price (cents) so the stems become available as a paid bundle.
// Pass 0 / null to take stems off sale. The full purchase flow lives in the
// sync-licensing controller; this just toggles availability.
export const setStemsPrice = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const { priceCents } = req.body || {};
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track || track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can set stems price' });
      return;
    }
    const cents = typeof priceCents === 'number' && priceCents > 0 ? Math.floor(priceCents) : null;
    const stems = await prisma.trackStems.upsert({
      where: { trackId },
      create: { trackId, status: 'PENDING', forSaleCents: cents },
      update: { forSaleCents: cents },
    });
    res.json({ stems });
  } catch (error) {
    logger.error('setStemsPrice error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update stems price' });
  }
};
