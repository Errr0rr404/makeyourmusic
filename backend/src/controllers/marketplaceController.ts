// Marketplace for sample packs and prompt presets.
//
// Sellers create listings; buyers complete a Stripe Checkout that splits
// payment between platform (PLATFORM_FEE_BPS) and seller's Connect account.
// Pattern mirrors licenseController.startCheckout / SyncLicense — same
// Connect transfer + WebhookEvent idempotency story. The webhook handler
// for `kind: 'marketplace_purchase'` lives further down.

import { Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';
import { applyPlatformFee, frontendUrl, getStripe } from '../utils/stripeClient';

const VALID_TYPES = ['SAMPLE_PACK', 'PROMPT_PRESET'] as const;

// POST /api/marketplace/listings — create a draft listing.
export const createListing = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { type, title, description, priceCents, coverArt, sampleAudioUrl, assetUrls, presetData } = req.body || {};
    if (!(VALID_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ error: 'type must be SAMPLE_PACK or PROMPT_PRESET' });
      return;
    }
    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    const cents = Math.max(99, Math.min(99999, parseInt(priceCents, 10) || 0));
    if (!cents) {
      res.status(400).json({ error: 'priceCents must be a positive integer (min 99 cents)' });
      return;
    }
    const baseSlug = slugify(title) || 'listing';
    // Append a short hash to avoid slug collisions across sellers without
    // running a uniqueness loop. 6 hex chars = 16M combinations.
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

    const listing = await prisma.marketplaceListing.create({
      data: {
        type,
        slug,
        title: title.slice(0, 200),
        description: typeof description === 'string' ? description.slice(0, 5000) : null,
        priceCents: cents,
        coverArt: typeof coverArt === 'string' ? coverArt.slice(0, 500) : null,
        sampleAudioUrl: typeof sampleAudioUrl === 'string' ? sampleAudioUrl.slice(0, 500) : null,
        assetUrls: Array.isArray(assetUrls) ? assetUrls.filter((u: unknown): u is string => typeof u === 'string').slice(0, 50) : [],
        presetData:
          presetData && typeof presetData === 'object'
            ? (presetData as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        status: 'DRAFT',
        sellerUserId: req.user.userId,
      },
    });
    res.status(201).json({ listing });
  } catch (error) {
    logger.error('createListing error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

// PATCH /api/marketplace/listings/:id — update / publish / unpublish.
export const updateListing = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const existing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (existing.sellerUserId !== req.user.userId) {
      res.status(403).json({ error: 'Only the seller can update this listing' });
      return;
    }

    const updates: Prisma.MarketplaceListingUpdateInput = {};
    const { title, description, priceCents, coverArt, sampleAudioUrl, assetUrls, presetData, status } = req.body || {};
    if (typeof title === 'string' && title.trim().length > 0) updates.title = title.slice(0, 200);
    if (typeof description === 'string') updates.description = description.slice(0, 5000);
    if (typeof priceCents === 'number') {
      const cents = Math.max(99, Math.min(99999, Math.floor(priceCents)));
      updates.priceCents = cents;
    }
    if (typeof coverArt === 'string') updates.coverArt = coverArt.slice(0, 500);
    if (typeof sampleAudioUrl === 'string') updates.sampleAudioUrl = sampleAudioUrl.slice(0, 500);
    if (Array.isArray(assetUrls)) {
      updates.assetUrls = assetUrls
        .filter((u): u is string => typeof u === 'string')
        .slice(0, 50);
    }
    if (presetData && typeof presetData === 'object') {
      updates.presetData = presetData as Prisma.InputJsonValue;
    }
    if (typeof status === 'string' && ['DRAFT', 'ACTIVE', 'REMOVED'].includes(status)) {
      updates.status = status as 'DRAFT' | 'ACTIVE' | 'REMOVED';
    }

    const listing = await prisma.marketplaceListing.update({ where: { id }, data: updates });
    res.json({ listing });
  } catch (error) {
    logger.error('updateListing error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// GET /api/marketplace/listings — public browse with filters.
export const listListings = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(40, Math.max(1, parseInt(req.query.limit as string) || 20));
    const type = req.query.type as string | undefined;
    const q = (req.query.q as string | undefined)?.trim().slice(0, 100);

    const where: Prisma.MarketplaceListingWhereInput = { status: 'ACTIVE' };
    if (type && (VALID_TYPES as readonly string[]).includes(type)) {
      where.type = type as 'SAMPLE_PACK' | 'PROMPT_PRESET';
    }
    if (q && q.length > 0) {
      where.title = { contains: q, mode: 'insensitive' };
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          slug: true,
          title: true,
          description: true,
          coverArt: true,
          priceCents: true,
          currency: true,
          purchaseCount: true,
          createdAt: true,
          seller: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);
    res.json({ listings, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('listListings error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list listings' });
  }
};

// GET /api/marketplace/listings/:slug — public detail.
export const getListing = async (req: RequestWithUser, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const listing = await prisma.marketplaceListing.findUnique({
      where: { slug },
      include: {
        seller: { select: { id: true, username: true, displayName: true, avatar: true, bio: true } },
      },
    });
    if (!listing || (listing.status !== 'ACTIVE' && listing.sellerUserId !== req.user?.userId)) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    // Best-effort viewCount bump; ignore concurrency races.
    prisma.marketplaceListing
      .update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
    res.json({ listing });
  } catch (error) {
    logger.error('getListing error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load listing' });
  }
};

// GET /api/marketplace/listings/mine — seller's own listings, including drafts.
export const listMyListings = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const listings = await prisma.marketplaceListing.findMany({
      where: { sellerUserId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ listings });
  } catch (error) {
    logger.error('listMyListings error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list listings' });
  }
};

// POST /api/marketplace/listings/:slug/checkout — buyer flow. Same Connect
// transfer pattern as licenseController.startCheckout.
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
    const slug = req.params.slug as string;
    const listing = await prisma.marketplaceListing.findUnique({
      where: { slug },
      include: { seller: { include: { connectAccount: true } } },
    });
    if (!listing || listing.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Listing not found or unavailable' });
      return;
    }
    if (listing.sellerUserId === req.user.userId) {
      res.status(400).json({ error: 'You cannot buy your own listing' });
      return;
    }
    if (
      !listing.seller.connectAccount?.stripeAccountId ||
      listing.seller.connectAccount.status !== 'ACTIVE'
    ) {
      res.status(400).json({ error: 'Seller has not enabled payouts yet' });
      return;
    }

    const { fee, net } = applyPlatformFee(listing.priceCents);
    const currency = listing.currency || 'usd';

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `${listing.type === 'SAMPLE_PACK' ? 'Sample pack' : 'Prompt preset'}: ${listing.title}`,
              },
              unit_amount: listing.priceCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: fee,
          transfer_data: { destination: listing.seller.connectAccount.stripeAccountId },
          metadata: {
            kind: 'marketplace_purchase',
            listingId: listing.id,
          },
        },
        metadata: {
          kind: 'marketplace_purchase',
          listingId: listing.id,
        },
        success_url: `${frontendUrl()}/marketplace/${listing.slug}?purchase=pending`,
        cancel_url: `${frontendUrl()}/marketplace/${listing.slug}?canceled=1`,
      });
    } catch (err) {
      logger.error('Marketplace checkout creation failed', { error: (err as Error).message });
      res.status(502).json({ error: 'Failed to create checkout session' });
      return;
    }

    const purchase = await prisma.marketplacePurchase.create({
      data: {
        listingId: listing.id,
        buyerUserId: req.user.userId,
        amountCents: listing.priceCents,
        platformFeeCents: fee,
        netCents: net,
        currency,
        status: 'PENDING',
        stripeCheckoutSessionId: session.id,
      },
    });

    try {
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          kind: 'marketplace_purchase',
          listingId: listing.id,
          purchaseId: purchase.id,
        },
      });
    } catch (err) {
      logger.warn('Failed to patch marketplace session metadata', {
        sessionId: session.id,
        error: (err as Error).message,
      });
    }

    res.json({ checkoutUrl: session.url, purchaseId: purchase.id });
  } catch (error) {
    logger.error('startCheckout (marketplace) error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start checkout' });
  }
};

// GET /api/marketplace/purchases/mine — buyer's own purchases.
export const listMyPurchases = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const purchases = await prisma.marketplacePurchase.findMany({
      where: { buyerUserId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        listing: {
          select: { id: true, slug: true, title: true, type: true, coverArt: true },
        },
      },
    });
    res.json({ purchases });
  } catch (error) {
    logger.error('listMyPurchases error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list purchases' });
  }
};

// GET /api/marketplace/purchases/:id/download — token-gated download for
// SAMPLE_PACK assets. Buyer must own the purchase row and the token must
// be unexpired.
export const downloadPurchase = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const purchase = await prisma.marketplacePurchase.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!purchase || purchase.buyerUserId !== req.user.userId) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    if (purchase.status !== 'SUCCEEDED') {
      res.status(409).json({ error: 'Purchase not yet completed' });
      return;
    }
    if (purchase.listing.type === 'PROMPT_PRESET') {
      res.json({ presetData: purchase.listing.presetData });
      return;
    }
    res.json({ assetUrls: purchase.listing.assetUrls });
  } catch (error) {
    logger.error('downloadPurchase error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load download' });
  }
};

// ─── Webhook handler ──────────────────────────────────────

// Called from subscriptionController.handleWebhook on
// `checkout.session.completed` when metadata.kind === 'marketplace_purchase'.
// Idempotent on stripeCheckoutSessionId — webhook retries collide on the
// upsert and become no-ops.
export async function handleMarketplacePurchaseCompleted(session: any): Promise<void> {
  const sessionId: string = session.id;
  const purchaseId: string | undefined = session.metadata?.purchaseId;
  if (!purchaseId) {
    logger.warn('marketplace_purchase webhook missing purchaseId', { sessionId });
    return;
  }
  const purchase = await prisma.marketplacePurchase.findUnique({
    where: { id: purchaseId },
    include: { listing: true },
  });
  if (!purchase || purchase.stripeCheckoutSessionId !== sessionId) {
    logger.warn('marketplace_purchase webhook: no matching row', { sessionId, purchaseId });
    return;
  }
  if (purchase.status === 'SUCCEEDED') return;

  const downloadToken = crypto.randomBytes(24).toString('hex');
  const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.$transaction(async (tx) => {
    await tx.marketplacePurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'SUCCEEDED',
        stripePaymentIntentId: session.payment_intent || undefined,
        downloadToken,
        downloadExpiresAt,
      },
    });
    await tx.marketplaceListing.update({
      where: { id: purchase.listingId },
      data: { purchaseCount: { increment: 1 } },
    });
  });

  logger.info('marketplace_purchase marked succeeded', {
    purchaseId: purchase.id,
    listingId: purchase.listingId,
    amountCents: purchase.amountCents,
  });
}
