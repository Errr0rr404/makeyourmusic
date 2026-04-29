import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// Stripe integration will use real Stripe SDK when STRIPE_SECRET_KEY is configured
let stripe: any = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch (err) {
  logger.error('Failed to initialize Stripe SDK', { error: (err as Error).message });
}

// In production, refuse to even boot if Stripe is configured but the webhook
// secret is missing — silently accepting unsigned webhooks would let anyone
// upgrade themselves to PREMIUM by POSTing to /api/subscription/webhook.
if (
  process.env.NODE_ENV === 'production' &&
  process.env.STRIPE_SECRET_KEY &&
  !process.env.STRIPE_WEBHOOK_SECRET
) {
  logger.error(
    'STRIPE_WEBHOOK_SECRET is required in production when STRIPE_SECRET_KEY is set. ' +
      'Refusing to start to prevent webhook forgery.'
  );
  // Don't throw at import time — let server.ts startup validation handle it,
  // but mark stripe unusable so checkout/cancel return 503 cleanly.
  stripe = null;
}

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_placeholder';

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

    if (!stripe) {
      res.status(503).json({ error: 'Payment system not configured' }); return;
    }

    // Get or create Stripe customer
    let subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      const customer = await stripe.customers.create({
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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      success_url: `${frontendUrl}/library?upgraded=true`,
      cancel_url: `${frontendUrl}/library`,
      metadata: { userId: req.user.userId },
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

    if (stripe) {
      await stripe.subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });
    }

    await prisma.subscription.update({
      where: { userId: req.user.userId },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Subscription will be cancelled at end of billing period' });
  } catch (error) {
    logger.error('Cancel subscription error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

export const handleWebhook = async (req: RequestWithUser, res: Response) => {
  try {
    if (!stripe) { res.status(200).json({ received: true }); return; }

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    let event;
    if (endpointSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        logger.warn('Stripe webhook signature verification failed', {
          error: (err as Error).message,
        });
        res.status(400).json({ error: 'Webhook signature verification failed' }); return;
      }
    } else if (isProduction) {
      // Refuse unsigned webhooks in production — even if endpointSecret is unset.
      logger.error('Stripe webhook received without signature in production', {
        hasSecret: Boolean(endpointSecret),
        hasSig: Boolean(sig),
      });
      res.status(400).json({ error: 'Webhook signature required in production' }); return;
    } else {
      // Allow unsigned webhooks only in development
      event = req.body;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          await prisma.subscription.update({
            where: { userId },
            data: {
              tier: 'PREMIUM',
              status: 'ACTIVE',
              stripeSubId: session.subscription,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubId: sub.id },
        });
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { tier: 'FREE', status: 'EXPIRED', stripeSubId: null },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await prisma.subscription.findUnique({
            where: { stripeSubId: invoice.subscription },
          });
          if (subscription) {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { status: 'PAST_DUE' },
            });
          }
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

// Agent Earnings
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
