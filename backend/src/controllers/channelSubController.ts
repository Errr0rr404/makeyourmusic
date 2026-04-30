import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { getStripe, platformFeeBps, frontendUrl } from '../utils/stripeClient';
import { createNotification } from '../utils/notifications';

const stripe = () => getStripe();

const MIN_PRICE_CENTS = 100;    // $1
const MAX_PRICE_CENTS = 9900;   // $99

/**
 * Convert a playlist to a paid channel. Creator must:
 *  - own the playlist
 *  - have an ACTIVE Connect account with payouts enabled
 *  - have a paid platform tier (CREATOR or PREMIUM)
 *
 * Creates a Stripe Product + Price (recurring monthly). Idempotent: re-calls
 * with a new price archive the old Price and create a new one.
 */
export const setPlaylistPricing = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const s = stripe();
    if (!s) { res.status(503).json({ error: 'Payment system not configured' }); return; }

    const playlistId = req.params.id as string;
    const { monthlyPriceCents, accessTier } = req.body as {
      monthlyPriceCents?: number;
      accessTier?: 'PUBLIC' | 'PRIVATE' | 'PAID';
    };

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.userId !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Switching to PUBLIC or PRIVATE — strip pricing.
    if (accessTier === 'PUBLIC' || accessTier === 'PRIVATE') {
      // Archive any existing Stripe Price so it can't be subscribed-to anymore.
      if (playlist.stripePriceId) {
        try {
          await s.prices.update(playlist.stripePriceId, { active: false });
        } catch (err) {
          logger.warn('Failed to archive Stripe price', {
            priceId: playlist.stripePriceId,
            error: (err as Error).message,
          });
        }
      }
      const updated = await prisma.playlist.update({
        where: { id: playlistId },
        data: {
          accessTier,
          isPublic: accessTier === 'PUBLIC',
          monthlyPriceCents: null,
          stripePriceId: null,
        },
      });
      res.json({ playlist: updated });
      return;
    }

    if (accessTier !== 'PAID') {
      res.status(400).json({ error: 'accessTier must be PUBLIC, PRIVATE, or PAID' });
      return;
    }

    // PAID requires price + Connect account + paid tier.
    if (
      typeof monthlyPriceCents !== 'number' ||
      !Number.isFinite(monthlyPriceCents) ||
      monthlyPriceCents < MIN_PRICE_CENTS ||
      monthlyPriceCents > MAX_PRICE_CENTS
    ) {
      res.status(400).json({
        error: `monthlyPriceCents must be between $${MIN_PRICE_CENTS / 100} and $${MAX_PRICE_CENTS / 100}`,
      });
      return;
    }

    const [connect, sub] = await Promise.all([
      prisma.connectAccount.findUnique({ where: { userId: req.user.userId } }),
      prisma.subscription.findUnique({ where: { userId: req.user.userId } }),
    ]);
    if (!connect || connect.status !== 'ACTIVE' || !connect.payoutsEnabled) {
      res.status(400).json({
        error: 'Set up payouts before charging for content',
        code: 'CONNECT_REQUIRED',
      });
      return;
    }
    const isPaidTier =
      sub?.status === 'ACTIVE' && (sub.tier === 'CREATOR' || sub.tier === 'PREMIUM');
    if (!isPaidTier && req.user.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Upgrade to Creator to monetize your playlists',
        code: 'CREATOR_TIER_REQUIRED',
      });
      return;
    }

    const priceUnchanged =
      playlist.accessTier === 'PAID' &&
      playlist.monthlyPriceCents === Math.floor(monthlyPriceCents) &&
      playlist.stripePriceId;
    if (priceUnchanged) {
      res.json({ playlist });
      return;
    }

    // Reuse existing Product if any; else create one.
    let productId = playlist.stripeProductId;
    if (!productId) {
      const product = await s.products.create({
        name: `Playlist: ${playlist.title}`,
        metadata: { playlistId: playlist.id, creatorUserId: req.user.userId },
      });
      productId = product.id;
    } else {
      // Ensure name stays in sync if title changed.
      try {
        await s.products.update(productId, { name: `Playlist: ${playlist.title}` });
      } catch {
        /* non-fatal */
      }
    }

    // Archive previous price so old subscriptions stay valid but no new ones can sign up at the old rate.
    if (playlist.stripePriceId) {
      try {
        await s.prices.update(playlist.stripePriceId, { active: false });
      } catch {
        /* non-fatal */
      }
    }

    const newPrice = await s.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: Math.floor(monthlyPriceCents),
      recurring: { interval: 'month' },
      metadata: { playlistId: playlist.id, creatorUserId: req.user.userId },
    });

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        accessTier: 'PAID',
        isPublic: false,
        monthlyPriceCents: Math.floor(monthlyPriceCents),
        stripeProductId: productId,
        stripePriceId: newPrice.id,
      },
    });
    res.json({ playlist: updated });
  } catch (error) {
    logger.error('Set playlist pricing error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to set playlist pricing' });
  }
};

/** Fan subscribes to a paid playlist — creates a Checkout subscription with destination charge. */
export const subscribeToPlaylist = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const s = stripe();
    if (!s) { res.status(503).json({ error: 'Payment system not configured' }); return; }

    const playlistId = req.params.id as string;
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { user: { include: { connectAccount: true } } },
    });
    if (!playlist) { res.status(404).json({ error: 'Playlist not found' }); return; }
    if (playlist.accessTier !== 'PAID' || !playlist.stripePriceId) {
      res.status(400).json({ error: 'This playlist is not for sale' });
      return;
    }
    if (playlist.userId === req.user.userId) {
      res.status(400).json({ error: "You can't subscribe to your own playlist" });
      return;
    }
    if (
      !playlist.user.connectAccount ||
      playlist.user.connectAccount.status !== 'ACTIVE' ||
      !playlist.user.connectAccount.payoutsEnabled
    ) {
      res.status(400).json({ error: 'This creator can no longer accept subscriptions' });
      return;
    }

    // Already subscribed? Return existing.
    const existing = await prisma.channelSubscription.findUnique({
      where: { subscriberUserId_playlistId: { subscriberUserId: req.user.userId, playlistId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      res.status(409).json({ error: 'Already subscribed', subscription: existing });
      return;
    }

    // Get or create platform-customer for the fan (separate from creator's Connect account).
    let customerId: string | undefined;
    const fanSub = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });
    if (fanSub?.stripeCustomerId) {
      customerId = fanSub.stripeCustomerId;
    } else {
      const fan = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true },
      });
      const customer = await s.customers.create({
        email: fan?.email,
        metadata: { userId: req.user.userId },
      });
      customerId = customer.id;
      // Stash on Subscription row so we don't multi-create.
      await prisma.subscription.upsert({
        where: { userId: req.user.userId },
        update: { stripeCustomerId: customerId },
        create: {
          userId: req.user.userId,
          stripeCustomerId: customerId,
          tier: 'FREE',
          status: 'ACTIVE',
        },
      });
    }

    const fe = frontendUrl();
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: playlist.stripePriceId, quantity: 1 }],
      subscription_data: {
        application_fee_percent: platformFeeBps() / 100,
        transfer_data: { destination: playlist.user.connectAccount.stripeAccountId },
        metadata: {
          kind: 'channel_subscription',
          playlistId: playlist.id,
          creatorUserId: playlist.userId,
          subscriberUserId: req.user.userId,
        },
      },
      success_url: `${fe}/playlist/${playlist.slug}?subscribed=1`,
      cancel_url: `${fe}/playlist/${playlist.slug}?cancelled=1`,
      metadata: {
        kind: 'channel_subscription',
        playlistId: playlist.id,
        creatorUserId: playlist.userId,
        subscriberUserId: req.user.userId,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Subscribe to playlist error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

/** Webhook: a fan completed checkout for a paid playlist. */
export async function handleChannelSubCheckoutCompleted(session: any) {
  if (!session.subscription) return;
  const meta = session.metadata || {};
  const playlistId: string | undefined = meta.playlistId;
  const creatorUserId: string | undefined = meta.creatorUserId;
  const subscriberUserId: string | undefined = meta.subscriberUserId;
  if (!playlistId || !creatorUserId || !subscriberUserId) {
    logger.warn('channel_subscription checkout missing metadata', { sessionId: session.id });
    return;
  }

  const s = getStripe();
  let stripeSub: any = null;
  let amountCents = 0;
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  if (s) {
    try {
      stripeSub = await s.subscriptions.retrieve(session.subscription);
      amountCents = stripeSub.items?.data?.[0]?.price?.unit_amount || 0;
      if (typeof stripeSub.current_period_start === 'number') {
        periodStart = new Date(stripeSub.current_period_start * 1000);
      }
      if (typeof stripeSub.current_period_end === 'number') {
        periodEnd = new Date(stripeSub.current_period_end * 1000);
      }
    } catch (err) {
      logger.warn('Failed to retrieve Stripe channel subscription', {
        subId: session.subscription,
        error: (err as Error).message,
      });
    }
  }

  await prisma.channelSubscription.upsert({
    where: {
      subscriberUserId_playlistId: { subscriberUserId, playlistId },
    },
    update: {
      status: 'ACTIVE',
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    create: {
      subscriberUserId,
      creatorUserId,
      playlistId,
      amountCents,
      platformFeeBps: platformFeeBps(),
      currency: 'usd',
      status: 'ACTIVE',
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  // Referral earnings are now credited per-invoice in
  // handleChannelSubInvoicePaid (one row per Stripe invoice id), which
  // covers both the kickoff invoice and every renewal. Crediting here
  // would double-pay the first month.

  // Notify creator.
  const fan = await prisma.user.findUnique({
    where: { id: subscriberUserId },
    select: { displayName: true, username: true },
  });
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { title: true, slug: true },
  });
  await createNotification({
    userId: creatorUserId,
    type: 'SYSTEM',
    title: 'New channel subscriber',
    message: `${fan?.displayName || fan?.username || 'Someone'} subscribed to "${playlist?.title || 'your playlist'}"`,
    data: {
      kind: 'channel_subscription',
      playlistId,
      playlistSlug: playlist?.slug,
      subscriberUserId,
    },
  });
}

export async function handleChannelSubUpdated(stripeSub: any) {
  const sub = await prisma.channelSubscription.findUnique({
    where: { stripeSubscriptionId: stripeSub.id },
  });
  if (!sub) return; // not a channel sub — let other handlers try
  await prisma.channelSubscription.update({
    where: { id: sub.id },
    data: {
      currentPeriodStart:
        typeof stripeSub.current_period_start === 'number'
          ? new Date(stripeSub.current_period_start * 1000)
          : sub.currentPeriodStart,
      currentPeriodEnd:
        typeof stripeSub.current_period_end === 'number'
          ? new Date(stripeSub.current_period_end * 1000)
          : sub.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
      status:
        stripeSub.status === 'past_due'
          ? 'PAST_DUE'
          : stripeSub.status === 'canceled'
            ? 'CANCELLED'
            : sub.status,
    },
  });
}

export async function handleChannelSubDeleted(stripeSub: any) {
  const sub = await prisma.channelSubscription.findUnique({
    where: { stripeSubscriptionId: stripeSub.id },
  });
  if (!sub) return;
  await prisma.channelSubscription.update({
    where: { id: sub.id },
    data: { status: 'EXPIRED' },
  });
}

// Stripe invoice.payment_succeeded for a channel subscription invoice.
// Credits the referrer once per invoice. The unique constraint on
// ReferralEarning(source, sourceId, referrerId) guarantees exactly-once
// credit even on Stripe webhook retries that escape the WebhookEvent
// dedup (e.g. across DB resets).
export async function handleChannelSubInvoicePaid(invoice: any): Promise<void> {
  if (!invoice?.subscription) return;
  const sub = await prisma.channelSubscription.findUnique({
    where: { stripeSubscriptionId: invoice.subscription },
  });
  if (!sub) return;
  // Restore from PAST_DUE if the renewal succeeds.
  if (sub.status === 'PAST_DUE') {
    await prisma.channelSubscription.update({
      where: { id: sub.id },
      data: { status: 'ACTIVE' },
    });
  }
  const amountCents: number =
    typeof invoice.amount_paid === 'number' ? invoice.amount_paid : sub.amountCents;
  if (amountCents <= 0) return;
  const netCents = Math.floor((amountCents * (10000 - sub.platformFeeBps)) / 10000);
  if (netCents <= 0) return;
  try {
    const { recordReferralEarning } = await import('./referralController');
    await recordReferralEarning({
      refereeId: sub.creatorUserId,
      amountCents: netCents,
      source: 'channel_sub',
      sourceId: typeof invoice.id === 'string' ? invoice.id : `sub:${sub.id}`,
    });
  } catch (err) {
    logger.warn('Channel-sub invoice referral failed', {
      invoiceId: invoice.id,
      error: (err as Error).message,
    });
  }
}

/** Cancel a channel sub at end of current period. */
export const cancelChannelSubscription = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const subscriptionId = req.params.id as string;
    const sub = await prisma.channelSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    if (sub.subscriberUserId !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const s = stripe();
    if (s && sub.stripeSubscriptionId) {
      await s.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
    await prisma.channelSubscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
    res.json({ message: 'Subscription will end at the end of the billing period' });
  } catch (error) {
    logger.error('Cancel channel subscription error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

/** List subscriptions where I'm the fan. */
export const getMyChannelSubscriptions = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const subs = await prisma.channelSubscription.findMany({
      where: { subscriberUserId: req.user.userId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      include: {
        playlist: {
          select: { id: true, title: true, slug: true, coverArt: true, monthlyPriceCents: true },
        },
        creator: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ subscriptions: subs });
  } catch (error) {
    logger.error('Get my channel subscriptions error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
};

/** List subscriptions to my playlists (i.e. my fans). */
export const getCreatorSubscribers = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const subs = await prisma.channelSubscription.findMany({
      where: { creatorUserId: req.user.userId },
      include: {
        playlist: { select: { id: true, title: true, slug: true } },
        subscriber: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const totalNetCents = subs
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + Math.floor((s.amountCents * (10000 - s.platformFeeBps)) / 10000), 0);
    res.json({ subscribers: subs, monthlyRecurringNetCents: totalNetCents });
  } catch (error) {
    logger.error('Get creator subscribers error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
};
