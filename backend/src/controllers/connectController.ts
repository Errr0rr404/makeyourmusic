import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { getStripe, frontendUrl } from '../utils/stripeClient';

const stripe = () => getStripe();

function mapStatus(payoutsEnabled: boolean, detailsSubmitted: boolean, requirementsDisabled: boolean): 'PENDING' | 'ACTIVE' | 'RESTRICTED' {
  if (requirementsDisabled) return 'RESTRICTED';
  if (payoutsEnabled && detailsSubmitted) return 'ACTIVE';
  return 'PENDING';
}

/** Returns the creator's Connect account status. Creates it lazily if asked. */
export const getConnectStatus = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const account = await prisma.connectAccount.findUnique({
      where: { userId: req.user.userId },
    });

    if (!account) {
      res.json({ account: null, canMonetize: false });
      return;
    }
    res.json({
      account: {
        id: account.id,
        status: account.status,
        payoutsEnabled: account.payoutsEnabled,
        chargesEnabled: account.chargesEnabled,
        detailsSubmitted: account.detailsSubmitted,
        country: account.country,
        defaultCurrency: account.defaultCurrency,
      },
      canMonetize: account.status === 'ACTIVE' && account.payoutsEnabled,
    });
  } catch (error) {
    logger.error('Get connect status error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get connect status' });
  }
};

/**
 * Creates a Stripe Connect Express account for the user (if not already) and
 * returns a one-time onboarding link. Called when the creator clicks
 * "Set up payouts".
 */
export const createOnboardingLink = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const s = stripe();
    if (!s) { res.status(503).json({ error: 'Payment system not configured' }); return; }

    let account = await prisma.connectAccount.findUnique({
      where: { userId: req.user.userId },
    });

    if (!account) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true },
      });
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }

      const stripeAcct = await s.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { userId: req.user.userId },
      });

      account = await prisma.connectAccount.create({
        data: {
          userId: req.user.userId,
          stripeAccountId: stripeAcct.id,
          status: 'PENDING',
          country: stripeAcct.country || null,
          defaultCurrency: stripeAcct.default_currency || 'usd',
        },
      });
    }

    const fe = frontendUrl();
    const link = await s.accountLinks.create({
      account: account.stripeAccountId,
      refresh_url: `${fe}/creator/payouts?refresh=1`,
      return_url: `${fe}/creator/payouts?onboarded=1`,
      type: 'account_onboarding',
    });

    res.json({ url: link.url });
  } catch (error) {
    logger.error('Create onboarding link error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create onboarding link' });
  }
};

/**
 * Returns a Stripe Express dashboard login link so the creator can manage
 * their account, view payouts, update bank details, etc.
 */
export const createDashboardLink = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const s = stripe();
    if (!s) { res.status(503).json({ error: 'Payment system not configured' }); return; }

    const account = await prisma.connectAccount.findUnique({
      where: { userId: req.user.userId },
    });
    if (!account) {
      res.status(400).json({ error: 'No Connect account — finish onboarding first' });
      return;
    }

    const link = await s.accounts.createLoginLink(account.stripeAccountId);
    res.json({ url: link.url });
  } catch (error) {
    logger.error('Create dashboard link error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create dashboard link' });
  }
};

/**
 * Pulls the latest state from Stripe and updates our local mirror. Called by
 * webhook handler on `account.updated`, and exposed as a refresh endpoint so
 * the UI can re-check after the user returns from onboarding.
 */
export async function syncConnectAccount(stripeAccountId: string) {
  const s = stripe();
  if (!s) return;

  const acct = await s.accounts.retrieve(stripeAccountId);
  const requirementsDisabled = Boolean(
    acct.requirements?.disabled_reason && acct.requirements.disabled_reason !== 'requirements.past_due'
  );
  const status = mapStatus(
    Boolean(acct.payouts_enabled),
    Boolean(acct.details_submitted),
    requirementsDisabled
  );

  await prisma.connectAccount.updateMany({
    where: { stripeAccountId },
    data: {
      status,
      payoutsEnabled: Boolean(acct.payouts_enabled),
      chargesEnabled: Boolean(acct.charges_enabled),
      detailsSubmitted: Boolean(acct.details_submitted),
      country: acct.country || undefined,
      defaultCurrency: acct.default_currency || undefined,
    },
  });
}

export const refreshConnectStatus = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const account = await prisma.connectAccount.findUnique({
      where: { userId: req.user.userId },
    });
    if (!account) { res.status(404).json({ error: 'No Connect account' }); return; }

    await syncConnectAccount(account.stripeAccountId);

    const updated = await prisma.connectAccount.findUnique({
      where: { userId: req.user.userId },
    });
    res.json({
      account: updated,
      canMonetize: updated?.status === 'ACTIVE' && updated?.payoutsEnabled,
    });
  } catch (error) {
    logger.error('Refresh connect status error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to refresh connect status' });
  }
};
