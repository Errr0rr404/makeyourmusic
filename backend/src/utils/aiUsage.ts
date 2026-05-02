import { prisma } from './db';

export type Tier = 'FREE' | 'CREATOR' | 'PREMIUM';

export interface UsageSummary {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  tier: Tier;
  /** True when the user is on the internal-tester allowlist and the limit is a sentinel high value. */
  unlimited?: boolean;
}

// Internal test accounts that should never hit the daily AI generation cap.
// `AI_GEN_UNLIMITED_USER_IDS` is a comma-separated list of either user IDs or
// email addresses. We support both because IDs are stable across renames but
// emails are easier to set by a human ops operator. Empty / unset = no
// allowlist (the previous behaviour).
const UNLIMITED_LIMIT_SENTINEL = 99_999;

function getUnlimitedAllowlist(): string[] {
  const raw = process.env.AI_GEN_UNLIMITED_USER_IDS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

async function isUnlimitedUser(userId: string): Promise<boolean> {
  const allowlist = getUnlimitedAllowlist();
  if (allowlist.length === 0) return false;
  if (allowlist.includes(userId.toLowerCase())) return true;
  // Only fetch the user record if at least one allowlist entry looks like an
  // email — otherwise it's wasted DB load on every assertCanGenerate() call.
  const hasEmailEntries = allowlist.some((e) => e.includes('@'));
  if (!hasEmailEntries) return false;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u?.email) return false;
  return allowlist.includes(u.email.toLowerCase());
}

function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function nextUtcDay(now: Date = new Date()): Date {
  const d = startOfUtcDay(now);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function limitForTier(tier: Tier): number {
  if (tier === 'PREMIUM') {
    return parseInt(process.env.AI_GEN_DAILY_PREMIUM_LIMIT || '500', 10);
  }
  if (tier === 'CREATOR') {
    return parseInt(process.env.AI_GEN_DAILY_CREATOR_LIMIT || '50', 10);
  }
  return parseInt(process.env.AI_GEN_DAILY_FREE_LIMIT || '5', 10);
}

async function getUserTier(userId: string): Promise<Tier> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });
  if (!sub || sub.status !== 'ACTIVE') return 'FREE';
  if (sub.tier === 'PREMIUM') return 'PREMIUM';
  if (sub.tier === 'CREATOR') return 'CREATOR';
  return 'FREE';
}

export async function getDailyUsage(userId: string): Promise<UsageSummary> {
  const since = startOfUtcDay();
  const tier = await getUserTier(userId);
  const unlimited = await isUnlimitedUser(userId);
  // Internal-tester allowlist short-circuits the per-tier cap. We keep the
  // tier label honest (so admin views and downstream feature gates that key
  // on tier behave as expected) and only inflate the limit + flag the row.
  const limit = unlimited ? UNLIMITED_LIMIT_SENTINEL : limitForTier(tier);

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
    unlimited: unlimited || undefined,
  };
}

/**
 * Throws an error whose .statusCode is 429 if the user has hit their daily AI
 * generation limit. Call before starting a generation.
 */
export async function assertCanGenerate(userId: string): Promise<UsageSummary> {
  const summary = await getDailyUsage(userId);
  if (summary.remaining <= 0) {
    const tierMsg =
      summary.tier === 'FREE'
        ? `Daily free-tier limit reached (${summary.limit}/day). Upgrade to Creator for ${parseInt(
            process.env.AI_GEN_DAILY_CREATOR_LIMIT || '50',
            10
          )}/day.`
        : `Daily limit reached (${summary.limit}/day). Resets at ${summary.resetsAt}.`;
    const err = new Error(tierMsg) as Error & { statusCode?: number; usage?: UsageSummary };
    err.statusCode = 429;
    err.usage = summary;
    throw err;
  }
  return summary;
}
