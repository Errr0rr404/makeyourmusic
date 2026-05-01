// Generate cover art for tracks that were published without one (e.g. when
// the cover-art provider was temporarily down) and PATCH it onto the track.
//
// Usage:
//   cd backend && npx ts-node --transpile-only scripts/backfill-covers.ts <slug1,slug2,...>
//   cd backend && SLUGS=glasshouse-mornings,backseat-cathedral npx ts-node ... scripts/backfill-covers.ts
//
// Prefers SLUGS env var; falls back to first CLI arg.

import axios, { AxiosError } from 'axios';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE || 'https://makeyourmusic.up.railway.app/api';
const EMAIL = process.env.DEMO_EMAIL || 'demo@gmail.com';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo123';

const slugsArg = process.env.SLUGS || process.argv[2] || '';
const SLUGS = slugsArg
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

if (SLUGS.length === 0) {
  console.error('No slugs supplied. Pass via SLUGS=a,b,c env or first CLI arg.');
  process.exit(1);
}

let token = '';
let issuedAt = 0;
async function getToken(force = false): Promise<string> {
  if (force || !token || Date.now() - issuedAt > 12 * 60_000) {
    const res = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
    token = res.data.accessToken as string;
    issuedAt = Date.now();
  }
  return token;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function authedRetry<T>(label: string, fn: (t: string) => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const t = await getToken();
      return await fn(t);
    } catch (err) {
      lastErr = err;
      const e = err as AxiosError<{ error?: string }>;
      const status = e.response?.status;
      if (status === 401) {
        await getToken(true);
        continue;
      }
      if (status === 429 && /Too many AI requests/i.test(e.response?.data?.error || '')) {
        console.warn(`    ${label} burst 429 attempt ${attempt}/${maxAttempts}; sleeping 65s`);
        await sleep(65_000);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

interface TrackLite {
  id: string;
  slug: string;
  title: string;
  coverArt: string | null;
  genre: { name: string; slug: string } | null;
  mood: string | null;
}

async function fetchTrack(slug: string): Promise<TrackLite | null> {
  try {
    const res = await axios.get(`${API_BASE}/tracks/${slug}`);
    const t = res.data.track || res.data;
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      coverArt: t.coverArt || null,
      genre: t.genre ? { name: t.genre.name, slug: t.genre.slug } : null,
      mood: t.mood || null,
    };
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    console.warn(`  ${slug}: fetch failed (${e.response?.status || ''} ${e.response?.data?.error || e.message})`);
    return null;
  }
}

async function generateCover(track: TrackLite): Promise<string | null> {
  const body = {
    title: track.title,
    prompt: track.title,
    genre: track.genre?.name,
    mood: track.mood || undefined,
    aspectRatio: '1:1',
  };
  try {
    const res = await authedRetry('POST /ai/cover-art', (t) =>
      axios.post(`${API_BASE}/ai/cover-art`, body, {
        headers: { Authorization: `Bearer ${t}` },
      })
    );
    return (res.data.coverArt as string) || null;
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    console.warn(`  ${track.slug}: cover gen failed (${e.response?.data?.error || e.message})`);
    return null;
  }
}

async function patchCover(trackId: string, coverArt: string): Promise<boolean> {
  try {
    await authedRetry('PATCH /tracks/:id/cover', (t) =>
      axios.patch(
        `${API_BASE}/tracks/${trackId}/cover`,
        { coverArt },
        { headers: { Authorization: `Bearer ${t}` } }
      )
    );
    return true;
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    console.warn(`  patch failed: ${e.response?.data?.error || e.message}`);
    return false;
  }
}

async function main() {
  console.log(`Backfilling covers for ${SLUGS.length} tracks: ${SLUGS.join(', ')}`);
  await getToken(true);

  for (const slug of SLUGS) {
    console.log(`\n→ ${slug}`);
    const track = await fetchTrack(slug);
    if (!track) continue;
    if (track.coverArt) {
      console.log(`  already has cover, skipping`);
      continue;
    }
    const url = await generateCover(track);
    if (!url) continue;
    console.log(`  cover generated: ${url.slice(0, 70)}...`);
    const ok = await patchCover(track.id, url);
    if (ok) console.log(`  ✓ cover backfilled on /track/${track.slug}`);
    // Spacing under the AI burst limiter (20/60s, shared with cover-art).
    await sleep(8_000);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
