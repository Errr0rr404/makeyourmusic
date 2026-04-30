// Estimated $ cost per AI generation. Numbers are MiniMax + OpenAI list prices
// rounded to the nearest reasonable estimate so the admin panel can show real
// spend trends without us having to wire up provider-side billing webhooks.
//
// Override any value via env (e.g. COST_MUSIC_GEN_USD=0.04) when prices change.

const num = (key: string, fallback: number): number => {
  const v = parseFloat(process.env[key] || '');
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

// Per-call estimates (USD)
const COST_MUSIC = () => num('COST_MUSIC_GEN_USD', 0.05); // music-2.6 / music-cover
const COST_VIDEO_6S = () => num('COST_VIDEO_6S_USD', 0.3); // 6s @ 768p Hailuo Fast
const COST_VIDEO_10S = () => num('COST_VIDEO_10S_USD', 0.5);
const COST_VIDEO_1080 = () => num('COST_VIDEO_1080_USD', 0.6);
const COST_IMAGE = () => num('COST_IMAGE_GEN_USD', 0.01); // image-01 cover art
const COST_LYRICS = () => num('COST_LYRICS_GEN_USD', 0.002); // chat-completion lyrics

export interface MusicGenLite {
  status: string;
  providerModel?: string | null;
  durationSec?: number | null;
}

export interface VideoGenLite {
  status: string;
  resolution?: string | null;
  durationSec?: number | null;
}

export const estimateMusicCost = (gen: MusicGenLite): number => {
  // Failed generations still cost the provider call. PENDING ones haven't run.
  if (gen.status === 'PENDING') return 0;
  return COST_MUSIC();
};

export const estimateVideoCost = (gen: VideoGenLite): number => {
  if (gen.status === 'PENDING') return 0;
  const dur = gen.durationSec || 6;
  if (gen.resolution === '1080P') return COST_VIDEO_1080();
  return dur >= 10 ? COST_VIDEO_10S() : COST_VIDEO_6S();
};

export const COSTS = {
  perMusic: () => COST_MUSIC(),
  perVideo6s: () => COST_VIDEO_6S(),
  perVideo10s: () => COST_VIDEO_10S(),
  perImage: () => COST_IMAGE(),
  perLyrics: () => COST_LYRICS(),
};

// Subscription gross revenue in USD per active sub per month. Mirrors the
// pricing page so the admin dashboard reflects what the customer actually pays.
export const SUB_PRICE_USD: Record<string, number> = {
  FREE: 0,
  CREATOR: parseFloat(process.env.PRICE_CREATOR_USD || '3.99'),
  PREMIUM: parseFloat(process.env.PRICE_PREMIUM_USD || '14.99'),
};
