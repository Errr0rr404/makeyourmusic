// Collaboration earnings splits.
//
// When a track with collaborators generates earnings via tip or sync license,
// the destination charge sends 100% of the net amount to the primary agent
// owner's Stripe Connect account. To honor the configured shares we then
// issue Stripe transfers ON BEHALF OF the primary's connected account to
// each non-primary collaborator's connected account.
//
// Each obligation is recorded as a CollabPayout row first (idempotent via
// the (source, sourceId, toUserId) unique constraint), then we attempt the
// transfer. Failures stay PENDING for the cron retry to pick up.

import { prisma } from './db';
import logger from './logger';
import { getStripe } from './stripeClient';
import { computeEarningsSplit } from '../controllers/collabController';

export interface SplitEarningsInput {
  trackId: string;
  /** Net cents already on the primary's connect account (gross minus platform fee). */
  netCents: number;
  source: 'tip' | 'sync_license';
  sourceId: string;
}

// Record + best-effort transfer of all non-primary shares. Always returns;
// errors are logged and the rows persist for cron retry.
export async function splitTrackEarnings(input: SplitEarningsInput): Promise<void> {
  const { trackId, netCents, source, sourceId } = input;
  if (netCents <= 0) return;

  const splits = await computeEarningsSplit(trackId, netCents);
  if (splits.length <= 1) return; // single-owner; primary already received the full amount

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { agent: { select: { ownerId: true } } },
  });
  if (!track?.agent?.ownerId) return;
  const primaryUserId = track.agent.ownerId;

  // Persist each non-primary obligation. Idempotent on unique constraint.
  const others = splits.filter((s) => s.ownerUserId !== primaryUserId && s.amountCents > 0);
  for (const split of others) {
    try {
      await prisma.collabPayout.create({
        data: {
          source,
          sourceId,
          trackId,
          fromUserId: primaryUserId,
          toUserId: split.ownerUserId,
          shareBps: split.shareBps,
          amountCents: split.amountCents,
          status: 'PENDING',
        },
      });
    } catch (err: any) {
      // P2002: webhook replay — that obligation already recorded.
      if (err?.code !== 'P2002') {
        logger.warn('collab payout record failed', {
          trackId,
          to: split.ownerUserId,
          error: err.message,
        });
      }
    }
  }

  // Best-effort: try to issue transfers immediately so collaborators see funds
  // sooner. Anything that fails (e.g. transient Stripe error, balance not yet
  // available) gets retried by the cron.
  await processPendingCollabPayouts({ trackId, source, sourceId });
}

interface ProcessFilter {
  trackId?: string;
  source?: string;
  sourceId?: string;
}

const MAX_ATTEMPTS = 6;

export interface ProcessResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

export async function processPendingCollabPayouts(
  filter: ProcessFilter = {}
): Promise<ProcessResult> {
  const out: ProcessResult = { attempted: 0, succeeded: 0, failed: 0 };
  const stripe = getStripe();
  if (!stripe) return out;

  const where: any = { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } };
  if (filter.trackId) where.trackId = filter.trackId;
  if (filter.source) where.source = filter.source;
  if (filter.sourceId) where.sourceId = filter.sourceId;

  const pending = await prisma.collabPayout.findMany({
    where,
    take: 100,
    orderBy: { createdAt: 'asc' },
  });

  for (const row of pending) {
    out.attempted += 1;

    const [primary, recipient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: row.fromUserId },
        include: { connectAccount: true },
      }),
      prisma.user.findUnique({
        where: { id: row.toUserId },
        include: { connectAccount: true },
      }),
    ]);

    const primaryAcct = primary?.connectAccount?.stripeAccountId;
    const recipientAcct = recipient?.connectAccount?.stripeAccountId;
    const recipientReady =
      recipient?.connectAccount?.status === 'ACTIVE' &&
      recipient?.connectAccount?.payoutsEnabled;

    if (!primaryAcct) {
      // Primary's account is gone — can't fund the transfer. Mark FAILED so
      // we stop retrying; this needs human reconciliation.
      await prisma.collabPayout.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          errorMessage: 'primary connect account missing',
          attempts: row.attempts + 1,
        },
      });
      out.failed += 1;
      continue;
    }
    if (!recipientAcct || !recipientReady) {
      // Recipient hasn't completed Connect onboarding. Stay PENDING; cron
      // will retry until they do. Track attempts so we don't loop forever.
      await prisma.collabPayout.update({
        where: { id: row.id },
        data: { attempts: row.attempts + 1 },
      });
      continue;
    }

    let transferId: string | null = null;
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: row.amountCents,
          currency: row.currency,
          destination: recipientAcct,
          description: `Collaboration share (${row.source})`,
          metadata: {
            kind: 'collab_payout',
            collabPayoutId: row.id,
            source: row.source,
            sourceId: row.sourceId,
            trackId: row.trackId,
          },
        },
        // Issue ON BEHALF OF the primary's connected account — funds come
        // from their balance, where the original destination charge landed.
        // idempotencyKey is the row id so a webhook replay or in-line + cron
        // double-invocation cannot issue the same payout twice.
        {
          stripeAccount: primaryAcct,
          idempotencyKey: `collab_payout:${row.id}`,
        }
      );
      transferId = transfer.id;
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      logger.warn('collab payout transfer failed', {
        collabPayoutId: row.id,
        attempts: row.attempts + 1,
        error: message,
      });
      const nextAttempts = row.attempts + 1;
      await prisma.collabPayout.update({
        where: { id: row.id },
        data: {
          attempts: nextAttempts,
          errorMessage: message,
          status: nextAttempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        },
      });
      out.failed += 1;
      continue;
    }

    await prisma.collabPayout.update({
      where: { id: row.id },
      data: {
        status: 'SUCCEEDED',
        stripeTransferId: transferId,
        paidAt: new Date(),
        attempts: row.attempts + 1,
      },
    });
    out.succeeded += 1;
  }

  return out;
}
