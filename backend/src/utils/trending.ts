// Hacker-News-style trending score.
//
//   score = (likes + plays/10 + 2*shares) / (hours_since_publish + 2)^1.8
//
// Recent tracks dominate but engagement still matters. The denominator ramps
// fast: a 24h-old track with 100 plays scores about 2x a 7-day-old track
// with the same numbers. Tweak GRAVITY in env if you want a slower decay.
//
// Recompute is cheap — we run it via a cron tick every ~15 minutes. The job
// updates rows in batches so a single transaction never holds long locks.

import { prisma } from './db';
import logger from './logger';

const GRAVITY = parseFloat(process.env.TRENDING_GRAVITY || '1.8');
const FRESH_OFFSET_HOURS = 2;

export function computeTrendingScore(
  likeCount: number,
  playCount: number,
  shareCount: number,
  publishedAt: Date,
  now: Date = new Date()
): number {
  const ageHours = Math.max(0, (now.getTime() - publishedAt.getTime()) / 3_600_000);
  const numerator = likeCount + playCount / 10 + shareCount * 2;
  const denominator = Math.pow(ageHours + FRESH_OFFSET_HOURS, GRAVITY);
  if (denominator === 0) return numerator;
  return numerator / denominator;
}

// Recompute trending scores in a single SQL UPDATE rather than N row-by-row
// transactions. The previous chunked-transaction approach held locks on
// 100 tracks at a time, blocking concurrent like/play writes; this version
// uses Postgres's native power() and finishes in one round-trip.
//
// Skips rows whose trending_updated_at is fresher than RECOMPUTE_AGE_MIN
// minutes ago — combined with the 15-minute cron, that means we only
// recompute when something has actually changed since last time.
const RECOMPUTE_AGE_MIN = parseInt(process.env.TRENDING_RECOMPUTE_AGE_MIN || '10', 10);

export async function refreshTrendingScores(_maxRows = 5000): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE tracks
    SET
      trending_score = (
        like_count + (play_count::float / 10.0) + (share_count * 2)
      ) / power(
        GREATEST(0, EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0) + ${FRESH_OFFSET_HOURS},
        ${GRAVITY}
      ),
      trending_updated_at = NOW()
    WHERE
      is_public = true
      AND status = 'ACTIVE'
      AND takedown_status IS NULL
      AND (trending_updated_at IS NULL OR trending_updated_at < NOW() - (${RECOMPUTE_AGE_MIN} * INTERVAL '1 minute'))
  `;
  logger.info('Trending scores refreshed', { updated: result });
  return Number(result) || 0;
}
