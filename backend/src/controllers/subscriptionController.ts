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
} from './channelSubController';
import { syncConnectAccount } from './connectController';
import { handleSyncLicenseCheckoutCompleted } from './licenseWebhook';

const stripe = () => getStripe();

const PRICE_IDS: Record<'CREATOR' | 'PREMIUM', string> = {
  CREATOR: process.env.STRIPE_CREATOR_PRICE_ID || 'price_creator_placeholder',
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_placeholder',
};

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
    const priceId = PRICE_IDS[tier];

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
    const isProduction = process.env.NODE_ENV === 'production';

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
    } else if (isProduction) {
      logger.error('Stripe webhook received without signature in production', {
        hasSecret: Boolean(endpointSecret),
        hasSig: Boolean(sig),
      });
      res.status(400).json({ error: 'Webhook signature required in production' }); return;
    } else {
      event = req.body;
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
        // Default: platform subscription (legacy sessions also land here).
        await handlePlatformCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const kind: string = sub.metadata?.kind || '';
        if (kind === 'channel_subscription') {
          await handleChannelSubUpdated(sub);
          break;
        }
        // Try platform first.
        const platformSub = await prisma.subscription.findUnique({
          where: { stripeSubId: sub.id },
        });
        if (platformSub) {
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
              status: sub.status === 'past_due' ? 'PAST_DUE' : platformSub.status,
            },
          });
        } else {
          // Fallback: maybe a channel sub without metadata.kind set.
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
            data: { tier: 'FREE', status: 'EXPIRED', stripeSubId: null },
          });
        } else {
          await handleChannelSubDeleted(sub);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          // Try platform sub first.
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
        await handleTipPaymentFailed(event.data.object);
        break;
      }

      case 'charge.refunded': {
        await handleTipRefunded(event.data.object);
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
  const requestedTier = (session.metadata?.tier as string)?.toUpperCase();
  const tier = requestedTier === 'CREATOR' ? 'CREATOR' : 'PREMIUM';

  const s = getStripe();
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  if (session.subscription && s) {
    try {
      const sub = await s.subscriptions.retrieve(session.subscription);
      if (typeof sub.current_period_start === 'number') {
        periodStart = new Date(sub.current_period_start * 1000);
      }
      if (typeof sub.current_period_end === 'number') {
        periodEnd = new Date(sub.current_period_end * 1000);
      }
    } catch (err) {
      logger.warn('Failed to retrieve Stripe subscription for period dates', {
        sessionId: session.id,
        subId: session.subscription,
        error: (err as Error).message,
      });
    }
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      tier,
      status: 'ACTIVE',
      stripeSubId: session.subscription,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    create: {
      userId,
      tier,
      status: 'ACTIVE',
      stripeSubId: session.subscription,
      stripeCustomerId: session.customer,
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

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

    res.json({ earnings, totalEarnings });
  } catch (error) {
    logger.error('Get agent earnings error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get earnings' });
  }
};
