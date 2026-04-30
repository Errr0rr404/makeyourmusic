import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { createNotification } from '../utils/notifications';

const MAX_REASON = 4000;

// File a DMCA-style takedown. Auth is required (the route enforces it).
// We do NOT auto-hide the track on filing — that was a wide-open vector
// to wipe a competitor's catalog. Instead we file a PENDING takedown,
// notify the track owner so they can counter-notice, and let an admin
// review before any visibility change.
export const fileTakedown = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
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

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    // Cap concurrent takedowns from the same submitter against the same track.
    // Use a transaction to prevent race condition where two requests both pass
    // the check before either creates the record.
    const submitterId = req.user.userId;
    let takedown;
    try {
      takedown = await prisma.$transaction(async (tx) => {
        const existing = await tx.takedown.count({
          where: {
            trackId,
            submitterId,
            status: 'PENDING',
          },
        });
        if (existing > 0) {
          throw new Error('DUPLICATE_TAKEDOWN');
        }
        return tx.takedown.create({
          data: {
            trackId,
            reason: reason.trim(),
            claimantName: claimantName.trim(),
            claimantEmail: claimantEmail.trim(),
            evidenceUrl: typeof evidenceUrl === 'string' && evidenceUrl.trim() ? evidenceUrl.trim() : null,
            submitterId,
          },
        });
      });
    } catch (txError) {
      if ((txError as Error).message === 'DUPLICATE_TAKEDOWN') {
        res.status(409).json({ error: 'You already have a pending takedown for this track' });
        return;
      }
      throw txError;
    }

    // Notify the track's owner so they can respond before admin review.
    if (track.agent?.ownerId) {
      try {
        await createNotification({
          userId: track.agent.ownerId,
          type: 'SYSTEM',
          title: 'Copyright takedown filed against your track',
          message:
            'Someone has filed a DMCA takedown for one of your tracks. ' +
            'It will remain visible until our team reviews the claim.',
          data: { kind: 'takedown', takedownId: takedown.id, trackId },
        });
      } catch (err) {
        logger.warn('Failed to notify track owner of takedown', {
          trackId,
          error: (err as Error).message,
        });
      }
    }

    logger.info('Takedown filed', { takedownId: takedown.id, trackId, submitterId: req.user.userId });
    res.status(201).json({ id: takedown.id, status: takedown.status });
  } catch (error) {
    logger.error('File takedown error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to file takedown' });
  }
};

// Submitter can withdraw their own pending takedown. Auth is required and
// must match the original submitter (or admin) — previously anyone holding
// the takedown id could withdraw it, which was abusable to nullify
// legitimate takedowns by guessing/leaking ids.
export const withdrawTakedown = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const takedown = await prisma.takedown.findUnique({ where: { id } });
    if (!takedown) {
      res.status(404).json({ error: 'Takedown not found' });
      return;
    }
    if (takedown.submitterId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only the original submitter can withdraw this takedown' });
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
      // If the track was hidden by an admin's earlier acceptance/escalation
      // and no other pending takedowns block it, restore visibility.
      const otherPending = await tx.takedown.count({
        where: { trackId: takedown.trackId, status: 'PENDING', id: { not: id } },
      });
      if (otherPending === 0) {
        await tx.track.update({
          where: { id: takedown.trackId },
          data: { takedownStatus: null, takedownReason: null },
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
