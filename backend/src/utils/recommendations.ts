// Track recommendations based on a hand-crafted feature vector.
//
// We don't yet compute true audio embeddings (CLAP/OpenL3). That requires a
// GPU-backed inference service and would block the recommendations roadmap.
// Instead we synthesize a fixed-length vector from a track's structured
// metadata: genre, sub-genre, mood, energy, era, BPM, and tag bag. Cosine
// similarity over these vectors is plenty for "more like this", radio mode,
// and weekly mixtapes — and crucially it's a no-op cost at write time.
//
// When real audio embeddings are ready, swap the vector source here and bump
// FEATURE_VERSION to trigger a re-embed for existing rows.

import { prisma } from './db';
import logger from './logger';

export const FEATURE_VERSION = 1;

// Each genre / mood / energy / era / vocal style maps to a fixed slot in the
// vector. New values just append — never reorder, or downstream cosine
// similarity will compare across mismatched dimensions.
const GENRE_SLOTS = [
  'pop', 'rock', 'hip-hop', 'rap', 'electronic', 'edm', 'house', 'techno',
  'trance', 'dnb', 'dubstep', 'lo-fi', 'jazz', 'classical', 'orchestral',
  'r&b', 'soul', 'funk', 'disco', 'country', 'folk', 'indie', 'alternative',
  'metal', 'punk', 'reggae', 'reggaeton', 'latin', 'k-pop', 'j-pop',
  'mandopop', 'afrobeats', 'world', 'ambient', 'cinematic', 'soundtrack',
  'children', 'lullaby', 'meditation', 'sleep', 'study', 'gospel', 'blues',
];

const MOOD_SLOTS = [
  'happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic',
  'uplifting', 'melancholy', 'dark', 'dreamy', 'epic', 'tense', 'playful',
  'sensual', 'aggressive', 'peaceful', 'hopeful', 'lonely', 'triumphant',
];

const ENERGY_SLOTS = ['low', 'medium', 'high', 'explosive'];
const ERA_SLOTS = ['60s', '70s', '80s', '90s', '00s', '10s', '20s', 'modern', 'futuristic', 'classical'];
const VOCAL_SLOTS = ['male', 'female', 'androgynous', 'choir', 'whisper', 'belt', 'rap', 'soft', 'powerful', 'auto-tuned'];

// Numeric slots: BPM bucketed into 60..180 in 20-BPM steps (7 buckets), plus
// duration bucketed into <60s/60-180s/180-300s/>300s (4 buckets).
const BPM_BUCKETS = 7;
const DURATION_BUCKETS = 4;

const VECTOR_LEN =
  GENRE_SLOTS.length +
  MOOD_SLOTS.length +
  ENERGY_SLOTS.length +
  ERA_SLOTS.length +
  VOCAL_SLOTS.length +
  BPM_BUCKETS +
  DURATION_BUCKETS +
  1; // +1 for "is_instrumental"

function setOneHot(vec: number[], slots: readonly string[], offset: number, value: string | null | undefined) {
  if (!value) return;
  const lower = value.toLowerCase().trim();
  // Match by exact string or substring. Pop/k-pop both light up pop.
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s) continue;
    if (s === lower || lower.includes(s)) {
      vec[offset + i] = 1;
    }
  }
}

function bpmBucket(bpm: number | null | undefined): number {
  if (!bpm || bpm <= 0) return -1;
  // 60..80, 80..100, ..., 180+
  const bucket = Math.min(BPM_BUCKETS - 1, Math.max(0, Math.floor((bpm - 60) / 20)));
  return bucket;
}

function durationBucket(sec: number): number {
  if (sec < 60) return 0;
  if (sec < 180) return 1;
  if (sec < 300) return 2;
  return 3;
}

export interface TrackFeatureInput {
  duration: number;
  isInstrumental?: boolean | null;
  bpm?: number | null;
  mood?: string | null;
  tags?: string[] | null;
  // Pulled from related models when available
  genre?: { name?: string | null; slug?: string | null } | null;
  // Pulled from the source generation when available
  generationGenre?: string | null;
  generationSubGenre?: string | null;
  generationMood?: string | null;
  generationEnergy?: string | null;
  generationEra?: string | null;
  generationVocalStyle?: string | null;
}

export function computeFeatureVector(input: TrackFeatureInput): number[] {
  const vec = new Array<number>(VECTOR_LEN).fill(0);

  let offset = 0;
  setOneHot(vec, GENRE_SLOTS, offset, input.genre?.slug || input.genre?.name || input.generationGenre);
  setOneHot(vec, GENRE_SLOTS, offset, input.generationSubGenre);
  offset += GENRE_SLOTS.length;

  setOneHot(vec, MOOD_SLOTS, offset, input.mood || input.generationMood);
  offset += MOOD_SLOTS.length;

  setOneHot(vec, ENERGY_SLOTS, offset, input.generationEnergy);
  offset += ENERGY_SLOTS.length;

  setOneHot(vec, ERA_SLOTS, offset, input.generationEra);
  offset += ERA_SLOTS.length;

  setOneHot(vec, VOCAL_SLOTS, offset, input.generationVocalStyle);
  offset += VOCAL_SLOTS.length;

  const bb = bpmBucket(input.bpm ?? null);
  if (bb >= 0) vec[offset + bb] = 1;
  offset += BPM_BUCKETS;

  vec[offset + durationBucket(input.duration)] = 1;
  offset += DURATION_BUCKETS;

  vec[offset] = input.isInstrumental ? 1 : 0;

  // Tags add fractional weight to existing slots if they happen to match a
  // known mood / genre. They never extend the vector length.
  if (input.tags?.length) {
    for (const tag of input.tags) {
      const lower = tag.toLowerCase().trim();
      let off = 0;
      for (let i = 0; i < GENRE_SLOTS.length; i++) {
        if (GENRE_SLOTS[i] === lower) vec[off + i] = Math.max(vec[off + i] ?? 0, 0.6);
      }
      off += GENRE_SLOTS.length;
      for (let i = 0; i < MOOD_SLOTS.length; i++) {
        if (MOOD_SLOTS[i] === lower) vec[off + i] = Math.max(vec[off + i] ?? 0, 0.6);
      }
    }
  }

  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function computeAndPersistTrackFeatures(trackId: string): Promise<void> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      genre: { select: { name: true, slug: true } },
      generations: {
        select: {
          genre: true,
          subGenre: true,
          mood: true,
          energy: true,
          era: true,
          vocalStyle: true,
          isInstrumental: true,
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!track) return;

  const gen = track.generations[0];
  const vec = computeFeatureVector({
    duration: track.duration,
    isInstrumental: gen?.isInstrumental ?? false,
    bpm: track.bpm ?? null,
    mood: track.mood ?? null,
    tags: track.tags ?? [],
    genre: track.genre,
    generationGenre: gen?.genre,
    generationSubGenre: gen?.subGenre,
    generationMood: gen?.mood,
    generationEnergy: gen?.energy,
    generationEra: gen?.era,
    generationVocalStyle: gen?.vocalStyle,
  });

  await prisma.track.update({
    where: { id: trackId },
    data: { featureVector: vec, featureVersion: FEATURE_VERSION },
  });
}

export interface SimilarOpts {
  limit?: number;
  excludeIds?: string[];
  agentId?: string;
  genreId?: string;
}

// Find tracks most similar to a seed vector. Returns up to `limit` rows
// ordered by descending cosine similarity. Filters out: takedowns, private
// tracks, and tracks without a feature vector.
export async function findSimilarTracks(
  seedVector: number[],
  opts: SimilarOpts = {}
): Promise<Array<{ id: string; score: number }>> {
  if (!seedVector.length) return [];
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  // Pull a candidate set first — narrowing by agent/genre when supplied.
  // For the broad case we cap candidates at 1000 most-recently-active to
  // avoid scoring the entire catalog.
  const candidates = await prisma.track.findMany({
    where: {
      isPublic: true,
      status: 'ACTIVE',
      takedownStatus: null,
      featureVersion: { gt: 0 },
      id: opts.excludeIds?.length ? { notIn: opts.excludeIds } : undefined,
      agentId: opts.agentId || undefined,
      genreId: opts.genreId || undefined,
    },
    select: { id: true, featureVector: true },
    take: 1000,
    orderBy: [{ trendingScore: 'desc' }, { createdAt: 'desc' }],
  });

  const scored = candidates
    .map((t) => ({ id: t.id, score: cosineSimilarity(seedVector, t.featureVector as number[]) }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

// Bulk recompute. Useful as a cron job after FEATURE_VERSION bumps.
export async function recomputeAllFeatures(maxRows = 500): Promise<number> {
  const stale = await prisma.track.findMany({
    where: { OR: [{ featureVersion: { lt: FEATURE_VERSION } }, { featureVersion: 0 }] },
    select: { id: true },
    take: maxRows,
  });
  let n = 0;
  for (const row of stale) {
    try {
      await computeAndPersistTrackFeatures(row.id);
      n += 1;
    } catch (err) {
      logger.warn('Feature recompute failed', { trackId: row.id, error: (err as Error).message });
    }
  }
  return n;
}
