// Weekly mixtape job. Run via cron (Sunday 23:00 UTC) so the playlist is
// ready when subscribers wake up Monday morning.
//
//   node -r ts-node/register backend/src/utils/mixtape.ts
//
// or invoke generateWeeklyMixtapes() from a scheduled task. The function
// is idempotent: re-running for the same period skips users that already
// have a mixtape.

import { prisma } from './db';
import logger from './logger';
import { findSimilarTracks } from './recommendations';
import { uniqueSuffix } from './slugify';

function isoWeek(d: Date = new Date()): string {
  // Cheap ISO-week: YYYY-Www
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = date.getTime();
  date.setUTCMonth(0, 1);
  if (date.getUTCDay() !== 4) {
    date.setUTCMonth(0, 1 + ((4 - date.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - date.getTime()) / 604_800_000);
  return `${new Date(firstThursday).getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const MIXTAPE_SIZE = 25;

interface MixtapeResult {
  userId: string;
  playlistId: string | null;
  status: 'created' | 'skipped' | 'no_taste' | 'no_candidates';
}

async function generateForUser(userId: string, period: string): Promise<MixtapeResult> {
  const existing = await prisma.userMixtape.findUnique({
    where: { userId_period: { userId, period } },
  });
  if (existing) return { userId, playlistId: existing.playlistId, status: 'skipped' };

  // Build taste centroid from recent likes + completed plays.
  const [likes, plays] = await Promise.all([
    prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { track: { select: { id: true, featureVector: true } } },
    }),
    prisma.play.findMany({
      where: { userId, completed: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { track: { select: { id: true, featureVector: true } } },
    }),
  ]);
  const seen = new Set<string>();
  const vectors: number[][] = [];
  for (const row of [...likes, ...plays]) {
    const t = row.track;
    if (!t || seen.has(t.id) || !t.featureVector?.length) continue;
    seen.add(t.id);
    vectors.push(t.featureVector as number[]);
  }
  if (!vectors.length || !vectors[0]) return { userId, playlistId: null, status: 'no_taste' };

  const dim = vectors[0].length;
  const centroid = new Array<number>(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) centroid[i] = (centroid[i] ?? 0) + (v[i] ?? 0);
  for (let i = 0; i < dim; i++) centroid[i] = (centroid[i] ?? 0) / vectors.length;

  const scored = await findSimilarTracks(centroid, {
    limit: MIXTAPE_SIZE,
    excludeIds: Array.from(seen),
  });
  if (!scored.length) return { userId, playlistId: null, status: 'no_candidates' };

  // Create the playlist.
  const slug = `mixtape-${period}-${userId.slice(-6)}-${uniqueSuffix()}`;
  const playlist = await prisma.playlist.create({
    data: {
      userId,
      title: `Your AI Mixtape — ${period}`,
      slug,
      description: 'Hand-picked by music4ai based on what you loved this week.',
      isPublic: false,
      tracks: {
        create: scored.map((s, i) => ({ trackId: s.id, position: i + 1 })),
      },
    },
    select: { id: true },
  });
  await prisma.userMixtape.create({
    data: { userId, period, playlistId: playlist.id },
  });
  return { userId, playlistId: playlist.id, status: 'created' };
}

export async function generateWeeklyMixtapes(opts: { period?: string; activeWithinDays?: number } = {}) {
  const period = opts.period || isoWeek();
  const since = new Date(Date.now() - (opts.activeWithinDays ?? 30) * 24 * 3_600_000);

  // "Active" users: anyone who liked / played something in the past 30d.
  const activeUserIds = await prisma.user.findMany({
    where: {
      OR: [
        { plays: { some: { createdAt: { gte: since } } } },
        { likes: { some: { createdAt: { gte: since } } } },
      ],
    },
    select: { id: true },
  });
  logger.info('Mixtape job starting', { period, candidates: activeUserIds.length });

  const results: MixtapeResult[] = [];
  for (const u of activeUserIds) {
    try {
      const r = await generateForUser(u.id, period);
      results.push(r);
    } catch (err) {
      logger.warn('Mixtape user failed', { userId: u.id, error: (err as Error).message });
    }
  }
  const created = results.filter((r) => r.status === 'created').length;
  logger.info('Mixtape job complete', { period, created, total: results.length });
  return { period, created, results };
}

if (require.main === module) {
  generateWeeklyMixtapes()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
