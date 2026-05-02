import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { getStripe, frontendUrl } from '../utils/stripeClient';
import {
  handleTipCheckoutCompleted,
  handleTipPaymentFailed,
  handleTipRefunded,
} from './tipController';
import {
  handleChannelSubCheckoutCompleted,
  handleChannelSubUpdated,
  handleChannelSubDeleted,
  handleChannelSubInvoicePaid,
} from './channelSubController';
import { syncConnectAccount } from './connectController';
import {
  handleSyncLicenseCheckoutCompleted,
  handleSyncLicensePaymentFailed,
  handleSyncLicenseRefunded,
} from './licenseWebhook';
import { handleStemsGenerationCheckoutCompleted } from './stemsController';
import { handleMarketplacePurchaseCompleted } from './marketplaceController';
import { handleVoiceCloneCheckoutCompleted } from './voiceCloneController';

const stripe = () => getStripe();

function subscriptionPriceId(tier: 'CREATOR' | 'PREMIUM'): string | null {
  const envKey = tier === 'CREATOR' ? 'STRIPE_CREATOR_PRICE_ID' : 'STRIPE_PREMIUM_PRICE_ID';
  const priceId = process.env[envKey];
  if (!priceId || priceId.includes('placeholder')) return null;
  return priceId;
}

export const getSubscription = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });

    res.json({ subscription: subscription || { tier: 'FREE', status: 'ACTIVE' } });
  } catch (error) {
    logger.error('Get subscription error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get subscription' });
  }
};

export const createCheckout = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const s = stripe();
    if (!s) { res.status(503).json({ error: 'Payment system not configured' }); return; }

    // Default to CREATOR — that's the new lead tier.
    const requested = (req.body?.tier as string)?.toUpperCase() || 'CREATOR';
    if (requested !== 'CREATOR' && requested !== 'PREMIUM') {
      res.status(400).json({ error: 'tier must be CREATOR or PREMIUM' });
      return;
    }
    const tier = requested as 'CREATOR' | 'PREMIUM';
    const priceId = subscriptionPriceId(tier);
    if (!priceId) {
      res.status(503).json({ error: `${tier} subscription checkout is not configured` });
      return;
    }

    let subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      const customer = await s.customers.create({
        email: user.email,
        metadata: { userId: req.user.userId },
      });
      customerId = customer.id;

      if (subscription) {
        await prisma.subscription.update({
          where: { userId: req.user.userId },
          data: { stripeCustomerId: customerId },
        });
      } else {
        await prisma.subscription.create({
          data: { userId: req.user.userId, stripeCustomerId: customerId, tier: 'FREE', status: 'ACTIVE' },
        });
      }
    }

    const fe = frontendUrl();
    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${fe}/library?upgraded=true`,
      cancel_url: `${fe}/library`,
      metadata: { kind: 'platform_subscription', userId: req.user.userId, tier },
      subscription_data: {
        metadata: { kind: 'platform_subscription', userId: req.user.userId, tier },
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Create checkout error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const cancelSubscription = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });

    if (!subscription || !subscription.stripeSubId) {
      res.status(400).json({ error: 'No active subscription' }); return;
    }

    const s = stripe();
    if (s) {
      await s.subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });
    }

    // Don't flip status to CANCELLED here — the user keeps PREMIUM/CREATOR
    // access until period end. Stripe fires `customer.subscription.deleted`
    // at period end; that handler downgrades them.
    res.json({ message: 'Subscription will be cancelled at end of billing period' });
  } catch (error) {
    logger.error('Cancel subscription error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

export const handleWebhook = async (req: RequestWithUser, res: Response) => {
  try {
    const s = stripe();
    if (!s) { res.status(200).json({ received: true }); return; }

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // Fail-closed: signature verification is non-negotiable in any environment
    // that is not explicitly local development. NODE_ENV is the source of
    // truth — anything other than the literal string 'development' must enforce
    // a signed body. Previously, a production deploy that forgot to set
    // NODE_ENV (and isn't on Railway) would silently fall through and accept
    // unsigned webhooks, allowing an attacker to mint platform subscriptions.
    const isLocalDev = process.env.NODE_ENV === 'development';

    let event;
    if (endpointSecret && sig) {
      try {
        event = s.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        logger.warn('Stripe webhook signature verification failed', {
          error: (err as Error).message,
        });
        res.status(400).json({ error: 'Webhook signature verification failed' }); return;
      }
    } else if (!isLocalDev) {
      logger.error('Stripe webhook received without signature', {
        hasSecret: Boolean(endpointSecret),
        hasSig: Boolean(sig),
        env: process.env.NODE_ENV,
      });
      res.status(400).json({ error: 'Webhook signature required' }); return;
    } else {
      // Local dev only — accept unsigned bodies for ease of stripe-cli replay.
      event = req.body;
    }

    // Idempotency: try to record the event id. If it already exists, Stripe
    // is replaying — return 200 and skip processing. This prevents
    // double-crediting referrals on retries.
    if (event?.id) {
      try {
        await prisma.webhookEvent.create({
          data: { stripeEventId: event.id, eventType: event.type || 'unknown' },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          logger.info('Stripe webhook duplicate, skipping', { eventId: event.id, type: event.type });
          res.json({ received: true, duplicate: true });
          return;
        }
        // Other DB errors are NOT safe to ignore — losing idempotency on a
        // transient blip means Stripe's retry runs the handler twice and
        // double-credits referrals / sends two notifications. Return 500 so
        // Stripe retries against a DB that's recovered.
        logger.error('Webhook idempotency record failed; returning 500 for retry', {
          error: (err as Error).message,
        });
        res.status(500).json({ error: 'Webhook idempotency check failed' });
        return;
      }
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const kind: string = session.metadata?.kind || '';

        if (kind === 'tip') {
          await handleTipCheckoutCompleted(session);
          break;
        }
        if (kind === 'channel_subscription') {
          await handleChannelSubCheckoutCompleted(session);
          break;
        }
        if (kind === 'sync_license' || kind === 'stem_purchase') {
          await handleSyncLicenseCheckoutCompleted(session);
          break;
        }
        if (kind === 'stems_generation') {
          await handleStemsGenerationCheckoutCompleted(session);
          break;
        }
        if (kind === 'marketplace_purchase') {
          await handleMarketplacePurchaseCompleted(session);
          break;
        }
        if (kind === 'voice_clone') {
          await handleVoiceCloneCheckoutCompleted(session);
          break;
        }
        if (kind === 'platform_subscription') {
          await handlePlatformCheckoutCompleted(session);
          break;
        }
        // Default: only legacy `mode === 'subscription'` sessions without a
        // kind are platform subscriptions. Refusing other modes (payment)
        // prevents a tip session with stripped metadata from accidentally
        // upgrading the tipper to PREMIUM.
        if (session.mode === 'subscription') {
          await handlePlatformCheckoutCompleted(session);
        } else {
          logger.warn('Unknown checkout.session.completed kind', {
            sessionId: session.id,
            mode: session.mode,
            kind,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const kind: string = sub.metadata?.kind || '';
        if (kind === 'channel_subscription') {
          await handleChannelSubUpdated(sub);
          break;
        }
        const platformSub = await prisma.subscription.findUnique({
          where: { stripeSubId: sub.id },
        });
        if (platformSub) {
          // Determine new status — Stripe statuses map to ours.
          const stripeStatus = sub.status as string | undefined;
          let newStatus = platformSub.status;
          if (stripeStatus === 'past_due') newStatus = 'PAST_DUE';
          else if (stripeStatus === 'canceled') newStatus = 'CANCELLED';
          else if (stripeStatus === 'active' || stripeStatus === 'trialing') newStatus = 'ACTIVE';
          await prisma.subscription.update({
            where: { id: platformSub.id },
            data: {
              currentPeriodStart:
                typeof sub.current_period_start === 'number'
                  ? new Date(sub.current_period_start * 1000)
                  : platformSub.currentPeriodStart,
              currentPeriodEnd:
                typeof sub.current_period_end === 'number'
                  ? new Date(sub.current_period_end * 1000)
                  : platformSub.currentPeriodEnd,
              cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
              status: newStatus,
            },
          });
        } else {
          // Not a platform sub — try channel sub.
          await handleChannelSubUpdated(sub);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const kind: string = sub.metadata?.kind || '';
        if (kind === 'channel_subscription') {
          await handleChannelSubDeleted(sub);
          break;
        }
        const platformSub = await prisma.subscription.findUnique({
          where: { stripeSubId: sub.id },
        });
        if (platformSub) {
          await prisma.subscription.update({
            where: { id: platformSub.id },
            data: { tier: 'FREE', status: 'EXPIRED', stripeSubId: null, cancelAtPeriodEnd: false },
          });
        } else {
          await handleChannelSubDeleted(sub);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          // Restore platform subs that were PAST_DUE.
          const platformSub = await prisma.subscription.findUnique({
            where: { stripeSubId: invoice.subscription },
          });
          if (platformSub) {
            if (platformSub.status === 'PAST_DUE') {
              await prisma.subscription.update({
                where: { id: platformSub.id },
                data: { status: 'ACTIVE' },
              });
            }
            break;
          }
          // Channel sub renewals: credit referrer once per invoice.
          await handleChannelSubInvoicePaid(invoice);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const platformSub = await prisma.subscription.findUnique({
            where: { stripeSubId: invoice.subscription },
          });
          if (platformSub) {
            await prisma.subscription.update({
              where: { id: platformSub.id },
              data: { status: 'PAST_DUE' },
            });
          } else {
            const channelSub = await prisma.channelSubscription.findUnique({
              where: { stripeSubscriptionId: invoice.subscription },
            });
            if (channelSub) {
              await prisma.channelSubscription.update({
                where: { id: channelSub.id },
                data: { status: 'PAST_DUE' },
              });
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const piKind = pi?.metadata?.kind || '';
        if (piKind === 'sync_license' || piKind === 'stem_purchase') {
          await handleSyncLicensePaymentFailed(pi);
        } else {
          // Default: tip (matches existing tip metadata.kind).
          await handleTipPaymentFailed(pi);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const chKind = charge?.metadata?.kind || '';
        if (chKind === 'sync_license' || chKind === 'stem_purchase') {
          await handleSyncLicenseRefunded(charge);
        } else if (chKind === 'tip') {
          await handleTipRefunded(charge);
        } else {
          // Unknown — try both handlers; each one is a no-op when its
          // payment_intent doesn't match.
          await handleTipRefunded(charge);
          await handleSyncLicenseRefunded(charge);
        }
        break;
      }

      case 'account.updated': {
        const acct = event.data.object;
        if (acct?.id) {
          await syncConnectAccount(acct.id);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error: (error as Error).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

async function handlePlatformCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  if (!userId) {
    logger.warn('checkout.session.completed missing metadata.userId', {
      sessionId: session.id,
    });
    return;
  }
  // Only accept literal CREATOR / PREMIUM in metadata. The previous
  // ternary defaulted to PREMIUM on any non-CREATOR value (including
  // missing/typo'd metadata), which silently UPGRADED users to a higher
  // tier than they paid for. Reject and log for follow-up reconciliation.
  const requestedTier = (session.metadata?.tier as string)?.toUpperCase();
  if (requestedTier !== 'CREATOR' && requestedTier !== 'PREMIUM') {
    logger.error('checkout.session.completed has missing/invalid tier metadata', {
      sessionId: session.id,
      requestedTier,
    });
    return;
  }
  const tier = requestedTier;

  const s = getStripe();
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  const stripeSubId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;
  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null;
  if (!stripeSubId) {
    logger.warn('platform checkout completed without subscription id', { sessionId: session.id });
    return;
  }
  if (stripeSubId && s) {
    try {
      const sub = await s.subscriptions.retrieve(stripeSubId);
      if (typeof sub.current_period_start === 'number') {
        periodStart = new Date(sub.current_period_start * 1000);
      }
      if (typeof sub.current_period_end === 'number') {
        periodEnd = new Date(sub.current_period_end * 1000);
      }
    } catch (err) {
      logger.warn('Failed to retrieve Stripe subscription for period dates', {
        sessionId: session.id,
        subId: stripeSubId,
        error: (err as Error).message,
      });
    }
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      tier,
      status: 'ACTIVE',
      stripeSubId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    create: {
      userId,
      tier,
      status: 'ACTIVE',
      stripeSubId,
      stripeCustomerId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
}

// Agent Earnings (legacy — kept for backward compat)
export const getAgentEarnings = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const agentId = req.params.agentId as string;

    const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    if (agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const earnings = await prisma.agentEarning.findMany({
      where: { agentId },
      orderBy: { period: 'desc' },
      take: 12,
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

    res.json({ earnings, totalEarnings });
  } catch (error) {
    logger.error('Get agent earnings error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get earnings' });
  }
};
