import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { getStripe, applyPlatformFee, frontendUrl } from '../utils/stripeClient';
import { createNotification } from '../utils/notifications';

const stripe = () => getStripe();

const MIN_TIP_CENTS = 100;     // $1
const MAX_TIP_CENTS = 50000;   // $500
const MAX_MESSAGE_LEN = 280;

/** Create a Stripe Checkout session that tips a creator. Destination charge with app fee. */
export const createTipCheckout = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const s = stripe();
    if (!s) { res.status(503).json({ error: 'Payment system not configured' }); return; }

    const { creatorUserId, amountCents, message, trackId } = req.body as {
      creatorUserId?: string;
      amountCents?: number;
      message?: string;
      trackId?: string;
    };

    if (!creatorUserId || typeof creatorUserId !== 'string') {
      res.status(400).json({ error: 'creatorUserId is required' });
      return;
    }
    if (creatorUserId === req.user.userId) {
      res.status(400).json({ error: "You can't tip yourself" });
      return;
    }
    if (typeof amountCents !== 'number' || !Number.isFinite(amountCents)) {
      res.status(400).json({ error: 'amountCents must be a number' });
      return;
    }
    const amount = Math.floor(amountCents);
    if (amount < MIN_TIP_CENTS || amount > MAX_TIP_CENTS) {
      res.status(400).json({
        error: `Tip must be between $${MIN_TIP_CENTS / 100} and $${MAX_TIP_CENTS / 100}`,
      });
      return;
    }
    const trimmedMessage =
      typeof message === 'string' ? message.trim().slice(0, MAX_MESSAGE_LEN) : null;

    // Creator must have an active Connect account.
    const creator = await prisma.user.findUnique({
      where: { id: creatorUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        connectAccount: true,
      },
    });
    if (!creator) { res.status(404).json({ error: 'Creator not found' }); return; }
    if (
      !creator.connectAccount ||
      creator.connectAccount.status !== 'ACTIVE' ||
      !creator.connectAccount.payoutsEnabled
    ) {
      res.status(400).json({ error: 'This creator has not enabled tips yet' });
      return;
    }

    if (trackId) {
      // Verify the track belongs to the creator being tipped — otherwise a
      // user could tip Creator A while attaching a trackId from Creator B,
      // mismatching payment routing vs analytics attribution.
      const track = await prisma.track.findUnique({
        where: { id: trackId },
        select: { id: true, agent: { select: { ownerId: true } } },
      });
      if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
      if (track.agent?.ownerId !== creatorUserId) {
        res.status(400).json({ error: 'Track does not belong to this creator' });
        return;
      }
    }

    const { fee, net } = applyPlatformFee(amount);
    const fe = frontendUrl();

    const session = await s.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name: `Tip for ${creator.displayName || creator.username}`,
              description: trimmedMessage || undefined,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: creator.connectAccount.stripeAccountId },
        metadata: {
          kind: 'tip',
          fromUserId: req.user.userId,
          toUserId: creator.id,
          trackId: trackId || '',
        },
      },
      success_url: `${fe}/u/${creator.username}?tip=success`,
      cancel_url: `${fe}/u/${creator.username}?tip=cancelled`,
      metadata: {
        kind: 'tip',
        fromUserId: req.user.userId,
        toUserId: creator.id,
        trackId: trackId || '',
        message: trimmedMessage || '',
      },
    });

    // Pre-record the tip as PENDING so we can reconcile via webhook.
    await prisma.tip.create({
      data: {
        amountCents: amount,
        platformFeeCents: fee,
        netCents: net,
        currency: 'usd',
        message: trimmedMessage,
        status: 'PENDING',
        stripeCheckoutSessionId: session.id,
        fromUserId: req.user.userId,
        toUserId: creator.id,
        trackId: trackId || null,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    logger.error('Create tip checkout error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create tip checkout' });
  }
};

/** Mark tip as succeeded. Called by webhook on checkout.session.completed (mode=payment, kind=tip). */
export async function handleTipCheckoutCompleted(session: any) {
  const sessionId: string = session.id;
  const tip = await prisma.tip.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
  });
  if (!tip) {
    logger.warn('Tip checkout completed but no Tip record found', { sessionId });
    return;
  }
  if (tip.status === 'SUCCEEDED') return;

  await prisma.tip.update({
    where: { id: tip.id },
    data: {
      status: 'SUCCEEDED',
      stripePaymentIntentId: session.payment_intent || null,
    },
  });

  // Queue referral earning if the recipient was referred. Best-effort —
  // failure here shouldn't block tip success notifications.
  try {
    const { recordReferralEarning } = await import('./referralController');
    await recordReferralEarning({
      refereeId: tip.toUserId,
      amountCents: tip.netCents,
      source: 'tip',
      sourceId: tip.id,
    });
  } catch (err) {
    logger.warn('Tip referral earning failed', { tipId: tip.id, error: (err as Error).message });
  }

  // Multi-agent track: split the net tip across collaborators by issuing
  // Stripe transfers on behalf of the primary's connect account. Best-effort —
  // anything that fails persists in collab_payouts for cron retry.
  if (tip.trackId) {
    try {
      const { splitTrackEarnings } = await import('../utils/collabSplits');
      await splitTrackEarnings({
        trackId: tip.trackId,
        netCents: tip.netCents,
        source: 'tip',
        sourceId: tip.id,
      });
    } catch (err) {
      logger.warn('Tip collab split failed', {
        tipId: tip.id,
        error: (err as Error).message,
      });
    }
  }

  // Notify the creator.
  let fromName = 'Someone';
  if (tip.fromUserId) {
    const fromUser = await prisma.user.findUnique({
      where: { id: tip.fromUserId },
      select: { displayName: true, username: true },
    });
    fromName = fromUser?.displayName || fromUser?.username || 'Someone';
  }
  await createNotification({
    userId: tip.toUserId,
    type: 'SYSTEM',
    title: 'You got tipped!',
    message: `${fromName} sent you $${(tip.amountCents / 100).toFixed(2)}${
      tip.message ? ` — "${tip.message}"` : ''
    }`,
    data: { kind: 'tip', tipId: tip.id, amountCents: tip.amountCents },
  });
}

export async function handleTipPaymentFailed(paymentIntent: any) {
  // Match by both stripePaymentIntentId AND PI metadata.tipId — payment_failed
  // can fire BEFORE checkout.session.completed has populated
  // stripePaymentIntentId, so a strict PI-id lookup misses those rows.
  const piId = paymentIntent?.id;
  const metadataTipId = paymentIntent?.metadata?.tipId;
  if (piId) {
    await prisma.tip.updateMany({
      where: { stripePaymentIntentId: piId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
  }
  if (metadataTipId) {
    await prisma.tip.updateMany({
      where: { id: metadataTipId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
  }
}

export async function handleTipRefunded(charge: any) {
  if (!charge.payment_intent) return;
  await prisma.tip.updateMany({
    where: { stripePaymentIntentId: charge.payment_intent },
    data: { status: 'REFUNDED' },
  });
}

/** List tips received by the current user (creator earnings). */
export const getReceivedTips = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || '50', 10)), 100);

    const tips = await prisma.tip.findMany({
      where: { toUserId: req.user.userId, status: 'SUCCEEDED' },
      include: {
        fromUser: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const totalCents = tips.reduce((sum, t) => sum + t.netCents, 0);
    res.json({ tips, totalNetCents: totalCents });
  } catch (error) {
    logger.error('Get received tips error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get tips' });
  }
};
