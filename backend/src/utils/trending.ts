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

export async function refreshTrendingScores(maxRows = 5000): Promise<number> {
  const candidates = await prisma.track.findMany({
    where: { isPublic: true, status: 'ACTIVE', takedownStatus: null },
    select: {
      id: true,
      likeCount: true,
      playCount: true,
      shareCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: maxRows,
  });

  const now = new Date();
  let updated = 0;
  // Update in chunks to keep transactions short.
  const CHUNK = 100;
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const slice = candidates.slice(i, i + CHUNK);
    await prisma.$transaction(
      slice.map((t) =>
        prisma.track.update({
          where: { id: t.id },
          data: {
            trendingScore: computeTrendingScore(
              t.likeCount,
              t.playCount,
              t.shareCount,
              t.createdAt,
              now
            ),
            trendingUpdatedAt: now,
          },
        })
      )
    );
    updated += slice.length;
  }

  logger.info('Trending scores refreshed', { updated });
  return updated;
}
