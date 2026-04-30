// Single in-process scheduler. Runs lightweight maintenance tasks at fixed
// intervals so we don't need an external cron service. Boot from server.ts
// with `startCron()` — guarded by RUN_CRON=1 so dev environments stay quiet.
//
// Intervals:
//   - trending refresh every 15min
//   - feature recompute (new + version-stale tracks) every hour
//   - weekly mixtape sweep every 24h, only triggers between Sun 23:00 - Mon 02:00 UTC

import logger from './logger';
import { refreshTrendingScores } from './trending';
import { recomputeAllFeatures } from './recommendations';
import { generateWeeklyMixtapes } from './mixtape';
import { pollPreviewVideos } from './previewVideoPoller';

let started = false;

function shouldRunMixtape(now: Date): boolean {
  return now.getUTCDay() === 0 /* Sun */ && now.getUTCHours() >= 23;
}

export function startCron(): void {
  if (started) return;
  if (process.env.RUN_CRON !== '1') {
    logger.info('Cron disabled (set RUN_CRON=1 to enable)');
    return;
  }
  started = true;

  // Trending — every 15 minutes.
  setInterval(async () => {
    try {
      const n = await refreshTrendingScores();
      logger.info('cron: trending refreshed', { rows: n });
    } catch (err) {
      logger.warn('cron: trending failed', { error: (err as Error).message });
    }
  }, 15 * 60 * 1000);

  // Feature recompute — every hour.
  setInterval(async () => {
    try {
      const n = await recomputeAllFeatures();
      logger.info('cron: features recomputed', { rows: n });
    } catch (err) {
      logger.warn('cron: features failed', { error: (err as Error).message });
    }
  }, 60 * 60 * 1000);

  // Auto-preview video poller — every 5 min. Cheap when no jobs are pending.
  setInterval(async () => {
    try {
      const r = await pollPreviewVideos();
      if (r.processed > 0) logger.info('cron: preview videos polled', r);
    } catch (err) {
      logger.warn('cron: preview poll failed', { error: (err as Error).message });
    }
  }, 5 * 60 * 1000);

  // Weekly mixtapes — checked hourly, only fires inside the Sunday-night window.
  setInterval(async () => {
    if (!shouldRunMixtape(new Date())) return;
    try {
      const r = await generateWeeklyMixtapes();
      logger.info('cron: mixtapes generated', r);
    } catch (err) {
      logger.warn('cron: mixtape job failed', { error: (err as Error).message });
    }
  }, 60 * 60 * 1000);

  logger.info('Cron started');
}
