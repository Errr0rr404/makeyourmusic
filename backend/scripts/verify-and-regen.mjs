// Verify every demo@gmail.com track's audio URL is still alive on Cloudinary.
// For any 404'd track, regenerate audio with MiniMax using the stored prompt
// + lyrics, re-upload to Cloudinary, and update track.audioUrl.
//
// Same env requirements as seed-50-songs.mjs (DATABASE_URL, MINIMAX_*, CLOUDINARY_*).
//
// Modes:
//   VERIFY_ONLY=1 → only print which tracks are missing, don't regenerate.
//   FORCE_REGEN=<slug> → regenerate that single track regardless of HEAD status.

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MINIMAX_BASE = (process.env.MINIMAX_API_BASE || 'https://api.minimax.io/v1').replace(/\/$/, '');
const MUSIC_MODEL = process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
const KEY = process.env.MINIMAX_API_KEY;
if (!KEY) throw new Error('MINIMAX_API_KEY missing');

const DEMO_EMAIL = 'demo@gmail.com';
const VERIFY_ONLY = !!process.env.VERIFY_ONLY;
const FORCE_REGEN = process.env.FORCE_REGEN || null;

function slugify(s, max = 30) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'track';
}

async function headOk(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function callMusic({ prompt, lyrics, isInstrumental }) {
  const body = {
    model: MUSIC_MODEL,
    output_format: 'url',
    audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
    prompt,
  };
  if (isInstrumental) body.is_instrumental = true;
  else if (lyrics) body.lyrics = lyrics;

  const res = await fetch(`${MINIMAX_BASE}/music_generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`MiniMax non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax ${json.base_resp.status_code}: ${json.base_resp.status_msg}`);
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

async function uploadAudioBuf(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'makeyourmusic/audio', resource_type: 'video', public_id: filename, overwrite: false },
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
  const up = await uploadAudioBuf(buf, `regen-${label}-${Date.now()}`);
  return up.secure_url;
}

async function regenerateOne(track) {
  const isInstrumental = !track.lyrics || track.lyrics.trim().length < 30;
  const prompt = track.aiPrompt || `${track.title} — ${track.mood || ''} ${(track.tags || []).join(', ')}`.slice(0, 1500);
  const lyrics = isInstrumental ? null : track.lyrics;

  console.log(`  → regen "${track.title}" (instrumental=${isInstrumental})`);

  const result = await callMusic({ prompt, lyrics, isInstrumental });
  console.log(`    ✓ MiniMax (${result.durationSec}s, trace=${result.traceId})`);

  const newUrl = await persistAudio(result, slugify(track.title));
  console.log(`    ✓ Cloudinary: ${newUrl}`);

  // Raw SQL to dodge local schema drift (e.g. tracks.trending_score not yet in prod).
  const newDuration = result.durationSec || track.duration;
  await prisma.$executeRaw`
    UPDATE tracks
    SET audio_url = ${newUrl},
        duration = ${newDuration},
        ai_model = ${MUSIC_MODEL},
        updated_at = NOW()
    WHERE id = ${track.id}
  `;
  console.log(`    ✓ DB updated`);
  return newUrl;
}

async function main() {
  // Use raw SQL to dodge the local schema drift (users.referral_code mismatch)
  const tracks = await prisma.$queryRaw`
    SELECT t.id, t.title, t.slug, t.audio_url AS "audioUrl", t.cover_art AS "coverArt",
           t.lyrics, t.ai_prompt AS "aiPrompt", t.mood, t.tags, t.duration,
           a.name AS "agentName"
    FROM tracks t
    JOIN ai_agents a ON a.id = t.agent_id
    JOIN users u ON u.id = a.owner_id
    WHERE u.email = ${DEMO_EMAIL}
    ORDER BY a.name, t.title
  `;
  console.log(`Demo tracks: ${tracks.length}\n`);

  const broken = [];
  const ok = [];

  if (FORCE_REGEN) {
    const t = tracks.find((x) => x.slug === FORCE_REGEN);
    if (!t) {
      console.error(`! no track with slug ${FORCE_REGEN}`);
      process.exit(1);
    }
    console.log(`FORCE_REGEN mode for ${t.slug}`);
    broken.push(t);
  } else {
    // HEAD-check audio URLs
    console.log('Verifying audio URLs (HEAD)...');
    const checks = await Promise.all(
      tracks.map(async (t) => ({ track: t, alive: await headOk(t.audioUrl) }))
    );
    for (const c of checks) {
      if (c.alive) ok.push(c.track);
      else broken.push(c.track);
    }
    console.log(`  alive: ${ok.length}`);
    console.log(`  broken: ${broken.length}`);
    if (broken.length) {
      console.log('\nBroken:');
      for (const t of broken) console.log(`  - ${t.agentName}: ${t.title} (${t.slug}) → ${t.audioUrl}`);
    }
  }

  if (VERIFY_ONLY) {
    console.log('\n(VERIFY_ONLY=1, not regenerating)');
    await prisma.$disconnect();
    return;
  }

  if (broken.length === 0) {
    console.log('\nNothing to regenerate — all audio URLs alive.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nRegenerating ${broken.length}...`);
  let okCount = 0, failCount = 0;
  const failures = [];
  for (let i = 0; i < broken.length; i++) {
    const t = broken[i];
    try {
      await regenerateOne(t);
      okCount++;
    } catch (err) {
      failCount++;
      failures.push({ slug: t.slug, error: String(err.message).slice(0, 200) });
      console.error(`    ✗ ${t.slug} — ${err.message}`);
    }
    console.log(`  [${i + 1}/${broken.length}] ok=${okCount} failed=${failCount}`);
  }

  console.log(`\nDone. regenerated=${okCount} failed=${failCount}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.slug}: ${f.error}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
