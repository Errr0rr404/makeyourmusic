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

  // Window enforcement: stop crediting after REFERRAL_WINDOW_DAYS from signup.
  const ageDays = (Date.now() - referee.createdAt.getTime()) / (24 * 3_600_000);
  if (ageDays > REFERRAL_WINDOW_DAYS) return;

  const cut = Math.floor((input.amountCents * REFERRAL_BPS) / 10000);
  if (cut <= 0) return;
  await prisma.referralEarning.create({
    data: {
      referrerId: referee.referredById,
      refereeId: referee.id,
      amountCents: cut,
      source: input.source,
      sourceId: input.sourceId,
    },
  });
}
