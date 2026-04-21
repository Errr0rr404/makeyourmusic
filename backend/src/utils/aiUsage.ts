import { prisma } from './db';

export interface UsageSummary {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  tier: 'FREE' | 'PREMIUM';
}

function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function nextUtcDay(now: Date = new Date()): Date {
  const d = startOfUtcDay(now);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function limitForTier(tier: 'FREE' | 'PREMIUM'): number {
  if (tier === 'PREMIUM') {
    return parseInt(process.env.AI_GEN_DAILY_PREMIUM_LIMIT || '100', 10);
  }
  return parseInt(process.env.AI_GEN_DAILY_FREE_LIMIT || '5', 10);
}

async function getUserTier(userId: string): Promise<'FREE' | 'PREMIUM'> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });
  if (sub && sub.tier === 'PREMIUM' && sub.status === 'ACTIVE') return 'PREMIUM';
  return 'FREE';
}

export async function getDailyUsage(userId: string): Promise<UsageSummary> {
  const since = startOfUtcDay();
  const tier = await getUserTier(userId);
  const limit = limitForTier(tier);

  const [musicCount, videoCount] = await Promise.all([
    prisma.musicGeneration.count({
      where: { userId, createdAt: { gte: since } },
    }),
    prisma.videoGeneration.count({
      where: { userId, createdAt: { gte: since } },
    }),
  ]);
  const used = musicCount + videoCount;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: nextUtcDay().toISOString(),
    tier,
  };
}

/**
 * Throws an error whose .statusCode is 429 if the user has hit their daily AI
 * generation limit. Call before starting a generation.
 */
export async function assertCanGenerate(userId: string): Promise<UsageSummary> {
  const summary = await getDailyUsage(userId);
  if (summary.remaining <= 0) {
    const err = new Error(
      summary.tier === 'PREMIUM'
        ? `Daily limit reached (${summary.limit}/day). Resets at ${summary.resetsAt}.`
        : `Daily free-tier limit reached (${summary.limit}/day). Upgrade to Premium for more.`
    ) as Error & { statusCode?: number; usage?: UsageSummary };
    err.statusCode = 429;
    err.usage = summary;
    throw err;
  }
  return summary;
}
