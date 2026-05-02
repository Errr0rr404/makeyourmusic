// Voice cloning — paid Premium feature.
//
// Flow:
//   1. POST /api/voice-clones/checkout      — Stripe Checkout for the one-time
//      voice-clone fee (configurable). Returns checkoutUrl. The session metadata
//      kind='voice_clone' routes the webhook to handleVoiceCloneCheckoutCompleted.
//   2. After payment, the user uploads a 30s reference audio (Cloudinary URL)
//      and POSTs to /api/voice-clones with { name, referenceUrl, sessionId }.
//   3. We provision the voice with the configured provider (default: ElevenLabs),
//      store the providerVoiceId, mark READY.
//   4. The clone can then be selected on /create as the singing voice for any
//      generation (sets MusicGeneration.voiceCloneId).
//
// Until a concrete provider integration is implemented, checkout is disabled
// so users are never charged for a clone that cannot be provisioned.

import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { getStripe, frontendUrl } from '../utils/stripeClient';

const VOICE_CLONE_PRICE_CENTS = parseInt(process.env.VOICE_CLONE_PRICE_CENTS || '299', 10);
const VOICE_CLONE_CURRENCY = (process.env.VOICE_CLONE_CURRENCY || 'usd').toLowerCase();

function hasProvider(): boolean {
  return false;
}

async function provisionWithProvider(referenceUrl: string, name: string): Promise<string | null> {
  // Real provider call goes here — different per vendor (ElevenLabs PVC,
  // Coqui XTTS, etc.). The shape we care about is "give me back a stable
  // voice id that future generation calls can reference". Until that code is
  // implemented, hasProvider() keeps checkout/create disabled.
  if (!hasProvider()) return null;

  // ElevenLabs reference-shape — we'd POST { name, files: [referenceUrl] } to
  // /v1/voices/add. This is a stub that lights up the call site without
  // making an actual network call until the integration is finalized.
  logger.info('voice clone: provisioning request', { name, referenceUrl });
  return null;
}

// POST /api/voice-clones/checkout — kicks off Stripe Checkout for the
// one-time voice-clone fee. Auth required.
export const startVoiceCloneCheckout = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Payments not configured' });
      return;
    }
    if (!hasProvider()) {
      res.status(503).json({ error: 'Voice cloning is not configured yet' });
      return;
    }

    // Premium-or-better gate. We surface voice cloning as a Premium-tier perk;
    // free-tier users can preview the UX but can't actually pay+train.
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
      select: { tier: true, status: true },
    });
    const isPremium = sub?.status === 'ACTIVE' && sub?.tier !== 'FREE';
    if (!isPremium) {
      res.status(403).json({ error: 'Voice cloning is a Premium feature.' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: VOICE_CLONE_CURRENCY,
            product_data: { name: 'Voice clone — one-time training fee' },
            unit_amount: VOICE_CLONE_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          kind: 'voice_clone',
          userId: req.user.userId,
        },
      },
      metadata: {
        kind: 'voice_clone',
        userId: req.user.userId,
      },
      success_url: `${frontendUrl()}/settings?voiceClone=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/settings?voiceClone=canceled`,
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    logger.error('startVoiceCloneCheckout error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start voice-clone checkout' });
  }
};

// POST /api/voice-clones — after payment success the client uploads the
// reference audio to Cloudinary, then POSTs here with the URL + Stripe
// session id to materialize the clone row.
//
// Body: { name, referenceUrl, sessionId }
export const createVoiceClone = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { name, referenceUrl, sessionId } = req.body || {};
    if (!hasProvider()) {
      res.status(503).json({ error: 'Voice cloning is not configured yet' });
      return;
    }
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (typeof referenceUrl !== 'string' || !referenceUrl.startsWith('https://')) {
      res.status(400).json({ error: 'referenceUrl is required (https URL)' });
      return;
    }
    if (typeof sessionId !== 'string' || !sessionId) {
      res.status(400).json({ error: 'sessionId from successful Stripe Checkout is required' });
      return;
    }

    // Verify the session is paid + belongs to this user.
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Payments not configured' });
      return;
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
    if (!session) {
      res.status(404).json({ error: 'Checkout session not found' });
      return;
    }
    if (session.metadata?.kind !== 'voice_clone' || session.metadata?.userId !== req.user.userId) {
      res.status(403).json({ error: 'Session does not belong to this user' });
      return;
    }
    if (session.payment_status !== 'paid') {
      res.status(402).json({ error: 'Payment is not yet completed' });
      return;
    }

    // Idempotency: don't double-create if the user retries.
    const existing = await prisma.voiceClone.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
    });
    if (existing) {
      res.json({ voiceClone: existing });
      return;
    }

    const clone = await prisma.voiceClone.create({
      data: {
        userId: req.user.userId,
        name: name.slice(0, 80),
        referenceUrl,
        provider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'manual',
        status: 'PENDING',
        stripeCheckoutSessionId: sessionId,
        paidAmountCents: VOICE_CLONE_PRICE_CENTS,
        paidAt: new Date(),
      },
    });

    // Best-effort provider provisioning. Failures leave the row PENDING for
    // an admin to retry; we don't roll back the payment because the user
    // genuinely paid.
    void (async () => {
      try {
        const providerVoiceId = await provisionWithProvider(referenceUrl, name);
        if (providerVoiceId) {
          await prisma.voiceClone.update({
            where: { id: clone.id },
            data: { providerVoiceId, status: 'READY' },
          });
        }
      } catch (err) {
        logger.warn('voice clone provider provision failed', {
          cloneId: clone.id,
          error: (err as Error).message,
        });
        await prisma.voiceClone.update({
          where: { id: clone.id },
          data: { status: 'FAILED', errorMessage: (err as Error).message.slice(0, 500) },
        }).catch(() => undefined);
      }
    })();

    res.status(201).json({ voiceClone: clone });
  } catch (error) {
    logger.error('createVoiceClone error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to register voice clone' });
  }
};

// GET /api/voice-clones — list the requester's voice clones.
export const listMyVoiceClones = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const clones = await prisma.voiceClone.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        status: true,
        provider: true,
        referenceUrl: true,
        createdAt: true,
      },
    });
    res.json({ clones });
  } catch (error) {
    logger.error('listMyVoiceClones error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list voice clones' });
  }
};

// DELETE /api/voice-clones/:id — owner-only soft delete (we just remove the row;
// any in-flight generation will surface an error if it tried to use it).
export const deleteVoiceClone = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const clone = await prisma.voiceClone.findUnique({ where: { id } });
    if (!clone || clone.userId !== req.user.userId) {
      res.status(404).json({ error: 'Voice clone not found' });
      return;
    }
    await prisma.voiceClone.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    logger.error('deleteVoiceClone error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete voice clone' });
  }
};

// Webhook handler — Stripe checkout.session.completed for kind=voice_clone.
// Mirrors the marketplace pattern: we don't actually need to do anything here
// since the client polls /sessions/:id and POSTs to /voice-clones once the
// payment lands. But we log the event for audit and create a SYSTEM
// notification so the user can find their way back.
export async function handleVoiceCloneCheckoutCompleted(session: {
  id: string;
  metadata?: { userId?: string };
  payment_status?: string;
}): Promise<void> {
  try {
    const userId = session.metadata?.userId;
    if (!userId) {
      logger.warn('voice clone webhook missing userId', { sessionId: session.id });
      return;
    }
    const { createNotification } = await import('../utils/notifications');
    await createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Voice clone paid — finish the upload',
      message: 'Your voice-clone payment is confirmed. Upload your 30s reference clip to start training.',
      data: { sessionId: session.id, kind: 'voice_clone' },
    });
  } catch (err) {
    logger.error('handleVoiceCloneCheckoutCompleted', { error: (err as Error).message });
  }
}
