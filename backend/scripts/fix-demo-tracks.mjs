// Fix the defects identified by audit-demo-tracks.mjs:
//
//   1. Lyrics cleanup (in-place, no audio regen — audio is fine):
//        - strip [Guitar Solo]/[Sax Solo]/[Synth Solo]/[Talkbox Breakdown] etc.
//        - normalize non-canonical headers like "[Intro — pad swell]" → "[Intro]"
//        - drop parenthetical stage-direction lines that mention instruments,
//          production techniques, or transport cues
//        - keep short sung ad-libs like "(woah)", "(yeah)"
//
//   2. Missing/dead cover art:
//        - build a cover prompt from track metadata (title, genre, mood,
//          first lines of lyrics)
//        - call MiniMax image-01, upload to Cloudinary, update tracks.cover_art
//
//   3. Missing genre: assign a sensible default from agent's genre link.
//
// Reads /tmp/demo-audit.json (produced by audit-demo-tracks.mjs).

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import fs from 'fs';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MINIMAX_BASE = (process.env.MINIMAX_API_BASE || 'https://api.minimax.io/v1').replace(/\/$/, '');
const IMAGE_MODEL = process.env.MINIMAX_IMAGE_MODEL || 'image-01';
const CHAT_MODEL = process.env.MINIMAX_SEED_CHAT_MODEL || 'MiniMax-M2';
const KEY = process.env.MINIMAX_API_KEY;
if (!KEY) throw new Error('MINIMAX_API_KEY missing');

const SNAPSHOT_PATH = '/tmp/demo-audit.json';

// ────────────────────────────────────────────────────────────
// Lyrics cleaner
// ────────────────────────────────────────────────────────────

const CANONICAL_TAGS = [
  'Intro', 'Verse 1', 'Verse 2', 'Verse 3', 'Verse 4',
  'Pre-Chorus', 'Chorus', 'Post-Chorus', 'Bridge', 'Final Chorus', 'Outro',
];

const FORBIDDEN_TAG_RX = /^\s*\[(?:Guitar|Sax|Synth|Whistle|Drum|Talkbox|Vocoder|Bass|Trumpet|Sax|Solo)[^\]]*\]\s*$/i;
const FORBIDDEN_BREAKDOWN_RX = /^\s*\[(?:Breakdown|Vocal\s*chop|Vocal\s*Breakdown|Filter\s*Breakdown|Instrumental)[^\]]*\]\s*$/i;
const NON_CANONICAL_HEADER_RX = /^\s*\[(Intro|Verse(?:\s*\d+)?|Pre[- ]?Chorus|Chorus|Post[- ]?Chorus|Bridge|Final\s*Chorus|Outro)\s+[—\-–:].+\]\s*$/i;
// Also catches `[Hook]` (used in hip-hop lyrics) → keep as `[Chorus]`
const HOOK_RX = /^\s*\[\s*Hook[^\]]*\]\s*$/i;

const INSTRUMENT_WORDS = /\b(guitar|drum|kick|snare|hi-?hat|bass|synth|piano|rhodes|wurlitzer|organ|hammond|sax|trumpet|brass|horn|strings?|cello|violin|brushed|cymbal|tambourine|cajon|congas?|bongos|tape|hiss|crackle|fade|swell|filter|sweep|arpeggio|riff|lead|pad|808|kit|loop|click|fill|talkbox|vocoder|harmonizer|melodica|theremin|whistle|stomp|clap|clink|chime|bell|tom)\b/i;
const TRANSPORT_WORDS = /\b(intro|outro|build(?:s|ing)?|drops?|breaks?|tape\s*stop|silence|enter|fade|begin|lift|tutti|chorus\s*explodes|kicks\s*in|pulls\s*back|wide\s*open|drum\s*break|rolls\s*in)\b/i;
const ALLOWED_AD_LIB_RX = /^\s*\(\s*(?:[a-z'\-]{1,12}(?:[\s,-][a-z'\-]{1,12}){0,4})\s*\)\s*$/i;

function cleanParenLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return line;
  // Allow short sung ad-libs.
  if (ALLOWED_AD_LIB_RX.test(trimmed)) return line;
  // Otherwise: if it mentions instruments OR transport cues, drop it.
  const inner = trimmed.slice(1, -1);
  if (INSTRUMENT_WORDS.test(inner) || TRANSPORT_WORDS.test(inner)) return null;
  return line;
}

function normalizeBracketTag(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return line;

  if (FORBIDDEN_TAG_RX.test(trimmed)) return null;
  if (FORBIDDEN_BREAKDOWN_RX.test(trimmed)) return null;

  const m = trimmed.match(NON_CANONICAL_HEADER_RX);
  if (m) {
    return `[${m[1].replace(/\s+/g, ' ').replace(/-/g, '-')}]`;
  }
  if (HOOK_RX.test(trimmed)) {
    return '[Chorus]';
  }
  return line;
}

function cleanLyrics(raw) {
  if (!raw) return raw;
  const out = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    let line = rawLine;
    if (line.trim().startsWith('[')) {
      line = normalizeBracketTag(line);
      if (line == null) continue; // forbidden tag — drop
    } else if (line.trim().startsWith('(')) {
      line = cleanParenLine(line);
      if (line == null) continue; // stage direction — drop
    }
    out.push(line);
  }
  // Collapse runs of >2 blank lines
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

// ────────────────────────────────────────────────────────────
// Cover art generator
// ────────────────────────────────────────────────────────────

async function minimaxChat({ messages, maxTokens = 1200, temperature = 0.7 }) {
  const res = await fetch(`${MINIMAX_BASE}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CHAT_MODEL, messages, max_tokens: maxTokens, temperature, stream: false }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`chat non-JSON (${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok || (json.base_resp && json.base_resp.status_code !== 0)) {
    throw new Error(`chat err: ${text.slice(0, 200)}`);
  }
  let s = json?.choices?.[0]?.message?.content ?? '';
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  return s;
}

async function minimaxImage(prompt) {
  const res = await fetch(`${MINIMAX_BASE}/image_generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IMAGE_MODEL, prompt, response_format: 'url', aspect_ratio: '1:1', n: 1, prompt_optimizer: true,
    }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`image non-JSON (${res.status})`); }
  if (!res.ok || (json.base_resp && json.base_resp.status_code !== 0)) {
    throw new Error(`image err: ${text.slice(0, 200)}`);
  }
  const urls = json?.data?.image_urls || [];
  const b64s = json?.data?.image_base64 || [];
  if (urls[0]) return { url: urls[0] };
  if (b64s[0]) return { base64: b64s[0] };
  throw new Error('no image data');
}

function slugify(s, max = 30) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'track';
}

async function uploadImageBuf(buf, label) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'makeyourmusic/covers', resource_type: 'image', public_id: `fix-${label}-${Date.now()}`, overwrite: false },
      (err, r) => err ? reject(err) : resolve(r)
    );
    const r = new Readable(); r.push(buf); r.push(null); r.pipe(stream);
  });
}

async function persistImage(result, label) {
  if (result.base64) {
    const dataUri = result.base64.startsWith('data:') ? result.base64 : `data:image/png;base64,${result.base64}`;
    const up = await cloudinary.uploader.upload(dataUri, {
      folder: 'makeyourmusic/covers', public_id: `fix-${label}-${Date.now()}`, overwrite: false,
    });
    return up.secure_url;
  }
  if (result.url) {
    const r = await fetch(result.url);
    if (!r.ok) throw new Error(`download failed (${r.status})`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) throw new Error('empty buf');
    return (await uploadImageBuf(buf, label)).secure_url;
  }
  throw new Error('no image data');
}

async function buildCoverPrompt(track) {
  const lyricsHead = (track.lyricsHead || '').slice(0, 400);
  const inputs = [
    `Title: ${track.title}`,
    `Genre: ${track.genre || 'Pop'}`,
    `Mood / energy: ${track.mood || ''}`,
    `BPM: ${track.bpm || '?'}, Key: ${track.key || '?'}`,
    `Lyrical voice opening: ${lyricsHead.replace(/\n/g, ' / ')}`,
  ].join('\n');
  const system =
    `You are an album-cover art director. Given a song's metadata, write a single visual prompt (60-110 words) for an image-generation model that captures the song's mood, genre, and core imagery. ` +
    `RULES: ` +
    `(1) Square 1:1 album-cover aesthetic. ` +
    `(2) Be specific — name medium (oil painting, 35mm photograph, digital illustration, etc.), lighting, palette, focal subject. ` +
    `(3) NEVER include text, typography, song titles, or band logos in the image. ` +
    `(4) NEVER include real artist names, brand names, or copyrighted characters. ` +
    `(5) Output ONLY the prompt, one paragraph, no commentary.`;
  return minimaxChat({
    messages: [{ role: 'system', content: system }, { role: 'user', content: inputs }],
    maxTokens: 1000, temperature: 0.8,
  });
}

// ────────────────────────────────────────────────────────────
// Fixer
// ────────────────────────────────────────────────────────────

async function main() {
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  console.log(`Audit snapshot: ${snap.totalTracks} total, ${snap.defects.length} with defects`);

  const stats = { lyricsCleaned: 0, coversAdded: 0, coversReplaced: 0, genresFixed: 0, errors: [] };

  for (const d of snap.defects) {
    const kinds = new Set(d.defects.map((x) => x.kind));
    console.log(`\n── ${d.agent}: ${d.title} [${[...kinds].join(',')}]`);

    // 1. Lyric defects (cleanup in DB, no audio regen needed)
    if (kinds.has('FORBIDDEN_INSTRUMENTAL_TAG') || kinds.has('STAGE_DIRECTIONS') || kinds.has('NO_SECTION_TAGS')) {
      // Need full lyrics, not just head — pull from DB.
      const rows = await prisma.$queryRaw`SELECT lyrics FROM tracks WHERE id = ${d.id}`;
      const lyrics = rows[0]?.lyrics || '';
      const cleaned = cleanLyrics(lyrics);
      if (cleaned !== lyrics) {
        await prisma.$executeRaw`UPDATE tracks SET lyrics = ${cleaned}, updated_at = NOW() WHERE id = ${d.id}`;
        console.log(`  ✓ lyrics cleaned (${lyrics.length} → ${cleaned.length} chars)`);
        stats.lyricsCleaned++;
      } else {
        console.log(`  = lyrics unchanged after clean`);
      }
    }

    // 2. Cover defects (regenerate)
    if (kinds.has('NO_COVER') || kinds.has('COVER_DEAD')) {
      try {
        const prompt = await buildCoverPrompt(d);
        console.log(`  → cover prompt: ${prompt.slice(0, 120)}...`);
        const img = await minimaxImage(prompt);
        const url = await persistImage(img, slugify(d.title));
        await prisma.$executeRaw`UPDATE tracks SET cover_art = ${url}, updated_at = NOW() WHERE id = ${d.id}`;
        console.log(`  ✓ cover: ${url}`);
        if (kinds.has('COVER_DEAD')) stats.coversReplaced++;
        else stats.coversAdded++;
      } catch (err) {
        console.error(`  ✗ cover failed: ${err.message}`);
        stats.errors.push({ id: d.id, title: d.title, kind: 'cover', error: err.message });
      }
    }

    // 3. Genre defect — assign agent's primary genre
    if (kinds.has('NO_GENRE')) {
      const rows = await prisma.$queryRaw`
        SELECT g.id, g.name FROM genres g
        JOIN ai_agent_genres ag ON ag.genre_id = g.id
        WHERE ag.agent_id = (SELECT agent_id FROM tracks WHERE id = ${d.id})
        LIMIT 1
      `;
      if (rows[0]) {
        await prisma.$executeRaw`UPDATE tracks SET genre_id = ${rows[0].id}, updated_at = NOW() WHERE id = ${d.id}`;
        console.log(`  ✓ assigned genre: ${rows[0].name}`);
        stats.genresFixed++;
      } else {
        console.log(`  ! could not find a genre to assign`);
      }
    }
  }

  console.log(`\n═══════════════════════`);
  console.log(`lyrics cleaned:   ${stats.lyricsCleaned}`);
  console.log(`covers added:     ${stats.coversAdded}`);
  console.log(`covers replaced:  ${stats.coversReplaced}`);
  console.log(`genres fixed:     ${stats.genresFixed}`);
  console.log(`errors:           ${stats.errors.length}`);
  for (const e of stats.errors) console.log(`  - ${e.title}: ${e.kind}: ${e.error}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
