import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { pollStemsJob, startStemsJob, StemProviderUnavailable, STEM_PROVIDER_ID } from '../utils/stems';
import { getStripe, frontendUrl } from '../utils/stripeClient';

// Flat platform fee the owner pays before we run a stem job. Covers Replicate
// compute (~$0.02/track on htdemucs) plus margin.
export const STEM_GENERATION_FEE_CENTS = 299;

// Owner-initiated retry for a previously paid generation that ended FAILED.
// New generations must go through createStemsGenerationCheckout — we never
// run a Replicate job without a successful charge on file. The check that
// gates this is `existing.paidAt` + `status === 'FAILED'`.
export const requestStems = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can request stems' });
      return;
    }

    const existing = await prisma.trackStems.findUnique({ where: { trackId } });
    if (existing && existing.status !== 'FAILED') {
      res.json({ stems: existing });
      return;
    }
    if (!existing || !existing.paidAt) {
      res.status(402).json({ error: 'Payment required — start a generation via /stems/checkout' });
      return;
    }

    try {
      const job = await startStemsJob(track.audioUrl);
      const stems = await prisma.trackStems.update({
        where: { trackId },
        data: {
          status: 'PROCESSING',
          provider: STEM_PROVIDER_ID,
          providerJobId: job.jobId,
          errorMessage: null,
        },
      });
      res.status(202).json({ stems });
    } catch (err) {
      if (err instanceof StemProviderUnavailable) {
        res.status(503).json({ error: 'Stem separation is not yet available' });
        return;
      }
      throw err;
    }
  } catch (error) {
    logger.error('requestStems error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to request stems' });
  }
};

// Create a Stripe Checkout session for a one-shot stem generation. Direct
// platform charge — no Connect transfer, no application_fee_amount. The
// webhook (kind=stems_generation) is what actually kicks off the Replicate
// job; we never run compute before payment lands.
export const createStemsGenerationCheckout = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Payments are not configured' });
      return;
    }
    const trackId = req.params.trackId as string;
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can generate stems' });
      return;
    }
    if (track.takedownStatus) {
      res.status(409).json({ error: 'Track has an open takedown' });
      return;
    }

    const existing = await prisma.trackStems.findUnique({ where: { trackId } });
    if (existing && existing.status !== 'FAILED') {
      res.status(409).json({ error: 'Stems already generated or in progress', stems: existing });
      return;
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Stem separation: ${track.title}`,
                description: 'AI-powered split into drums, bass, vocals, and other stems.',
              },
              unit_amount: STEM_GENERATION_FEE_CENTS,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            kind: 'stems_generation',
            trackId: track.id,
            ownerUserId: req.user.userId,
          },
        },
        metadata: {
          kind: 'stems_generation',
          trackId: track.id,
          ownerUserId: req.user.userId,
        },
        success_url: `${frontendUrl()}/track/${track.slug}?stems=processing`,
        cancel_url: `${frontendUrl()}/track/${track.slug}?stems=cancelled`,
      });
    } catch (err) {
      logger.error('Stems checkout creation failed', { error: (err as Error).message });
      res.status(502).json({ error: 'Failed to create checkout session' });
      return;
    }

    // Pre-create the TrackStems row in PENDING with the session id. The
    // webhook upgrades it to PROCESSING after payment lands. Using upsert
    // because a prior FAILED row may still exist for this trackId.
    await prisma.trackStems.upsert({
      where: { trackId },
      create: {
        trackId,
        status: 'PENDING',
        stripeCheckoutSessionId: session.id,
      },
      update: {
        status: 'PENDING',
        stripeCheckoutSessionId: session.id,
        errorMessage: null,
        providerJobId: null,
      },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    logger.error('createStemsGenerationCheckout error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start checkout' });
  }
};

// Webhook callback: Stripe confirmed the generation fee was paid. Mark the
// row as paid and start the Replicate job. Idempotent on stripeCheckoutSessionId.
export async function handleStemsGenerationCheckoutCompleted(session: any) {
  const sessionId: string = session.id;
  const trackId: string | undefined = session.metadata?.trackId;
  if (!trackId) {
    logger.warn('stems_generation webhook missing trackId', { sessionId });
    return;
  }
  const stems = await prisma.trackStems.findUnique({ where: { trackId } });
  if (!stems || stems.stripeCheckoutSessionId !== sessionId) {
    logger.warn('stems_generation webhook: no matching TrackStems row', { sessionId, trackId });
    return;
  }
  if (stems.paidAt) return; // already processed

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { audioUrl: true },
  });
  if (!track) {
    logger.warn('stems_generation webhook: track gone', { sessionId, trackId });
    return;
  }

  // Mark paid first so a Replicate failure doesn't lose the payment record —
  // requestStems can then retry the job for free.
  const amountCents =
    typeof session.amount_total === 'number'
      ? session.amount_total
      : STEM_GENERATION_FEE_CENTS;
  await prisma.trackStems.update({
    where: { trackId },
    data: {
      paidAt: new Date(),
      paidAmountCents: amountCents,
    },
  });

  try {
    const job = await startStemsJob(track.audioUrl);
    await prisma.trackStems.update({
      where: { trackId },
      data: {
        status: 'PROCESSING',
        provider: STEM_PROVIDER_ID,
        providerJobId: job.jobId,
        errorMessage: null,
      },
    });
  } catch (err) {
    const msg = err instanceof StemProviderUnavailable ? 'Stem provider not configured' : (err as Error).message;
    logger.error('stems_generation: Replicate start failed', { trackId, error: msg });
    await prisma.trackStems.update({
      where: { trackId },
      data: { status: 'FAILED', errorMessage: msg },
    });
  }
}

// Poll status and, when the upstream is done, persist the four stem URLs.
export const getStems = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const stems = await prisma.trackStems.findUnique({ where: { trackId } });
    if (!stems) {
      res.status(404).json({ error: 'No stems for this track' });
      return;
    }
    if (stems.status === 'PROCESSING' && stems.providerJobId) {
      try {
        const result = await pollStemsJob(stems.providerJobId);
        if (result.status === 'succeeded' && result.output) {
          const updated = await prisma.trackStems.update({
            where: { trackId },
            data: {
              status: 'READY',
              drumsUrl: result.output.drums || null,
              bassUrl: result.output.bass || null,
              vocalsUrl: result.output.vocals || null,
              otherUrl: result.output.other || null,
            },
          });
          res.json({ stems: updated });
          return;
        }
        if (result.status === 'failed' || result.status === 'canceled') {
          await prisma.trackStems.update({
            where: { trackId },
            data: {
              status: 'FAILED',
              errorMessage: result.error || 'Stem job failed',
            },
          });
        }
      } catch (err) {
        logger.warn('Stems poll failed', { trackId, error: (err as Error).message });
      }
    }
    res.json({ stems });
  } catch (error) {
    logger.error('getStems error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get stems' });
  }
};

// Owner sets a price (cents) so the stems become available as a paid bundle.
// Pass 0 / null to take stems off sale. The full purchase flow lives in the
// sync-licensing controller; this just toggles availability.
export const setStemsPrice = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const { priceCents } = req.body || {};
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track || track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can set stems price' });
      return;
    }
    const cents = typeof priceCents === 'number' && priceCents > 0 ? Math.floor(priceCents) : null;
    const stems = await prisma.trackStems.upsert({
      where: { trackId },
      create: { trackId, status: 'PENDING', forSaleCents: cents },
      update: { forSaleCents: cents },
    });
    res.json({ stems });
  } catch (error) {
    logger.error('setStemsPrice error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update stems price' });
  }
};
