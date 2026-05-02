import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { createNotification } from '../utils/notifications';

// Distribution to Spotify/Apple Music via a partner (DistroKid, TuneCore,
// SonoSuite, etc.). The actual API call is gated on a partnership +
// credentials. This controller queues the request and exposes status so
// creators can submit demand even before the integration ships.

const VALID_DISTRIBUTION_STATUSES = ['PENDING', 'SUBMITTED', 'LIVE', 'REJECTED', 'TAKEDOWN'] as const;
type DistributionStatusLiteral = (typeof VALID_DISTRIBUTION_STATUSES)[number];

export const requestDistribution = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const {
      partner,
      releaseDate,
      releaseTitle,
      artistName,
      // Free-form metadata payload from the wizard. We store it as-is.
      metadata,
    } = req.body || {};
    const partnerName = typeof partner === 'string' ? partner.toLowerCase() : 'manual';
    if (!['distrokid', 'tunecore', 'manual'].includes(partnerName)) {
      res.status(400).json({ error: 'partner must be distrokid, tunecore, or manual' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true, name: true } } },
    });
    if (!track || !track.agent || track.agent.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can request distribution' });
      return;
    }
    if (track.takedownStatus) {
      res.status(409).json({
        error: 'Track has an open takedown and cannot be distributed',
      });
      return;
    }
    if (track.status !== 'ACTIVE') {
      res.status(409).json({ error: 'Only active tracks can be distributed' });
      return;
    }

    const existing = await prisma.trackDistribution.findFirst({
      where: { trackId, status: { in: ['PENDING', 'SUBMITTED', 'LIVE'] } },
    });
    if (existing) {
      res.status(409).json({ error: 'Distribution already in progress', distribution: existing });
      return;
    }

    // Trim + cap user-supplied strings. We keep the wizard payload shape
    // permissive — partners disagree on the exact field set — but enforce
    // hard length limits so an attacker can't fill the row with megabytes
    // of metadata.
    const trim = (v: unknown, max: number): string | null => {
      if (typeof v !== 'string') return null;
      const t = v.trim();
      return t.length === 0 ? null : t.slice(0, max);
    };
    const safeReleaseTitle = trim(releaseTitle, 200) || track.title;
    const safeArtistName = trim(artistName, 200) || track.agent.name;

    const dist = await prisma.trackDistribution.create({
      data: {
        trackId,
        partner: partnerName,
        status: 'PENDING',
        releaseDate: typeof releaseDate === 'string' ? new Date(releaseDate) : null,
        releaseTitle: safeReleaseTitle,
        artistName: safeArtistName,
        metadata: metadata && typeof metadata === 'object' ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
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

// ─── Admin endpoints (queue + status updates) ────────────────

// GET /api/distributions (admin): list, optional ?status filter.
export const adminListDistributions = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const status = req.query.status as string | undefined;
    const where: Prisma.TrackDistributionWhereInput = {};
    if (status && (VALID_DISTRIBUTION_STATUSES as readonly string[]).includes(status)) {
      where.status = status as DistributionStatusLiteral;
    }
    const distributions = await prisma.trackDistribution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        track: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverArt: true,
            audioUrl: true,
            agent: { select: { ownerId: true, name: true } },
          },
        },
      },
    });
    res.json({ distributions });
  } catch (error) {
    logger.error('adminListDistributions error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list distributions' });
  }
};

// PATCH /api/distributions/:id (admin): update status / partner ids.
export const adminUpdateDistribution = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const id = req.params.id as string;
    const { status, partnerJobId, upc, isrc, releaseDate, errorMessage, partnerNotes } = req.body || {};

    const updates: Prisma.TrackDistributionUpdateInput = {};
    if (typeof status === 'string') {
      if (!(VALID_DISTRIBUTION_STATUSES as readonly string[]).includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      updates.status = status as DistributionStatusLiteral;
      if (status === 'TAKEDOWN') updates.takedownAt = new Date();
    }
    if (typeof partnerJobId === 'string') updates.partnerJobId = partnerJobId.slice(0, 200);
    if (typeof upc === 'string') updates.upc = upc.slice(0, 50);
    if (typeof isrc === 'string') updates.isrc = isrc.slice(0, 50);
    if (typeof releaseDate === 'string') updates.releaseDate = new Date(releaseDate);
    if (typeof errorMessage === 'string') updates.errorMessage = errorMessage.slice(0, 1000);
    if (typeof partnerNotes === 'string') updates.partnerNotes = partnerNotes.slice(0, 2000);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    const before = await prisma.trackDistribution.findUnique({
      where: { id },
      include: { track: { select: { title: true, agent: { select: { ownerId: true } } } } },
    });
    if (!before) {
      res.status(404).json({ error: 'Distribution not found' });
      return;
    }

    const dist = await prisma.trackDistribution.update({ where: { id }, data: updates });

    // Notify the owner when the row flips to LIVE — that's the moment they
    // care about. We deliberately don't notify on every status flip to avoid
    // notification spam while admin is manually progressing the record.
    if (
      typeof status === 'string' &&
      status === 'LIVE' &&
      before.status !== 'LIVE' &&
      before.track?.agent?.ownerId
    ) {
      await createNotification({
        userId: before.track.agent.ownerId,
        type: 'SYSTEM',
        title: 'Your track is live',
        message: `"${before.track.title}" is now live on streaming services.`,
        data: { trackId: before.trackId, distributionId: dist.id },
      });
    }

    res.json({ distribution: dist });
  } catch (error) {
    logger.error('adminUpdateDistribution error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update distribution' });
  }
};
