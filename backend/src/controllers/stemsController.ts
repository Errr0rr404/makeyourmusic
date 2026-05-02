import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { pollStemsJob, startStemsJob, StemProviderUnavailable, STEM_PROVIDER_ID } from '../utils/stems';
import { getStripe, frontendUrl } from '../utils/stripeClient';
import { buildStemsMixUrl, publicIdFromCloudinaryUrl, uploadAudio } from '../utils/cloudinary';

// Flat platform fee the owner pays before we run a stem job. Covers Replicate
// compute (~$0.02/track on htdemucs) plus margin.
export const STEM_GENERATION_FEE_CENTS = 299;
const MIN_STEMS_RESALE_PRICE_CENTS = 99;
const MAX_STEMS_RESALE_PRICE_CENTS = 100_000;

const STEM_PARTS = ['drums', 'bass', 'vocals', 'other'] as const;
type StemPart = typeof STEM_PARTS[number];

function serializeStemsForViewer(
  stems: {
    id: string;
    status: string;
    drumsUrl: string | null;
    bassUrl: string | null;
    vocalsUrl: string | null;
    otherUrl: string | null;
    forSaleCents: number | null;
    errorMessage: string | null;
    paidAt: Date | null;
  },
  options: { canAccessFiles: boolean; canSeeOwnerState: boolean },
) {
  return {
    id: stems.id,
    status: stems.status,
    drumsUrl: options.canAccessFiles ? stems.drumsUrl : null,
    bassUrl: options.canAccessFiles ? stems.bassUrl : null,
    vocalsUrl: options.canAccessFiles ? stems.vocalsUrl : null,
    otherUrl: options.canAccessFiles ? stems.otherUrl : null,
    forSaleCents: stems.forSaleCents,
    errorMessage: options.canSeeOwnerState ? stems.errorMessage : null,
    paidAt: options.canSeeOwnerState ? stems.paidAt : null,
    hasAccess: options.canAccessFiles,
  };
}
type StemOutput = Partial<Record<StemPart, string>>;

function hasCloudinaryCredentials(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function assertSafeStemOutputUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('stem provider returned a malformed URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('stem output URL must use https');
  }
  if (url.username || url.password) {
    throw new Error('stem output URL must not contain credentials');
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error(`refusing to fetch stem output from non-public host: ${hostname}`);
  }
  if (
    hostname !== 'replicate.delivery' &&
    !hostname.endsWith('.replicate.delivery') &&
    !hostname.endsWith('.cloudinary.com')
  ) {
    throw new Error(`refusing to fetch stem output from unapproved host: ${hostname}`);
  }
  return url;
}

async function downloadStemOutput(rawUrl: string): Promise<Buffer> {
  const safeUrl = assertSafeStemOutputUrl(rawUrl);
  const res = await fetch(safeUrl.toString(), {
    redirect: 'error',
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`failed to download stem output (${res.status})`);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length === 0) throw new Error('stem output download was empty');
  if (audio.length > 100 * 1024 * 1024) {
    throw new Error('stem output exceeds 100MB cap');
  }
  return audio;
}

async function persistStemOutputs(trackId: string, providerJobId: string, output: StemOutput): Promise<Record<StemPart, string>> {
  if (!hasCloudinaryCredentials()) {
    throw new Error('Cloudinary credentials are required to persist stems');
  }

  const missing = STEM_PARTS.filter((part) => !output[part]);
  if (missing.length > 0) {
    throw new Error(`stem provider output missing: ${missing.join(', ')}`);
  }

  const persisted = {} as Record<StemPart, string>;
  for (const part of STEM_PARTS) {
    const sourceUrl = output[part]!;
    const audio = await downloadStemOutput(sourceUrl);
    const uploaded = await uploadAudio(
      audio,
      `stem-${trackId}-${providerJobId}-${part}-${Date.now()}`
    );
    persisted[part] = uploaded.secure_url;
  }
  return persisted;
}

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

// Throttle in-line Replicate polling. Without this, every public GET on
// /tracks/:id/stems would fire an outbound paid Replicate request — a
// reflective DoS amplifier (anonymous attacker triggers our paid API).
// Each providerJobId is polled at most once per 10 seconds in-process; other
// concurrent callers see the cached row without poking Replicate.
const stemsPollCooldownMs = 10_000;
const stemsLastPolledAt = new Map<string, number>();

// Poll status and, when the upstream is done, persist the four stem files to
// Cloudinary before exposing them. Replicate output URLs are temporary; marking
// READY with those URLs would make future paid downloads fail.
export const getStems = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const stems = await prisma.trackStems.findUnique({ where: { trackId } });
    if (!stems) {
      res.status(404).json({ error: 'No stems for this track' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { agent: { select: { ownerId: true } } },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    const isOwner = track.agent?.ownerId === req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';
    let canAccessFiles = Boolean(isOwner || isAdmin);
    if (!canAccessFiles && req.user) {
      const purchase = await prisma.syncLicense.findFirst({
        where: {
          trackId,
          buyerId: req.user.userId,
          licenseTier: 'stems',
          status: 'PAID',
          OR: [
            { downloadExpiresAt: null },
            { downloadExpiresAt: { gt: new Date() } },
          ],
        },
        select: { id: true },
      });
      canAccessFiles = Boolean(purchase);
    }
    const canSeeOwnerState = Boolean(isOwner || isAdmin);

    // Only owners/admins trigger provider polling. Public callers only need
    // enough metadata to know whether stems are for sale, and should not be
    // able to drive paid provider/status requests.
    if (canSeeOwnerState && stems.status === 'PROCESSING' && stems.providerJobId) {
      const lastPolled = stemsLastPolledAt.get(stems.providerJobId) || 0;
      const now = Date.now();
      if (now - lastPolled < stemsPollCooldownMs) {
        res.json({ stems: serializeStemsForViewer(stems, { canAccessFiles, canSeeOwnerState }) });
        return;
      }
      stemsLastPolledAt.set(stems.providerJobId, now);
      try {
        const result = await pollStemsJob(stems.providerJobId);
        if (result.status === 'succeeded' && result.output) {
          let persisted: Record<StemPart, string>;
          try {
            persisted = await persistStemOutputs(trackId, stems.providerJobId, result.output);
          } catch (err) {
            throw new Error(`stem persistence failed: ${(err as Error).message}`);
          }
          const updated = await prisma.trackStems.update({
            where: { trackId },
            data: {
              status: 'READY',
              drumsUrl: persisted.drums,
              bassUrl: persisted.bass,
              vocalsUrl: persisted.vocals,
              otherUrl: persisted.other,
              errorMessage: null,
            },
          });
          res.json({
            stems: serializeStemsForViewer(updated, {
              canAccessFiles: true,
              canSeeOwnerState,
            }),
          });
          return;
        }
        if (result.status === 'failed' || result.status === 'canceled') {
          const failed = await prisma.trackStems.update({
            where: { trackId },
            data: {
              status: 'FAILED',
              errorMessage: result.error || 'Stem job failed',
            },
          });
          res.json({ stems: serializeStemsForViewer(failed, { canAccessFiles, canSeeOwnerState }) });
          return;
        }
      } catch (err) {
        const message = (err as Error).message;
        logger.warn('Stems poll or persistence failed', { trackId, error: message });
        if (message.startsWith('stem persistence failed:')) {
          const failed = await prisma.trackStems.update({
            where: { trackId },
            data: { status: 'FAILED', errorMessage: message },
          });
          res.json({ stems: serializeStemsForViewer(failed, { canAccessFiles, canSeeOwnerState }) });
          return;
        }
      }
    }
    res.json({ stems: serializeStemsForViewer(stems, { canAccessFiles, canSeeOwnerState }) });
  } catch (error) {
    logger.error('getStems error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get stems' });
  }
};

// POST /api/licenses/tracks/:trackId/stems/mix-export
// Server-side mix render. Body: { levels: { drums, bass, vocals, other }, mutes, solos }.
// Returns a Cloudinary URL (mp3) the client can stream or download. Owners
// always allowed; non-owners require a successful stems purchase (TODO once
// the buyer flow lands — for now we allow any authenticated track owner).
//
// We don't queue or persist anything: Cloudinary materializes the derived
// asset on first hit and CDN-caches it.
export const exportStemsMix = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const { levels = {}, mutes = [], solos = [] } = (req.body || {}) as {
      levels?: { drums?: number; bass?: number; vocals?: number; other?: number };
      mutes?: string[];
      solos?: string[];
    };

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } }, stems: true },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    const isOwner = track.agent?.ownerId === req.user.userId;
    if (!isOwner) {
      // TODO: also allow buyers when the marketplace stems-purchase flow lands.
      res.status(403).json({ error: 'Only the track owner can export a mix' });
      return;
    }
    if (!track.stems || track.stems.status !== 'READY') {
      res.status(409).json({ error: 'Stems are not ready yet' });
      return;
    }

    // Apply mute/solo logic before sending to the URL builder. If any solo
    // is set, only solo'd stems play (regardless of mutes); otherwise mutes
    // zero out the level.
    const partKeys: Array<'drums' | 'bass' | 'vocals' | 'other'> = ['drums', 'bass', 'vocals', 'other'];
    const soloSet = new Set(solos.filter((s) => partKeys.includes(s as 'drums')));
    const muteSet = new Set(mutes.filter((m) => partKeys.includes(m as 'drums')));
    const effectiveLevel = (key: 'drums' | 'bass' | 'vocals' | 'other'): number => {
      const raw = typeof levels[key] === 'number' ? Math.max(0, Math.min(150, levels[key]!)) : 100;
      if (soloSet.size > 0 && !soloSet.has(key)) return 0;
      if (muteSet.has(key)) return 0;
      return raw;
    };

    const drumsId = track.stems.drumsUrl ? publicIdFromCloudinaryUrl(track.stems.drumsUrl) : '';
    const bassId = track.stems.bassUrl ? publicIdFromCloudinaryUrl(track.stems.bassUrl) : '';
    const vocalsId = track.stems.vocalsUrl ? publicIdFromCloudinaryUrl(track.stems.vocalsUrl) : '';
    const otherId = track.stems.otherUrl ? publicIdFromCloudinaryUrl(track.stems.otherUrl) : '';

    if (!drumsId && !bassId && !vocalsId && !otherId) {
      res.status(409).json({
        error: 'Stems are stored on a non-Cloudinary host; server-side mix is unavailable. Use the in-browser exporter.',
      });
      return;
    }

    let mixUrl: string;
    try {
      mixUrl = buildStemsMixUrl({
        drumsPublicId: drumsId || undefined,
        bassPublicId: bassId || undefined,
        vocalsPublicId: vocalsId || undefined,
        otherPublicId: otherId || undefined,
        levels: {
          drums: effectiveLevel('drums'),
          bass: effectiveLevel('bass'),
          vocals: effectiveLevel('vocals'),
          other: effectiveLevel('other'),
        },
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }

    res.json({ url: mixUrl });
  } catch (error) {
    logger.error('exportStemsMix error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to export stems mix' });
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
    const existing = await prisma.trackStems.findUnique({ where: { trackId } });
    if (!existing || existing.status !== 'READY') {
      res.status(409).json({ error: 'Stems must be ready before setting a resale price' });
      return;
    }

    let cents: number | null = null;
    if (priceCents !== null && priceCents !== undefined && priceCents !== 0) {
      if (!Number.isInteger(priceCents)) {
        res.status(400).json({ error: 'priceCents must be an integer number of cents' });
        return;
      }
      if (priceCents < MIN_STEMS_RESALE_PRICE_CENTS || priceCents > MAX_STEMS_RESALE_PRICE_CENTS) {
        res.status(400).json({
          error: `priceCents must be between ${MIN_STEMS_RESALE_PRICE_CENTS} and ${MAX_STEMS_RESALE_PRICE_CENTS}`,
        });
        return;
      }
      cents = priceCents;
    }

    const stems = await prisma.trackStems.update({
      where: { trackId },
      data: { forSaleCents: cents },
    });
    res.json({ stems });
  } catch (error) {
    logger.error('setStemsPrice error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update stems price' });
  }
};
