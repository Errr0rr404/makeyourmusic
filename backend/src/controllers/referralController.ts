import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

const REFERRAL_BPS = parseInt(process.env.REFERRAL_BPS || '1000', 10); // 10%
const REFERRAL_WINDOW_DAYS = parseInt(process.env.REFERRAL_WINDOW_DAYS || '365', 10);

// Generate a short, URL-safe referral code. Collisions are unlikely at our
// scale; if one happens we just retry.
function newReferralCode(): string {
  return crypto.randomBytes(4).toString('hex'); // 8 chars
}

// Lazy-fetch the user's referral code, creating one on first call. This is
// what the front-end calls to render the share link.
export const getMyReferralCode = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userId = req.user.userId;
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true, username: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.referralCode) {
      // Generate, retrying on collision.
      for (let i = 0; i < 5; i++) {
        const code = newReferralCode();
        try {
          user = await prisma.user.update({
            where: { id: userId },
            data: { referralCode: code },
            select: { id: true, referralCode: true, username: true },
          });
          break;
        } catch {
          // unique constraint hit; loop
        }
      }
    }
    res.json({ code: user.referralCode, username: user.username });
  } catch (error) {
    logger.error('getMyReferralCode error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load referral code' });
  }
};

// Per-user dashboard: how many users I've referred + earnings owed/paid.
export const myReferralStats = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userId = req.user.userId;
    const [referees, earnings, paidOut, pending] = await Promise.all([
      prisma.user.count({ where: { referredById: userId } }),
      prisma.referralEarning.aggregate({
        where: { referrerId: userId },
        _sum: { amountCents: true },
      }),
      prisma.referralEarning.aggregate({
        where: { referrerId: userId, paidOut: true },
        _sum: { amountCents: true },
      }),
      prisma.referralEarning.aggregate({
        where: { referrerId: userId, paidOut: false },
        _sum: { amountCents: true },
      }),
    ]);
    res.json({
      refereeCount: referees,
      lifetimeEarningsCents: earnings._sum.amountCents ?? 0,
      paidOutCents: paidOut._sum.amountCents ?? 0,
      pendingCents: pending._sum.amountCents ?? 0,
      bps: REFERRAL_BPS,
      windowDays: REFERRAL_WINDOW_DAYS,
    });
  } catch (error) {
    logger.error('myReferralStats error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load referral stats' });
  }
};

// ─── Internal helpers used by the payment webhook ───────────
//
// recordReferralEarning is called whenever a referee receives money via
// tips, channel subs, or sync licenses. The referrer-cut is queued as an
// unpaid ReferralEarning row; a separate cron job actually issues the
// Stripe transfer in batches.

export interface RecordReferralInput {
  refereeId: string;
  amountCents: number;
  source: 'tip' | 'channel_sub' | 'sync_license';
  sourceId: string;
}

export async function recordReferralEarning(input: RecordReferralInput): Promise<void> {
  if (input.amountCents <= 0) return;
  const referee = await prisma.user.findUnique({
    where: { id: input.refereeId },
    select: { id: true, referredById: true, createdAt: true },
  });
  if (!referee?.referredById) return;
  // Self-referral guard. Defense in depth — should be impossible since
  // referredById is set at signup and email/username are unique, but a stray
  // admin SQL update could break it.
  if (referee.referredById === referee.id) return;

  // Window enforcement: stop crediting after REFERRAL_WINDOW_DAYS from signup.
  const ageDays = (Date.now() - referee.createdAt.getTime()) / (24 * 3_600_000);
  if (ageDays > REFERRAL_WINDOW_DAYS) return;

  const cut = Math.floor((input.amountCents * REFERRAL_BPS) / 10000);
  if (cut <= 0) return;
  try {
    await prisma.referralEarning.create({
      data: {
        referrerId: referee.referredById,
        refereeId: referee.id,
        amountCents: cut,
        source: input.source,
        sourceId: input.sourceId,
      },
    });
  } catch (err: any) {
    // P2002 = unique violation on (source, sourceId, referrerId). Webhook
    // replay — silently skip.
    if (err?.code === 'P2002') return;
    throw err;
  }
}

// Skip rows below this threshold to avoid wasting Stripe transfer fees on
// pennies. The remainder accumulates against future earnings until it crosses
// the threshold, then all unpaid rows for that referrer are paid in one
// transfer.
const MIN_PAYOUT_CENTS = parseInt(process.env.REFERRAL_MIN_PAYOUT_CENTS || '500', 10);

export interface PayReferralsResult {
  candidates: number;
  paidReferrers: number;
  totalCents: number;
  failed: number;
}

// Cron-driven payout: groups unpaid referral earnings by referrer, transfers
// the total to the referrer's Connect account, marks rows paidOut=true.
// Idempotent — failed transfers leave rows unpaid for the next tick to retry.
export async function payReferrals(): Promise<PayReferralsResult> {
  const out: PayReferralsResult = { candidates: 0, paidReferrers: 0, totalCents: 0, failed: 0 };

  const { getStripe } = await import('../utils/stripeClient');
  const stripe = getStripe();
  if (!stripe) {
    logger.info('payReferrals skipped: Stripe not configured');
    return out;
  }

  // Grab unpaid earnings grouped by referrer. Cap to a sane batch so a huge
  // backlog doesn't blow the cron tick budget.
  const unpaid = await prisma.referralEarning.findMany({
    where: { paidOut: false },
    select: { id: true, referrerId: true, amountCents: true },
    take: 1000,
    orderBy: { createdAt: 'asc' },
  });
  out.candidates = unpaid.length;
  if (unpaid.length === 0) return out;

  const byReferrer = new Map<string, { ids: string[]; totalCents: number }>();
  for (const row of unpaid) {
    const bucket = byReferrer.get(row.referrerId) || { ids: [], totalCents: 0 };
    bucket.ids.push(row.id);
    bucket.totalCents += row.amountCents;
    byReferrer.set(row.referrerId, bucket);
  }

  for (const [referrerId, bucket] of byReferrer) {
    if (bucket.totalCents < MIN_PAYOUT_CENTS) continue;

    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      include: { connectAccount: true },
    });
    if (
      !referrer?.connectAccount?.stripeAccountId ||
      referrer.connectAccount.status !== 'ACTIVE' ||
      !referrer.connectAccount.payoutsEnabled
    ) {
      // Skip — referrer hasn't completed Connect onboarding. The earnings
      // remain pending until they do.
      continue;
    }

    let transferId: string | null = null;
    try {
      const transfer = await stripe.transfers.create({
        amount: bucket.totalCents,
        currency: 'usd',
        destination: referrer.connectAccount.stripeAccountId,
        description: `Referral earnings (${bucket.ids.length} entries)`,
        metadata: {
          kind: 'referral_payout',
          referrerId,
          earningCount: String(bucket.ids.length),
        },
      });
      transferId = transfer.id;
    } catch (err) {
      logger.warn('payReferrals: transfer failed', {
        referrerId,
        cents: bucket.totalCents,
        error: (err as Error).message,
      });
      out.failed += bucket.ids.length;
      continue;
    }

    await prisma.referralEarning.updateMany({
      where: { id: { in: bucket.ids } },
      data: { paidOut: true, stripeTransferId: transferId },
    });
    out.paidReferrers += 1;
    out.totalCents += bucket.totalCents;
  }

  return out;
}
