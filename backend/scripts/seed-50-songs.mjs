// Seed 50 songs across 10 genre families for the demo@gmail.com account.
//
// - 1 AiAgent per genre family (Iron Reverie already exists for Rock).
// - For each song: generate audio (MiniMax music-2.6) + cover art (MiniMax
//   image-01), upload to Cloudinary, create MusicGeneration + Track rows.
// - Resilient: skip if a Track with the song's title already exists; per-song
//   try/catch so one failure doesn't kill the run.
//
// Required env: DATABASE_URL, MINIMAX_API_KEY, MINIMAX_API_BASE,
// MINIMAX_MUSIC_MODEL, MINIMAX_IMAGE_MODEL, CLOUDINARY_CLOUD_NAME,
// CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { SONGS, AGENTS } from './seed-50-songs-data.mjs';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MINIMAX_BASE = (process.env.MINIMAX_API_BASE || 'https://api.minimax.io/v1').replace(/\/$/, '');
const MUSIC_MODEL = process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
const IMAGE_MODEL = process.env.MINIMAX_IMAGE_MODEL || 'image-01';
const KEY = process.env.MINIMAX_API_KEY;
if (!KEY) throw new Error('MINIMAX_API_KEY missing');

const DEMO_EMAIL = 'demo@gmail.com';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function slugify(s, max = 80) {
  const base = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, max) || 'track';
}

function suffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function callMusic({ prompt, lyrics, isInstrumental }) {
  const body = {
    model: MUSIC_MODEL,
    output_format: 'url',
    audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
    prompt,
  };
  if (isInstrumental) {
    body.is_instrumental = true;
  } else if (lyrics) {
    body.lyrics = lyrics;
  }
  const res = await fetch(`${MINIMAX_BASE}/music_generation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`MiniMax music non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`MiniMax music HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax music ${json.base_resp.status_code}: ${json.base_resp.status_msg}`);
  }
  const audio = json?.data?.audio || json?.data?.audio_url || json?.audio_url;
  let audioUrl, audioHex;
  if (audio) {
    if (/^https?:\/\//i.test(audio)) audioUrl = audio;
    else audioHex = audio;
  }
  const rawDur = json?.extra_info?.music_duration;
  const durationSec =
    typeof rawDur === 'number' ? (rawDur > 1000 ? Math.round(rawDur / 1000) : rawDur) : undefined;
  return { audioUrl, audioHex, durationSec, traceId: json?.trace_id };
}

async function callImage(prompt) {
  const body = {
    model: IMAGE_MODEL,
    prompt,
    response_format: 'url',
    aspect_ratio: '1:1',
    n: 1,
    prompt_optimizer: true,
  };
  const res = await fetch(`${MINIMAX_BASE}/image_generation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`MiniMax image non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`MiniMax image HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax image ${json.base_resp.status_code}: ${json.base_resp.status_msg}`);
  }
  const urls = json?.data?.image_urls || [];
  const b64s = json?.data?.image_base64 || [];
  if (urls[0]) return { url: urls[0] };
  if (b64s[0]) return { base64: b64s[0] };
  throw new Error('image generation returned no images');
}

async function uploadAudio(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'makeyourmusic/audio',
        resource_type: 'video',
        public_id: filename,
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    const r = new Readable();
    r.push(buffer); r.push(null);
    r.pipe(stream);
  });
}

async function uploadImage(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'makeyourmusic/covers',
        resource_type: 'image',
        public_id: filename,
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    const r = new Readable();
    r.push(buffer); r.push(null);
    r.pipe(stream);
  });
}

async function persistAudio(result, label) {
  let buf;
  if (result.audioHex) {
    buf = Buffer.from(result.audioHex, 'hex');
    if (buf.length === 0) throw new Error('empty hex audio');
  } else if (result.audioUrl) {
    const r = await fetch(result.audioUrl);
    if (!r.ok) throw new Error(`audio download failed (${r.status})`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) throw new Error('empty audio download');
  } else {
    throw new Error('MiniMax returned no audio');
  }
  const up = await uploadAudio(buf, `seed50-${label}-${Date.now()}`);
  return up.secure_url;
}

async function persistImage(result, label) {
  let buf;
  if (result.base64) {
    const dataUri = result.base64.startsWith('data:') ? result.base64 : `data:image/png;base64,${result.base64}`;
    const up = await cloudinary.uploader.upload(dataUri, {
      folder: 'makeyourmusic/covers',
      public_id: `seed50-${label}-${Date.now()}`,
      overwrite: false,
    });
    return up.secure_url;
  }
  if (result.url) {
    const r = await fetch(result.url);
    if (!r.ok) throw new Error(`image download failed (${r.status})`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) throw new Error('empty image download');
    const up = await uploadImage(buf, `seed50-${label}-${Date.now()}`);
    return up.secure_url;
  }
  throw new Error('no image data');
}

// ────────────────────────────────────────────────────────────
// Setup: ensure agents exist
// ────────────────────────────────────────────────────────────

async function ensureAgents(userId) {
  const out = {}; // key → agentId
  const genres = await prisma.genre.findMany();
  const genreBySlug = Object.fromEntries(genres.map((g) => [g.slug, g.id]));

  for (const a of AGENTS) {
    let agent = await prisma.aiAgent.findUnique({ where: { slug: a.slug } });
    if (!agent) {
      agent = await prisma.aiAgent.create({
        data: {
          name: a.name,
          slug: a.slug,
          bio: a.bio,
          aiModel: 'MiniMax music-2.6',
          status: 'ACTIVE',
          ownerId: userId,
        },
      });
      console.log(`+ created agent ${a.name} (${a.slug})`);
    } else if (agent.ownerId !== userId) {
      console.warn(`! agent ${a.slug} exists but not owned by demo (owner=${agent.ownerId})`);
    }
    // Ensure genre link
    const gid = genreBySlug[a.genreSlug];
    if (gid) {
      await prisma.aiAgentGenre.upsert({
        where: { agentId_genreId: { agentId: agent.id, genreId: gid } },
        update: {},
        create: { agentId: agent.id, genreId: gid },
      });
    }
    out[a.key] = { agentId: agent.id, genreId: gid };
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// Per-song generate + publish
// ────────────────────────────────────────────────────────────

async function generateAndPublish(song, ctx) {
  const { userId, agentId, genreId } = ctx;
  const titleExists = await prisma.track.findFirst({
    where: { title: song.title, agentId },
    select: { id: true, slug: true },
  });
  if (titleExists) {
    console.log(`= skip "${song.title}" — already published as ${titleExists.slug}`);
    return { skipped: true };
  }

  console.log(`\n── ${song.title}  [${song.genreSlug}]`);

  const isInstrumental = !!song.isInstrumental;
  const lyrics = isInstrumental ? null : song.lyrics;

  // Cap inputs to MiniMax limits
  const MAX_LYR = 3500;
  const MAX_PROMPT = 2000;
  const lyr = lyrics && lyrics.length > MAX_LYR ? lyrics.slice(0, MAX_LYR) : lyrics;
  const prm = song.prompt.length > MAX_PROMPT ? song.prompt.slice(0, MAX_PROMPT) : song.prompt;

  // Persist generation row
  const gen = await prisma.musicGeneration.create({
    data: {
      userId,
      agentId,
      title: song.title,
      prompt: prm,
      lyrics: lyr,
      genre: song.genreLabel,
      mood: song.mood,
      isInstrumental,
      provider: 'minimax',
      providerModel: MUSIC_MODEL,
      status: 'PROCESSING',
    },
  });

  let coverArtUrl = null;
  // Cover art (best-effort: failures shouldn't block the audio generation)
  try {
    const img = await callImage(song.coverPrompt);
    coverArtUrl = await persistImage(img, slugify(song.title, 30));
    console.log(`  ✓ cover: ${coverArtUrl}`);
  } catch (err) {
    console.warn(`  ! cover failed: ${err.message}`);
  }

  // Music
  let result;
  try {
    result = await callMusic({ prompt: prm, lyrics: lyr, isInstrumental });
  } catch (err) {
    await prisma.musicGeneration.update({
      where: { id: gen.id },
      data: { status: 'FAILED', errorMessage: String(err.message).slice(0, 500) },
    });
    throw err;
  }
  console.log(`  ✓ music (duration=${result.durationSec}s, trace=${result.traceId})`);

  let audioUrl;
  try {
    audioUrl = await persistAudio(result, slugify(song.title, 30));
    console.log(`  ✓ audio: ${audioUrl}`);
  } catch (err) {
    await prisma.musicGeneration.update({
      where: { id: gen.id },
      data: { status: 'FAILED', errorMessage: `cloudinary: ${err.message}`.slice(0, 500) },
    });
    throw err;
  }

  await prisma.musicGeneration.update({
    where: { id: gen.id },
    data: {
      status: 'COMPLETED',
      audioUrl,
      coverArt: coverArtUrl,
      durationSec: result.durationSec || null,
      providerTraceId: result.traceId || null,
    },
  });

  // Track
  let slug = slugify(song.title);
  const exists = await prisma.track.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${suffix()}`;

  const track = await prisma.$transaction(async (tx) => {
    const t = await tx.track.create({
      data: {
        title: song.title,
        slug,
        duration: result.durationSec || 240,
        audioUrl,
        coverArt: coverArtUrl,
        status: 'ACTIVE',
        isPublic: true,
        mood: song.mood,
        tags: song.tags || [],
        bpm: song.bpm || null,
        key: song.key || null,
        lyrics: lyr || null,
        aiModel: MUSIC_MODEL,
        aiPrompt: prm,
        agentId,
        genreId,
      },
    });
    await tx.musicGeneration.update({
      where: { id: gen.id },
      data: { trackId: t.id },
    });
    return t;
  });

  console.log(`  ✓ track /${track.slug}  (id=${track.id})`);
  return { trackId: track.id, slug: track.slug };
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error(`demo user not found (${DEMO_EMAIL})`);
  console.log(`Demo user: ${user.id}`);

  const agents = await ensureAgents(user.id);
  console.log(`Agents ready: ${Object.keys(agents).length}`);

  let ok = 0, skipped = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < SONGS.length; i++) {
    const song = SONGS[i];
    const a = agents[song.agentKey];
    if (!a) {
      console.error(`! no agent for key ${song.agentKey}, skipping ${song.title}`);
      failed++;
      failures.push({ title: song.title, error: `unknown agent key ${song.agentKey}` });
      continue;
    }
    try {
      const r = await generateAndPublish(song, {
        userId: user.id,
        agentId: a.agentId,
        genreId: a.genreId,
      });
      if (r?.skipped) skipped++;
      else ok++;
    } catch (err) {
      failed++;
      failures.push({ title: song.title, error: String(err.message).slice(0, 200) });
      console.error(`  ✗ ${song.title} — ${err.message}`);
    }
    console.log(`  [${i + 1}/${SONGS.length}] ok=${ok} skipped=${skipped} failed=${failed}`);
  }

  console.log(`\n═════════════════════════════════════`);
  console.log(`Done. ok=${ok}  skipped=${skipped}  failed=${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    for (const f of failures) console.log(`  - ${f.title}: ${f.error}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
