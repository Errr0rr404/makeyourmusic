import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { getStripe, applyPlatformFee, frontendUrl } from '../utils/stripeClient';

const MIN_PRICE_CENTS = 500;       // $5
const MAX_PRICE_CENTS = 100_000;   // $1000

// ─── Owner controls: list / mark for sale ───────────────────

export const enableLicensing = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const { priceCents, currency } = req.body || {};
    const cents = parseInt(String(priceCents), 10);
    if (!Number.isFinite(cents) || cents < MIN_PRICE_CENTS || cents > MAX_PRICE_CENTS) {
      res.status(400).json({ error: `priceCents must be between ${MIN_PRICE_CENTS} and ${MAX_PRICE_CENTS}` });
      return;
    }
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    // Reject explicitly when track or its agent is missing — the previous
    // optional-chain made `track.agent?.ownerId !== userId` true for an
    // orphaned (agent === null) track even though the user clearly doesn't
    // own it, which is fine; but it also lets the 403 path leak the fact
    // that the track existed. Be explicit either way.
    if (!track || !track.agent || track.agent.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can enable licensing' });
      return;
    }
    if (track.takedownStatus) {
      res.status(409).json({ error: 'Track has an open takedown and cannot be licensed' });
      return;
    }
    const updated = await prisma.track.update({
      where: { id: trackId },
      data: {
        licenseable: true,
        licensePriceCents: cents,
        licenseCurrency: typeof currency === 'string' ? currency.toLowerCase() : 'usd',
      },
      select: { id: true, licenseable: true, licensePriceCents: true, licenseCurrency: true },
    });
    res.json({ track: updated });
  } catch (error) {
    logger.error('enableLicensing error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to enable licensing' });
  }
};

export const disableLicensing = async (req: RequestWithUser, res: Response) => {
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
    if (!track || track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can disable licensing' });
      return;
    }
    // Refuse to disable while a buyer's checkout session is mid-flight —
    // otherwise the buyer's webhook would still complete and create a PAID
    // license at a price the seller has just removed.
    const pendingCount = await prisma.syncLicense.count({
      where: { trackId, status: 'PENDING' },
    });
    if (pendingCount > 0) {
      res.status(409).json({
        error: 'A purchase is in progress for this track. Try again in a few minutes.',
      });
      return;
    }
    await prisma.track.update({
      where: { id: trackId },
      data: { licenseable: false },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('disableLicensing error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to disable licensing' });
  }
};

// ─── Buyer flow ─────────────────────────────────────────────

// Create a Stripe Checkout session for a sync license purchase. The
// resulting payment is split via Stripe Connect: platform takes
// PLATFORM_FEE_BPS, the rest is transferred to the agent owner's
// connected account. Auth required — see route mount.
export const startCheckout = async (req: RequestWithUser, res: Response) => {
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
    const { trackId, kind = 'sync', buyerEmail, buyerName, intendedUse } = req.body || {};
    if (kind !== 'sync' && kind !== 'stems') {
      res.status(400).json({ error: 'kind must be "sync" or "stems"' });
      return;
    }
    if (typeof trackId !== 'string' || trackId.length === 0) {
      res.status(400).json({ error: 'trackId is required' });
      return;
    }
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        agent: { select: { ownerId: true, name: true } },
        stems: true,
      },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (track.takedownStatus) {
      res.status(409).json({ error: 'Track has an open takedown and cannot be licensed' });
      return;
    }

    let priceCents: number;
    let label: string;
    if (kind === 'sync') {
      if (!track.licenseable || !track.licensePriceCents) {
        res.status(400).json({ error: 'This track is not available for licensing' });
        return;
      }
      priceCents = track.licensePriceCents;
      label = `Sync license: ${track.title}`;
    } else {
      if (!track.stems || track.stems.status !== 'READY' || !track.stems.forSaleCents) {
        res.status(400).json({ error: 'Stems are not available for purchase' });
        return;
      }
      priceCents = track.stems.forSaleCents;
      label = `Stem pack: ${track.title}`;
    }

    const owner = await prisma.user.findUnique({
      where: { id: track.agent!.ownerId },
      include: { connectAccount: true },
    });
    if (!owner?.connectAccount?.stripeAccountId || owner.connectAccount.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Track owner has not enabled payouts yet' });
      return;
    }

    const { fee, net } = applyPlatformFee(priceCents);
    const currency = track.licenseCurrency || 'usd';

    const license = await prisma.syncLicense.create({
      data: {
        trackId: track.id,
        amountCents: priceCents,
        platformFeeCents: fee,
        netCents: net,
        currency,
        licenseTier: kind === 'stems' ? 'stems' : 'standard',
        buyerId: req.user.userId,
        buyerEmail: typeof buyerEmail === 'string' ? buyerEmail.slice(0, 200) : null,
        buyerName: typeof buyerName === 'string' ? buyerName.slice(0, 200) : null,
        intendedUse: typeof intendedUse === 'string' ? intendedUse.slice(0, 1000) : null,
      },
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: typeof buyerEmail === 'string' ? buyerEmail : undefined,
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: label },
              unit_amount: priceCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: fee,
          transfer_data: { destination: owner.connectAccount.stripeAccountId },
          metadata: {
            kind: kind === 'stems' ? 'stem_purchase' : 'sync_license',
            trackId: track.id,
            licenseId: license.id,
          },
        },
        metadata: {
          kind: kind === 'stems' ? 'stem_purchase' : 'sync_license',
          trackId: track.id,
          licenseId: license.id,
        },
        success_url: `${frontendUrl()}/track/${track.slug}?license=pending&licenseId=${license.id}`,
        cancel_url: `${frontendUrl()}/track/${track.slug}?canceled=1`,
      });
    } catch (err) {
      await prisma.syncLicense.update({
        where: { id: license.id },
        data: { status: 'REVOKED' },
      }).catch(() => undefined);
      logger.error('Stripe checkout creation failed', { error: (err as Error).message });
      res.status(502).json({ error: 'Failed to create checkout session' });
      return;
    }

    // Persist the session id for recovery paths and admin tooling. The webhook
    // can still use metadata.licenseId if this update fails after Stripe
    // created the session, so do not strand the buyer by hiding the URL.
    try {
      await prisma.syncLicense.update({
        where: { id: license.id },
        data: {
          stripeCheckoutSessionId: session.id,
        },
      });
    } catch (err) {
      logger.warn('Failed to attach checkout session id to license', {
        licenseId: license.id,
        sessionId: session.id,
        error: (err as Error).message,
      });
    }

    res.json({ checkoutUrl: session.url, licenseId: license.id });
  } catch (error) {
    logger.error('startCheckout error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start checkout' });
  }
};

// Authenticated buyer/seller status endpoint used after Stripe redirects back
// to the track page. Paid downloads are returned directly from canonical DB
// state instead of requiring the UI to know an internal download token.
export const getLicense = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const license = await prisma.syncLicense.findUnique({
      where: { id: req.params.id as string },
      include: {
        track: {
          include: {
            stems: true,
            agent: { select: { ownerId: true } },
          },
        },
      },
    });
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    const isBuyer = license.buyerId === req.user.userId;
    const isOwner = license.track.agent?.ownerId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isBuyer && !isOwner && !isAdmin) {
      res.status(403).json({ error: 'Not allowed to view this license' });
      return;
    }

    const isPaid = license.status === 'PAID';
    const isExpired = Boolean(
      license.downloadExpiresAt && license.downloadExpiresAt.getTime() < Date.now()
    );
    let download: unknown = null;
    if (isPaid && !isExpired) {
      if (license.licenseTier === 'stems' && license.track.stems?.status === 'READY') {
        download = {
          kind: 'stems',
          files: {
            drums: license.track.stems.drumsUrl,
            bass: license.track.stems.bassUrl,
            vocals: license.track.stems.vocalsUrl,
            other: license.track.stems.otherUrl,
          },
        };
      } else if (license.licenseTier !== 'stems') {
        download = {
          kind: 'sync',
          audioUrl: license.track.audioUrl,
          licensePdfUrl: license.licensePdfUrl,
        };
      }
    }

    res.json({
      license: {
        id: license.id,
        status: license.status,
        kind: license.licenseTier === 'stems' ? 'stems' : 'sync',
        amountCents: license.amountCents,
        currency: license.currency,
        downloadExpiresAt: license.downloadExpiresAt,
        downloadExpired: isExpired,
        track: {
          id: license.track.id,
          title: license.track.title,
          slug: license.track.slug,
        },
        download,
      },
    });
  } catch (error) {
    logger.error('getLicense error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load license' });
  }
};

// Token-gated download. After successful payment the buyer hits this with
// the downloadToken issued at checkout — we serve them a redirect to the
// audio (and, for stems purchases, return all four stem URLs).
export const downloadLicensedFiles = async (req: RequestWithUser, res: Response) => {
  try {
    const token = req.params.token as string;
    const license = await prisma.syncLicense.findUnique({
      where: { downloadToken: token },
      include: { track: { include: { stems: true } } },
    });
    if (!license || license.status !== 'PAID') {
      res.status(404).json({ error: 'License not found or not paid' });
      return;
    }
    // Enforce the 24h download window from licenseWebhook. Without this, any
    // leaked token (e.g. via referer/log) gives an attacker permanent access
    // to the master files.
    if (license.downloadExpiresAt && license.downloadExpiresAt.getTime() < Date.now()) {
      res.status(410).json({ error: 'Download link expired' });
      return;
    }
    if (license.licenseTier === 'stems' && license.track.stems?.status === 'READY') {
      res.json({
        kind: 'stems',
        files: {
          drums: license.track.stems.drumsUrl,
          bass: license.track.stems.bassUrl,
          vocals: license.track.stems.vocalsUrl,
          other: license.track.stems.otherUrl,
        },
      });
      return;
    }
    res.json({
      kind: 'sync',
      audioUrl: license.track.audioUrl,
      licensePdfUrl: license.licensePdfUrl,
    });
  } catch (error) {
    logger.error('downloadLicensedFiles error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to fetch download' });
  }
};

// Public listing of licenseable catalog. Useful as a marketing page for
// indie filmmakers / podcasters.
export const browseLicenseable = async (req: RequestWithUser, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);
    const tracks = await prisma.track.findMany({
      where: {
        isPublic: true,
        status: 'ACTIVE',
        takedownStatus: null,
        licenseable: true,
      },
      orderBy: [{ trendingScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        coverArt: true,
        duration: true,
        mood: true,
        bpm: true,
        licensePriceCents: true,
        licenseCurrency: true,
        agent: { select: { name: true, slug: true } },
        genre: { select: { name: true, slug: true } },
      },
    });
    res.json({ tracks });
  } catch (error) {
    logger.error('browseLicenseable error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load licensing catalog' });
  }
};
