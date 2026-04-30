import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// Multi-agent track collaboration. The track owner adds collaborators by
// agent id with a basis-point share. Sum of shares (including the original
// agent) must equal 10000 (=100%).
//
// On any earnings event (tip, sub, sync purchase) the platform splits the
// transfer to all collaborators proportionally via Stripe Connect. The
// payment-webhook code reads this table at split-time.

const MAX_COLLABORATORS = 4;

export const setCollaborators = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const { collaborators } = req.body || {};
    if (!Array.isArray(collaborators) || collaborators.length === 0) {
      res.status(400).json({ error: 'collaborators must be a non-empty array' });
      return;
    }
    if (collaborators.length > MAX_COLLABORATORS) {
      res.status(400).json({ error: `At most ${MAX_COLLABORATORS} collaborators` });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { id: true, ownerId: true } } },
    });
    if (!track || track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can set collaborators' });
      return;
    }

    // Validate input shape
    const cleaned: Array<{ agentId: string; shareBps: number; role?: string | null }> = [];
    let totalBps = 0;
    const seenIds = new Set<string>();
    for (const c of collaborators) {
      const agentId = typeof c?.agentId === 'string' ? c.agentId : null;
      const shareBps = parseInt(String(c?.shareBps), 10);
      if (!agentId) {
        res.status(400).json({ error: 'each collaborator needs an agentId' });
        return;
      }
      // Deduplicate: schema has @@unique([trackId, agentId]) so duplicate
      // input would throw P2002 → 500 to client. Catch it earlier with a
      // friendly 400.
      if (seenIds.has(agentId)) {
        res.status(400).json({ error: 'Duplicate agent in collaborator list' });
        return;
      }
      seenIds.add(agentId);
      if (!Number.isFinite(shareBps) || shareBps <= 0 || shareBps > 10000) {
        res.status(400).json({ error: 'shareBps must be between 1 and 10000' });
        return;
      }
      totalBps += shareBps;
      cleaned.push({
        agentId,
        shareBps,
        role: typeof c.role === 'string' ? c.role.slice(0, 40) : null,
      });
    }
    if (totalBps !== 10000) {
      res.status(400).json({ error: `shareBps must sum to 10000 (currently ${totalBps})` });
      return;
    }

    // Ensure all referenced agents exist AND that the caller has permission
    // to assign earnings to them. Without this check, a malicious track owner
    // could split earnings to a competitor's agent (the competitor would
    // receive transfers but the schema would lie about authorship).
    //
    // Policy: the caller must own each collaborator agent. If we later add
    // a true invite/accept handshake, this can relax to "owner OR has accepted
    // an invite from this track owner".
    const ids = cleaned.map((c) => c.agentId);
    const agents = await prisma.aiAgent.findMany({
      where: { id: { in: ids } },
      select: { id: true, ownerId: true },
    });
    if (agents.length !== ids.length) {
      res.status(400).json({ error: 'One or more agents do not exist' });
      return;
    }
    const notOwned = agents.filter((a) => a.ownerId !== req.user!.userId);
    if (notOwned.length > 0) {
      res.status(403).json({
        error: 'You can only add agents you own as collaborators',
        agentIds: notOwned.map((a) => a.id),
      });
      return;
    }
    if (!cleaned.some((c) => c.agentId === track.agentId)) {
      res.status(400).json({ error: 'Primary agent must be in the collaborator list' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.trackCollaborator.deleteMany({ where: { trackId } });
      await tx.trackCollaborator.createMany({
        data: cleaned.map((c) => ({ trackId, agentId: c.agentId, shareBps: c.shareBps, role: c.role })),
      });
      return tx.trackCollaborator.findMany({
        where: { trackId },
        include: { agent: { select: { id: true, name: true, slug: true, avatar: true } } },
      });
    });

    res.json({ collaborators: result });
  } catch (error) {
    logger.error('setCollaborators error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to set collaborators' });
  }
};

export const getCollaborators = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const collaborators = await prisma.trackCollaborator.findMany({
      where: { trackId },
      include: { agent: { select: { id: true, name: true, slug: true, avatar: true } } },
      orderBy: { shareBps: 'desc' },
    });
    res.json({ collaborators });
  } catch (error) {
    logger.error('getCollaborators error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load collaborators' });
  }
};

// ─── Internal helper for payment webhook: split earnings ────
//
// Given a track + a gross net (after platform fee), return the per-owner
// transfer destinations + amounts. When no collaborators are configured we
// short-circuit to a single transfer to the primary agent owner.

export interface CollabSplit {
  ownerUserId: string;
  amountCents: number;
  shareBps: number;
}

export async function computeEarningsSplit(
  trackId: string,
  netCents: number
): Promise<CollabSplit[]> {
  if (netCents <= 0) return [];

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      agent: { select: { ownerId: true } },
      collaborators: {
        include: { agent: { select: { ownerId: true } } },
      },
    },
  });
  if (!track) return [];

  if (!track.collaborators.length) {
    return [
      {
        ownerUserId: track.agent.ownerId,
        amountCents: netCents,
        shareBps: 10000,
      },
    ];
  }

  // Sum to ensure floor-rounding leaves no remainder; give any rounding
  // dust to the primary agent's owner.
  const splits: CollabSplit[] = track.collaborators.map((c) => ({
    ownerUserId: c.agent.ownerId,
    amountCents: Math.floor((netCents * c.shareBps) / 10000),
    shareBps: c.shareBps,
  }));
  const distributed = splits.reduce((acc, s) => acc + s.amountCents, 0);
  const dust = netCents - distributed;
  if (dust > 0 && splits.length > 0) {
    const primary = splits.find((s) => s.ownerUserId === track.agent.ownerId);
    if (primary) primary.amountCents += dust;
    else if (splits[0]) splits[0].amountCents += dust;
  }
  return splits;
}
