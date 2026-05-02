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
import { estimateMusicCost } from './cost';

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
const LOCK_AUTOCLIP_BACKFILL = 1008;
const LOCK_PARTY_SWEEP = 1009;
const LOCK_DJ_SWEEP = 1010;

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

// Backfill auto-clip (vertical preview video) for tracks that don't have
// one yet. Catches:
//   - Tracks published before AUTO_PREVIEW_VIDEO=1 was flipped on.
//   - Tracks where the in-line kick-off in publishGeneration failed
//     transiently (network blip, provider 5xx, etc.).
// Bounded by AUTOCLIP_BACKFILL_PER_TICK so a backlog of thousands of
// historical tracks doesn't burst the provider quota in one cron tick.
async function backfillAutoClips(): Promise<{ scheduled: number }> {
  if (process.env.AUTO_PREVIEW_VIDEO !== '1') return { scheduled: 0 };
  const perTick = Math.max(1, Math.min(50, parseInt(process.env.AUTOCLIP_BACKFILL_PER_TICK || '5', 10)));
  // Only consider recent public tracks — older ones are unlikely to drive
  // virality and their cover art might be lower quality. The 30-day window
  // is the same horizon trending/recommendations care about.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.track.findMany({
    where: {
      isPublic: true,
      coverArt: { not: null },
      previewVideoUrl: null,
      status: 'ACTIVE',
      createdAt: { gt: since },
      // Skip tracks that already have a PROCESSING/PENDING video job — those
      // are still in flight from the in-line kick-off in publishGeneration.
      videoGenerations: { none: { purpose: 'preview', status: { in: ['PENDING', 'PROCESSING'] } } },
    },
    take: perTick,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, coverArt: true, agentId: true, agent: { select: { ownerId: true } } },
  });
  if (candidates.length === 0) return { scheduled: 0 };

  const { minimaxStartVideo } = await import('./minimax');
  let scheduled = 0;
  for (const t of candidates) {
    if (!t.coverArt) continue;
    try {
      const start = await minimaxStartVideo({
        prompt: `Vertical music-video promo for "${t.title}" — animated cover art, subtle camera move, high contrast, 9:16.`,
        firstFrameImage: t.coverArt,
        resolution: '768P',
        duration: 6,
      });
      await prisma.videoGeneration.create({
        data: {
          // Owner of the agent owns the auto-generated preview video. The
          // agent always exists (FK is not nullable on Track) so this is safe.
          userId: t.agent.ownerId,
          title: `Preview: ${t.title}`,
          prompt: 'auto-preview-backfill',
          purpose: 'preview',
          trackId: t.id,
          durationSec: 6,
          resolution: '768P',
          providerJobId: start.taskId,
          status: 'PROCESSING',
        },
      });
      scheduled += 1;
    } catch (err) {
      logger.warn('autoclip backfill: kick-off failed', {
        trackId: t.id,
        error: (err as Error).message,
      });
    }
  }
  return { scheduled };
}

// End DJ sessions abandoned by the host. Same heartbeat logic as parties:
// no host:tick in 30+ min ⇒ session ENDED. Also imposes a hard 4-hour cap
// so a forgotten browser tab can't burn through the host's daily generation
// budget. The cron worker also broadcasts dj:ended so any stranded
// listeners disconnect cleanly.
async function sweepStaleDjSessions(): Promise<{ ended: number }> {
  const heartbeatCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const ageCutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const stale = await prisma.djSession.findMany({
    where: {
      status: { in: ['LIVE', 'PAUSED'] },
      OR: [{ lastTickAt: { lt: heartbeatCutoff } }, { startedAt: { lt: ageCutoff } }],
    },
    select: { id: true },
    take: 200,
  });
  if (stale.length === 0) return { ended: 0 };
  await prisma.djSession.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: 'ENDED', endedAt: new Date() },
  });
  try {
    const { broadcastDjSessionEnded } = await import('../realtime');
    for (const s of stale) broadcastDjSessionEnded(s.id);
  } catch {
    // realtime not attached in tests — fine.
  }
  return { ended: stale.length };
}

// End ListeningParty rows whose host has been silent for >30min. Without
// this, sockets reconnecting to abandoned parties will keep ticking against
// a stale row and the room appears "live" forever. Pairs with the realtime
// layer's PERSIST_INTERVAL_MS — every host:tick refreshes lastTickAt.
async function sweepStaleParties(): Promise<{ ended: number }> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await prisma.listeningParty.findMany({
    where: { status: 'ACTIVE', lastTickAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  if (stale.length === 0) return { ended: 0 };
  await prisma.listeningParty.updateMany({
    where: { id: { in: stale.map((p) => p.id) } },
    data: { status: 'ENDED', endedAt: new Date() },
  });
  // Best-effort socket cleanup; safe no-op if Socket.IO isn't attached.
  try {
    const { broadcastPartyEnded } = await import('../realtime');
    for (const p of stale) broadcastPartyEnded(p.id);
  } catch {
    // realtime not attached — fine, sockets will time out via pingTimeout.
  }
  return { ended: stale.length };
}

// Sweep MusicGeneration / VideoGeneration rows that are stuck in
// PROCESSING for too long (process crash mid-flight). Marks them FAILED
// so the user isn't left with a forever-spinning generation slot.
async function sweepStuckGenerations(): Promise<{ music: number; video: number }> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [music, video] = await Promise.all([
    prisma.musicGeneration.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: tenMinAgo } },
      // Stuck-then-FAILED rows still incurred the provider call; record the
      // estimated cost so cost dashboards reflect reality.
      data: {
        status: 'FAILED',
        errorMessage: 'Generation timed out',
        providerCostCents: Math.round(estimateMusicCost({ status: 'FAILED' }) * 100),
      },
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

  // Self-rescheduling timers instead of setInterval. With setInterval, when a
  // tick takes longer than the interval, the next fires while the previous is
  // still in `await` — even though withLock prevents overlap, the closure
  // still consumes a connection and stacks up. Self-rescheduling guarantees
  // exactly one tick at a time and avoids any backlog.
  const scheduledTimers: Array<ReturnType<typeof setTimeout>> = [];
  function schedule(intervalMs: number, name: string, run: () => Promise<void>) {
    const tick = async () => {
      try {
        await run();
      } catch (err) {
        logger.warn(`cron: ${name} unexpected error`, { error: (err as Error).message });
      } finally {
        const t = setTimeout(tick, intervalMs);
        if (typeof (t as any).unref === 'function') (t as any).unref();
        scheduledTimers.push(t);
      }
    };
    const t = setTimeout(tick, intervalMs);
    if (typeof (t as any).unref === 'function') (t as any).unref();
    scheduledTimers.push(t);
  }

  // Trending — every 15 minutes.
  schedule(15 * 60 * 1000, 'trending', async () => {
    await withLock(LOCK_TRENDING, async () => {
      try {
        const n = await refreshTrendingScores();
        logger.info('cron: trending refreshed', { rows: n });
      } catch (err) {
        logger.warn('cron: trending failed', { error: (err as Error).message });
      }
    });
  });

  // Feature recompute — every hour.
  schedule(60 * 60 * 1000, 'features', async () => {
    await withLock(LOCK_FEATURES, async () => {
      try {
        const n = await recomputeAllFeatures();
        logger.info('cron: features recomputed', { rows: n });
      } catch (err) {
        logger.warn('cron: features failed', { error: (err as Error).message });
      }
    });
  });

  // Auto-preview video poller — every 5 min. Cheap when no jobs are pending.
  schedule(5 * 60 * 1000, 'preview', async () => {
    await withLock(LOCK_PREVIEW, async () => {
      try {
        const r = await pollPreviewVideos();
        if (r.processed > 0) logger.info('cron: preview videos polled', r);
      } catch (err) {
        logger.warn('cron: preview poll failed', { error: (err as Error).message });
      }
    });
  });

  // Auto-clip backfill — every 15 min. Picks up tracks without a preview
  // video and kicks off Minimax jobs for them. The poller above eventually
  // writes the result URL back to Track.previewVideoUrl. Runs only when
  // AUTO_PREVIEW_VIDEO=1; otherwise the backfill is a no-op.
  schedule(15 * 60 * 1000, 'autoclip-backfill', async () => {
    await withLock(LOCK_AUTOCLIP_BACKFILL, async () => {
      try {
        const r = await backfillAutoClips();
        if (r.scheduled > 0) logger.info('cron: autoclip backfill scheduled jobs', r);
      } catch (err) {
        logger.warn('cron: autoclip backfill failed', { error: (err as Error).message });
      }
    });
  });

  // Weekly mixtapes — checked hourly, only fires inside the Sunday-night window.
  schedule(60 * 60 * 1000, 'mixtape', async () => {
    if (!shouldRunMixtape(new Date())) return;
    await withLock(LOCK_MIXTAPE, async () => {
      try {
        const r = await generateWeeklyMixtapes();
        logger.info('cron: mixtapes generated', r);
      } catch (err) {
        logger.warn('cron: mixtape job failed', { error: (err as Error).message });
      }
    });
  });

  // Stuck-generation sweep — every 5 min, fails timed-out PROCESSING rows so
  // users aren't permanently locked out by a crashed process.
  schedule(5 * 60 * 1000, 'stuck-gen-sweep', async () => {
    await withLock(LOCK_STUCK_GEN_SWEEP, async () => {
      try {
        const r = await sweepStuckGenerations();
        if (r.music + r.video > 0) logger.info('cron: stuck generations swept', r);
      } catch (err) {
        logger.warn('cron: stuck-gen sweep failed', { error: (err as Error).message });
      }
    });
  });

  // Referral payouts — once per hour.
  schedule(60 * 60 * 1000, 'referral-payouts', async () => {
    await withLock(LOCK_REFERRAL_PAYOUT, async () => {
      try {
        const r = await payReferrals();
        if (r.candidates > 0) logger.info('cron: referral payouts processed', r);
      } catch (err) {
        logger.warn('cron: referral payout failed', { error: (err as Error).message });
      }
    });
  });

  // Collab payout retry — every 15 minutes.
  schedule(15 * 60 * 1000, 'collab-payouts', async () => {
    await withLock(LOCK_COLLAB_PAYOUT, async () => {
      try {
        const r = await processPendingCollabPayouts();
        if (r.attempted > 0) logger.info('cron: collab payouts processed', r);
      } catch (err) {
        logger.warn('cron: collab payout failed', { error: (err as Error).message });
      }
    });
  });

  // Listening-party sweep — every 5 min. Ends parties whose host stopped
  // sending host:tick events (process crash, browser closed, network drop).
  schedule(5 * 60 * 1000, 'party-sweep', async () => {
    await withLock(LOCK_PARTY_SWEEP, async () => {
      try {
        const r = await sweepStaleParties();
        if (r.ended > 0) logger.info('cron: stale parties ended', r);
      } catch (err) {
        logger.warn('cron: party sweep failed', { error: (err as Error).message });
      }
    });
  });

  // DJ session sweep — every 5 min. Same heartbeat logic plus a 4-hour
  // hard cap (forgotten browser tab protection).
  schedule(5 * 60 * 1000, 'dj-sweep', async () => {
    await withLock(LOCK_DJ_SWEEP, async () => {
      try {
        const r = await sweepStaleDjSessions();
        if (r.ended > 0) logger.info('cron: stale dj sessions ended', r);
      } catch (err) {
        logger.warn('cron: dj sweep failed', { error: (err as Error).message });
      }
    });
  });

  logger.info('Cron started');
}
