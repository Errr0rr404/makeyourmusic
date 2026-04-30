import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

const MAX_REASON = 4000;

// Public: anyone can file a DMCA-style takedown. We hide the track immediately
// (status flips on the Track) and queue an admin review. Withdrawal or
// rejection unhides; acceptance leaves the track soft-deleted.
export const fileTakedown = async (req: RequestWithUser, res: Response) => {
  try {
    const { trackId, reason, claimantName, claimantEmail, evidenceUrl } = req.body || {};

    if (!trackId || typeof trackId !== 'string') {
      res.status(400).json({ error: 'trackId is required' });
      return;
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 20) {
      res.status(400).json({ error: 'reason must be at least 20 characters' });
      return;
    }
    if (reason.length > MAX_REASON) {
      res.status(400).json({ error: `reason must be ${MAX_REASON} characters or less` });
      return;
    }
    if (!claimantName || typeof claimantName !== 'string') {
      res.status(400).json({ error: 'claimantName is required' });
      return;
    }
    if (!claimantEmail || typeof claimantEmail !== 'string' || !claimantEmail.includes('@')) {
      res.status(400).json({ error: 'valid claimantEmail is required' });
      return;
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    const takedown = await prisma.$transaction(async (tx) => {
      const t = await tx.takedown.create({
        data: {
          trackId,
          reason: reason.trim(),
          claimantName: claimantName.trim(),
          claimantEmail: claimantEmail.trim(),
          evidenceUrl: typeof evidenceUrl === 'string' && evidenceUrl.trim() ? evidenceUrl.trim() : null,
          submitterId: req.user?.userId || null,
        },
      });
      // Hide the track until the takedown is resolved.
      await tx.track.update({
        where: { id: trackId },
        data: {
          takedownStatus: 'PENDING',
          takedownReason: reason.trim().slice(0, 500),
          isPublic: false,
        },
      });
      return t;
    });

    logger.info('Takedown filed', { takedownId: takedown.id, trackId });
    res.status(201).json({ id: takedown.id, status: takedown.status });
  } catch (error) {
    logger.error('File takedown error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to file takedown' });
  }
};

// Submitter can withdraw their own takedown by id (no auth required if
// they hold the takedown id; this is a one-shot link sent on email
// confirmation). Restores track visibility.
export const withdrawTakedown = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const takedown = await prisma.takedown.findUnique({ where: { id } });
    if (!takedown) {
      res.status(404).json({ error: 'Takedown not found' });
      return;
    }
    if (takedown.status !== 'PENDING') {
      res.status(400).json({ error: 'Only pending takedowns can be withdrawn' });
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.takedown.update({
        where: { id },
        data: { status: 'WITHDRAWN', resolvedAt: new Date() },
      });
      // If no other pending takedowns exist for the track, restore it.
      const otherPending = await tx.takedown.count({
        where: { trackId: takedown.trackId, status: 'PENDING', id: { not: id } },
      });
      if (otherPending === 0) {
        await tx.track.update({
          where: { id: takedown.trackId },
          data: { takedownStatus: null, takedownReason: null, isPublic: true },
        });
      }
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Withdraw takedown error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to withdraw takedown' });
  }
};

// Admin: list pending takedowns
export const listTakedowns = async (req: RequestWithUser, res: Response) => {
  try {
    const status = (req.query.status as string) || 'PENDING';
    const takedowns = await prisma.takedown.findMany({
      where: status === 'ALL' ? {} : { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        track: { select: { id: true, title: true, slug: true, audioUrl: true, agentId: true } },
        submitter: { select: { id: true, username: true, email: true } },
      },
    });
    res.json({ takedowns });
  } catch (error) {
    logger.error('List takedowns error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list takedowns' });
  }
};

// Admin: resolve takedown (accept or reject)
export const resolveTakedown = async (req: RequestWithUser, res: Response) => {
  try {
    const id = req.params.id as string;
    const { decision, adminNotes } = req.body || {};
    if (decision !== 'ACCEPT' && decision !== 'REJECT') {
      res.status(400).json({ error: 'decision must be ACCEPT or REJECT' });
      return;
    }
    const takedown = await prisma.takedown.findUnique({ where: { id } });
    if (!takedown) {
      res.status(404).json({ error: 'Takedown not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.takedown.update({
        where: { id },
        data: {
          status: decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
          adminNotes: typeof adminNotes === 'string' ? adminNotes : null,
          resolvedAt: new Date(),
        },
      });
      if (decision === 'ACCEPT') {
        await tx.track.update({
          where: { id: takedown.trackId },
          data: { takedownStatus: 'ACCEPTED', isPublic: false, status: 'REMOVED' },
        });
      } else {
        const otherPending = await tx.takedown.count({
          where: { trackId: takedown.trackId, status: 'PENDING', id: { not: id } },
        });
        if (otherPending === 0) {
          await tx.track.update({
            where: { id: takedown.trackId },
            data: { takedownStatus: null, takedownReason: null, isPublic: true },
          });
        }
      }
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Resolve takedown error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to resolve takedown' });
  }
};
