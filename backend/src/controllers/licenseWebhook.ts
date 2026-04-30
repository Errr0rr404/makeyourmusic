import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { recordReferralEarning } from './referralController';
import crypto from 'crypto';

// Stripe checkout.session.completed handler for sync_license + stem_purchase.
// We mark the license PAID, give the buyer a 24h download window for the
// canonical files, and queue any referral earnings owed.
export async function handleSyncLicenseCheckoutCompleted(session: any): Promise<void> {
  const licenseId: string | undefined = session.metadata?.licenseId;
  if (!licenseId) {
    logger.warn('sync_license checkout missing metadata.licenseId', { sessionId: session.id });
    return;
  }

  const license = await prisma.syncLicense.findUnique({
    where: { id: licenseId },
    include: {
      track: { include: { agent: { select: { ownerId: true } } } },
    },
  });
  if (!license) {
    logger.warn('sync_license not found for completed checkout', { licenseId });
    return;
  }
  if (license.status === 'PAID') return; // idempotent

  // Issue the download token on PAYMENT (not on row creation). This ensures
  // the token can never be used before the buyer has paid, and that a
  // failed/refunded buyer can't replay an old token.
  const downloadToken = crypto.randomBytes(32).toString('hex');
  const downloadExpiresAt = new Date(Date.now() + 24 * 3_600_000);

  await prisma.syncLicense.update({
    where: { id: licenseId },
    data: {
      status: 'PAID',
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      downloadToken,
      downloadExpiresAt,
    },
  });

  // Queue referral earning for the seller's referrer (if any).
  const sellerOwnerId = license.track.agent?.ownerId;
  if (sellerOwnerId) {
    try {
      await recordReferralEarning({
        refereeId: sellerOwnerId,
        amountCents: license.netCents,
        source: 'sync_license',
        sourceId: license.id,
      });
    } catch (err) {
      logger.warn('referral earning record failed', {
        licenseId,
        error: (err as Error).message,
      });
    }
  }

  logger.info('sync_license marked paid', { licenseId, amountCents: license.amountCents });
}

// payment_intent.payment_failed for license/stem purchases.
export async function handleSyncLicensePaymentFailed(paymentIntent: any): Promise<void> {
  if (!paymentIntent?.id) return;
  await prisma.syncLicense.updateMany({
    where: { stripePaymentIntentId: paymentIntent.id, status: { not: 'REFUNDED' } },
    data: { status: 'REVOKED' },
  });
}

// charge.refunded for license/stem purchases — flip status, revoke download
// token, and clear expiry so even if the token leaked it can no longer be
// used to fetch the master files.
export async function handleSyncLicenseRefunded(charge: any): Promise<void> {
  if (!charge?.payment_intent) return;
  await prisma.syncLicense.updateMany({
    where: { stripePaymentIntentId: charge.payment_intent },
    data: {
      status: 'REFUNDED',
      downloadToken: null,
      downloadExpiresAt: null,
    },
  });
}
