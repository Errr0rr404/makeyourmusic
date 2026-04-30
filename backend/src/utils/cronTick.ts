// Single in-process scheduler. Runs lightweight maintenance tasks at fixed
// intervals so we don't need an external cron service. Boot from server.ts
// with `startCron()` — guarded by RUN_CRON=1 so dev environments stay quiet.
//
// Intervals:
//   - trending refresh every 15min
//   - feature recompute (new + version-stale tracks) every hour
//   - weekly mixtape sweep every 24h, only triggers between Sun 23:00 - Mon 02:00 UTC

import logger from './logger';
import { prisma } from './db';
import { refreshTrendingScores } from './trending';
import { recomputeAllFeatures } from './recommendations';
import { generateWeeklyMixtapes } from './mixtape';
import { pollPreviewVideos } from './previewVideoPoller';
import { payReferrals } from '../controllers/referralController';
import { processPendingCollabPayouts } from './collabSplits';

let started = false;

function shouldRunMixtape(now: Date): boolean {
  return now.getUTCDay() === 0 /* Sun */ && now.getUTCHours() >= 23;
}

// Postgres advisory locks ensure that when the API runs in multiple replicas
// (Railway can scale beyond 1 instance), only one process runs each cron
// tick. Without this every replica would run trending refresh + mixtape +
// preview poll concurrently — racing on the same rows and burning provider
// quota. Lock IDs are arbitrary 32-bit ints unique per job.
const LOCK_TRENDING = 1001;
const LOCK_FEATURES = 1002;
const LOCK_PREVIEW = 1003;
const LOCK_MIXTAPE = 1004;
const LOCK_STUCK_GEN_SWEEP = 1005;
const LOCK_REFERRAL_PAYOUT = 1006;
const LOCK_COLLAB_PAYOUT = 1007;

async function withLock(lockId: number, fn: () => Promise<void>): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ pg_try_advisory_lock: boolean }>>(
    `SELECT pg_try_advisory_lock(${lockId}) as pg_try_advisory_lock`
  );
  const acquired = rows[0]?.pg_try_advisory_lock === true;
  if (!acquired) return false;
  try {
    await fn();
    return true;
  } finally {
    await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${lockId})`);
  }
}

// Sweep MusicGeneration / VideoGeneration rows that are stuck in
// PROCESSING for too long (process crash mid-flight). Marks them FAILED
// so the user isn't left with a forever-spinning generation slot.
async function sweepStuckGenerations(): Promise<{ music: number; video: number }> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [music, video] = await Promise.all([
    prisma.musicGeneration.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: tenMinAgo } },
      data: { status: 'FAILED', errorMessage: 'Generation timed out' },
    }),
    prisma.videoGeneration.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } },
      data: { status: 'FAILED', errorMessage: 'Generation timed out' },
    }),
  ]);
  return { music: music.count, video: video.count };
}

export function startCron(): void {
  if (started) return;
  if (process.env.RUN_CRON !== '1') {
    logger.info('Cron disabled (set RUN_CRON=1 to enable)');
    return;
  }
  started = true;

  // Trending — every 15 minutes.
  const trendingT = setInterval(async () => {
    await withLock(LOCK_TRENDING, async () => {
      try {
        const n = await refreshTrendingScores();
        logger.info('cron: trending refreshed', { rows: n });
      } catch (err) {
        logger.warn('cron: trending failed', { error: (err as Error).message });
      }
    });
  }, 15 * 60 * 1000);

  // Feature recompute — every hour.
  const featuresT = setInterval(async () => {
    await withLock(LOCK_FEATURES, async () => {
      try {
        const n = await recomputeAllFeatures();
        logger.info('cron: features recomputed', { rows: n });
      } catch (err) {
        logger.warn('cron: features failed', { error: (err as Error).message });
      }
    });
  }, 60 * 60 * 1000);

  // Auto-preview video poller — every 5 min. Cheap when no jobs are pending.
  const previewT = setInterval(async () => {
    await withLock(LOCK_PREVIEW, async () => {
      try {
        const r = await pollPreviewVideos();
        if (r.processed > 0) logger.info('cron: preview videos polled', r);
      } catch (err) {
        logger.warn('cron: preview poll failed', { error: (err as Error).message });
      }
    });
  }, 5 * 60 * 1000);

  // Weekly mixtapes — checked hourly, only fires inside the Sunday-night window.
  const mixtapeT = setInterval(async () => {
    if (!shouldRunMixtape(new Date())) return;
    await withLock(LOCK_MIXTAPE, async () => {
      try {
        const r = await generateWeeklyMixtapes();
        logger.info('cron: mixtapes generated', r);
      } catch (err) {
        logger.warn('cron: mixtape job failed', { error: (err as Error).message });
      }
    });
  }, 60 * 60 * 1000);

  // Stuck-generation sweep — every 5 min, fails timed-out PROCESSING rows so
  // users aren't permanently locked out by a crashed process.
  const sweepT = setInterval(async () => {
    await withLock(LOCK_STUCK_GEN_SWEEP, async () => {
      try {
        const r = await sweepStuckGenerations();
        if (r.music + r.video > 0) logger.info('cron: stuck generations swept', r);
      } catch (err) {
        logger.warn('cron: stuck-gen sweep failed', { error: (err as Error).message });
      }
    });
  }, 5 * 60 * 1000);

  // Referral payouts — once per hour. Issues Stripe Connect transfers for
  // accumulated referral earnings; rows below the min-payout threshold or
  // for referrers without an active Connect account stay pending.
  const referralT = setInterval(async () => {
    await withLock(LOCK_REFERRAL_PAYOUT, async () => {
      try {
        const r = await payReferrals();
        if (r.candidates > 0) logger.info('cron: referral payouts processed', r);
      } catch (err) {
        logger.warn('cron: referral payout failed', { error: (err as Error).message });
      }
    });
  }, 60 * 60 * 1000);

  // Collab payout retry — every 15 minutes. Picks up any PENDING transfers
  // that failed at webhook time (transient Stripe error, recipient not yet
  // onboarded, etc.) and tries again until success or max attempts.
  const collabT = setInterval(async () => {
    await withLock(LOCK_COLLAB_PAYOUT, async () => {
      try {
        const r = await processPendingCollabPayouts();
        if (r.attempted > 0) logger.info('cron: collab payouts processed', r);
      } catch (err) {
        logger.warn('cron: collab payout failed', { error: (err as Error).message });
      }
    });
  }, 15 * 60 * 1000);

  // unref so the timers don't keep the process alive on graceful shutdown.
  for (const t of [trendingT, featuresT, previewT, mixtapeT, sweepT, referralT, collabT]) {
    if (typeof (t as any).unref === 'function') (t as any).unref();
  }

  logger.info('Cron started');
}
