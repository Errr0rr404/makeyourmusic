// Seed 10 songs across "famous" genres (heavy metal, country, R&B, punk,
// reggae, funk, folk, blues, disco, gospel-soul) using MiniMax-AUTHORED lyrics.
//
// This script mirrors what a real user does on /create when they type ONLY
// a single-sentence idea and let the system fill in the rest. The unified
// orchestration is:
//
//   1. orchestrate(idea, suggestedGenre?) → plan
//        — one chat call, returns: workingTitle, genre, subGenre, mood, BPM,
//          key, energyArc, instrumentation, vocalDirection, productionNotes,
//          structure, vibeDescriptors, musicPrompt, lyricsBrief
//   2. generateLyrics(plan, idea) → sectioned lyrics
//        — validated for section tags; retried once if malformed
//   3. generateCoverPrompt(plan) → visual description
//        — derived from genre + mood + concept (chat call)
//   4. generateImage(coverPrompt) → cover URL → Cloudinary
//   5. generateMusic(plan.musicPrompt, lyrics) → audio URL → Cloudinary
//   6. upsert Genre + Agent → create MusicGeneration + Track
//
// Required env: same as seed-50 (DATABASE_URL, MINIMAX_*, CLOUDINARY_*).

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { USER_IDEAS } from './seed-10-orchestrated-data.mjs';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MINIMAX_BASE = (process.env.MINIMAX_API_BASE || 'https://api.minimax.io/v1').replace(/\/$/, '');
const MUSIC_MODEL = process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
const IMAGE_MODEL = process.env.MINIMAX_IMAGE_MODEL || 'image-01';
// MiniMax-Text-01 is not enabled on this token plan; MiniMax-M2 is.
// M2 is a reasoning model — it can emit chain-of-thought before the answer,
// so we (a) raise max_tokens generously and (b) extract the final fenced/JSON
// block from the response when parsing orchestration output.
const CHAT_MODEL = process.env.MINIMAX_SEED_CHAT_MODEL || 'MiniMax-M2';
const KEY = process.env.MINIMAX_API_KEY;
if (!KEY) throw new Error('MINIMAX_API_KEY missing');

const DEMO_EMAIL = 'demo@gmail.com';

// ────────────────────────────────────────────────────────────
// Low-level MiniMax calls (mirrors backend/src/utils/minimax.ts)
// ────────────────────────────────────────────────────────────

async function minimaxChat({ messages, maxTokens = 1500, temperature = 0.7, model = CHAT_MODEL }) {
  const res = await fetch(`${MINIMAX_BASE}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: false }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`MiniMax chat non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`MiniMax chat HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax chat ${json.base_resp.status_code}: ${json.base_resp.status_msg}`);
  }
  return (json?.choices?.[0]?.message?.content ?? '').trim();
}

async function minimaxImage(prompt) {
  const res = await fetch(`${MINIMAX_BASE}/image_generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      response_format: 'url',
      aspect_ratio: '1:1',
      n: 1,
      prompt_optimizer: true,
    }),
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

async function minimaxMusic({ prompt, lyrics, isInstrumental }) {
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

// ────────────────────────────────────────────────────────────
// Orchestration step 1: idea → full plan
// (mirror of minimaxOrchestrate in backend/src/utils/minimax.ts)
// ────────────────────────────────────────────────────────────

async function orchestrate({ idea, suggestedGenre = null, language = 'English' }) {
  const inputs = [`User concept: ${idea.slice(0, 1500)}`];
  if (suggestedGenre) inputs.push(`Genre: ${suggestedGenre}`);
  inputs.push(`Has lyrics: yes`);

  const system =
    `You are a music producer and orchestration director. Given a user's raw song request, produce a complete orchestration plan as JSON. ` +
    `You are reasoning about HOW the song should be produced — instruments, arrangement, structure, vocal direction — BEFORE any lyric or audio generation runs. ` +
    `\n\nRULES: ` +
    `\n(1) Translate any artist/band references into specific musical descriptors (instruments, production techniques, vocal qualities). NEVER output artist or band names anywhere in the JSON. ` +
    `\n(2) Pick a coherent BPM, key, and time signature that fit the genre/mood. ` +
    `\n(3) The structure should match the genre's conventions — short hook-driven structures for pop, longer dynamic builds for rock/electronic, etc. ` +
    `\n(4) "musicPrompt" is fed verbatim to a music-generation model. Write it as a dense, comma-separated production brief covering genre, BPM, key, instrumentation, vocal direction, energy arc, and era. Do NOT include lyrics, section headings, or stage directions in musicPrompt. ` +
    `\n(5) "lyricsBrief" is a paragraph for a lyric writer. Describe the emotional arc, narrative perspective, imagery, and any hook/refrain motifs. Do NOT write the actual lyrics. ` +
    `\n(6) "instrumentation" is a 3-8 item list of short instrument/sound descriptors. ` +
    `\n(7) "structure" is a list of canonical section names: "Intro","Verse","Pre-Chorus","Chorus","Post-Chorus","Bridge","Final Chorus","Outro". Do NOT include "Guitar Solo" / "Instrumental" / "Breakdown". ` +
    `\n(8) Output ONLY valid JSON. No commentary, no markdown fences.`;

  const schema =
    `{` +
    `"workingTitle": string, "refinedConcept": string (1-2 sentences), ` +
    `"genre": string, "subGenre": string | null, ` +
    `"bpm": number | null, "key": string | null, "timeSignature": string | null, ` +
    `"energyArc": string, "instrumentation": string[], ` +
    `"vocalDirection": string | null, "productionNotes": string, ` +
    `"structure": string[], "vibeDescriptors": string (comma-separated, no artist names), ` +
    `"musicPrompt": string (dense production brief, no lyrics), "lyricsBrief": string` +
    `}`;

  const user =
    `Inputs:\n${inputs.join('\n')}\n\n` +
    `Output language for any lyric brief: ${language}\n\n` +
    `Return JSON matching this schema:\n${schema}`;

  const text = await minimaxChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens: 4000,
    temperature: 0.7,
  });
  return parseOrchestrationJson(text);
}

function parseOrchestrationJson(text) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Orchestration response did not contain JSON');
  }
  const parsed = JSON.parse(stripped.slice(start, end + 1));
  const arrOfStr = (v) => Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  const strOrNull = (v) => typeof v === 'string' && v.trim() ? v : null;
  const strOr = (v, fb = '') => typeof v === 'string' ? v : fb;
  const numOrNull = (v) => typeof v === 'number' && Number.isFinite(v) ? v : null;
  return {
    workingTitle: strOr(parsed.workingTitle),
    refinedConcept: strOr(parsed.refinedConcept),
    genre: strOr(parsed.genre),
    subGenre: strOrNull(parsed.subGenre),
    bpm: numOrNull(parsed.bpm),
    key: strOrNull(parsed.key),
    timeSignature: strOrNull(parsed.timeSignature),
    energyArc: strOr(parsed.energyArc),
    instrumentation: arrOfStr(parsed.instrumentation),
    vocalDirection: strOrNull(parsed.vocalDirection),
    productionNotes: strOr(parsed.productionNotes),
    structure: arrOfStr(parsed.structure),
    vibeDescriptors: strOr(parsed.vibeDescriptors),
    musicPrompt: strOr(parsed.musicPrompt),
    lyricsBrief: strOr(parsed.lyricsBrief),
  };
}

// ────────────────────────────────────────────────────────────
// Step 2: plan → lyrics (with section-tag validation + retry)
// ────────────────────────────────────────────────────────────

const SECTION_RX = /^\[(Intro|Verse(?:\s*\d+)?|Pre[- ]?Chorus|Chorus|Post[- ]?Chorus|Bridge|Final\s*Chorus|Outro)\]/im;

function lyricsHaveSections(lyrics) {
  const matches = lyrics.match(/^\[[^\]]+\]/gim) || [];
  return matches.length >= 2 && SECTION_RX.test(lyrics);
}

async function generateLyricsFromPlan(plan, idea, language = 'English') {
  const constraints = [];
  const genreLine = [plan.genre, plan.subGenre].filter(Boolean).join(' / ');
  if (genreLine) constraints.push(`Genre: ${genreLine}`);
  if (plan.energyArc) constraints.push(`Mood / energy arc: ${plan.energyArc}`);
  if (plan.vocalDirection) constraints.push(`Vocal style: ${plan.vocalDirection}`);
  if (plan.vibeDescriptors) constraints.push(`Sonic vibe: ${plan.vibeDescriptors}`);

  const system =
    `You are a talented songwriter. Write original SUNG lyrics in ${language} that are evocative, radio-ready, and emotionally resonant. ` +
    `Match the lyrical voice and cadence to the genre and mood. Keep total length 200–800 words. Avoid copyrighted lyrics. ` +
    `\n\nFORMATTING RULES (HARD constraints — lyrics are fed directly into a music model that will SING anything you write): ` +
    `\n1. Use ONLY these section tags on their own lines: [Intro], [Verse 1], [Verse 2], [Pre-Chorus], [Chorus], [Post-Chorus], [Bridge], [Final Chorus], [Outro]. ` +
    `\n2. NEVER write [Guitar Solo], [Instrumental], [Breakdown], or any other instrumental tag. ` +
    `\n3. NEVER write parenthetical stage directions like "(Hammond swell)" or "(808 hit, strings enter)". ` +
    `\n4. Parentheses allowed ONLY for short sung ad-libs: "(woah)", "(yeah)", "(oh-oh-oh)". ` +
    `\n5. Output ONLY the lyrics. No commentary. Every non-tag line must be singable text.`;

  const briefBlock = plan.lyricsBrief?.trim()
    ? `Direction from the orchestration planner (theme, voice, imagery, hooks):\n${plan.lyricsBrief.trim()}\n`
    : '';

  const userMsg =
    `Write a song about: ${idea}\n` +
    (briefBlock ? `\n${briefBlock}` : '') +
    (constraints.length ? `\n${constraints.join('\n')}\n` : '') +
    `\nReturn only lyrics with section tags on their own lines.`;

  let lyrics = await minimaxChat({
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    maxTokens: 6000,
    temperature: 0.85,
  });
  lyrics = extractLyrics(lyrics);

  if (!lyricsHaveSections(lyrics)) {
    console.warn('  ! lyrics missing section tags — retrying with stricter prompt');
    const retryUser =
      userMsg +
      `\n\nIMPORTANT: your previous output lacked the required section tags. ` +
      `Begin with [Intro] or [Verse 1] on its own line and use [Verse N], [Chorus], [Bridge], [Final Chorus], [Outro] throughout. ` +
      `Do not write any prose around the lyrics.`;
    lyrics = await minimaxChat({
      messages: [{ role: 'system', content: system }, { role: 'user', content: retryUser }],
      maxTokens: 6000,
      temperature: 0.7,
    });
    lyrics = extractLyrics(lyrics);
  }

  return lyrics;
}

// Cleans M2/reasoning-model prose around the lyrics:
//  - removes <think>...</think> chain-of-thought blocks
//  - removes ```code-fence``` wrappers
//  - drops any prose before the first [Section-Tag] line
function extractLyrics(raw) {
  let s = String(raw || '');
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  s = s.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  const m = s.match(/^\[(?:Intro|Verse[\s\d]*|Pre[- ]?Chorus|Chorus|Post[- ]?Chorus|Bridge|Final\s*Chorus|Outro)\]/im);
  if (m && m.index > 0) s = s.slice(m.index);
  return s.trim();
}

// ────────────────────────────────────────────────────────────
// Step 3: plan → cover-art prompt (chat call so it's vibe-aware)
// ────────────────────────────────────────────────────────────

async function generateCoverPrompt(plan, idea) {
  const system =
    `You are an album-cover art director. Given a song's production plan and concept, write a single visual prompt (60-110 words) for an image-generation model that captures the song's mood, genre, and core imagery. ` +
    `\n\nRULES: ` +
    `\n(1) Square 1:1 album-cover aesthetic. ` +
    `\n(2) Be specific — name the medium (oil painting, 35mm photograph, digital illustration, etc.), the lighting, the palette, and a focal subject. ` +
    `\n(3) NEVER include text, typography, song titles, or band logos in the image. ` +
    `\n(4) NEVER include real artist or band names, brand names, or copyrighted characters. ` +
    `\n(5) Output ONLY the prompt, one paragraph, no commentary.`;

  const inputs = [
    `User concept: ${idea}`,
    `Working title: ${plan.workingTitle}`,
    `Genre: ${[plan.genre, plan.subGenre].filter(Boolean).join(' / ')}`,
    `Mood / energy: ${plan.energyArc}`,
    `Refined concept: ${plan.refinedConcept}`,
    `Sonic vibe: ${plan.vibeDescriptors}`,
  ].join('\n');

  const raw = await minimaxChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: inputs },
    ],
    maxTokens: 1200,
    temperature: 0.8,
  });
  // Strip <think> CoT and code fences, then keep last paragraph (the prompt).
  let cleaned = String(raw || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  return cleaned;
}

// ────────────────────────────────────────────────────────────
// Cloudinary uploads
// ────────────────────────────────────────────────────────────

function slugify(s, max = 80) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'track';
}
function suffix() { return Math.random().toString(36).slice(2, 8); }

async function uploadAudio(buf, label) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'makeyourmusic/audio', resource_type: 'video', public_id: `seed10-${label}-${Date.now()}`, overwrite: false },
      (err, r) => (err ? reject(err) : resolve(r))
    );
    const r = new Readable(); r.push(buf); r.push(null); r.pipe(stream);
  });
}

async function uploadImage(buf, label) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'makeyourmusic/covers', resource_type: 'image', public_id: `seed10-${label}-${Date.now()}`, overwrite: false },
      (err, r) => (err ? reject(err) : resolve(r))
    );
    const r = new Readable(); r.push(buf); r.push(null); r.pipe(stream);
  });
}

async function persistAudio(result, label) {
  let buf;
  if (result.audioHex) {
    buf = Buffer.from(result.audioHex, 'hex');
  } else if (result.audioUrl) {
    const r = await fetch(result.audioUrl);
    if (!r.ok) throw new Error(`audio download failed (${r.status})`);
    buf = Buffer.from(await r.arrayBuffer());
  } else {
    throw new Error('MiniMax returned no audio');
  }
  if (buf.length === 0) throw new Error('empty audio buffer');
  return (await uploadAudio(buf, label)).secure_url;
}

async function persistImage(result, label) {
  if (result.base64) {
    const dataUri = result.base64.startsWith('data:')
      ? result.base64
      : `data:image/png;base64,${result.base64}`;
    return (await cloudinary.uploader.upload(dataUri, {
      folder: 'makeyourmusic/covers',
      public_id: `seed10-${label}-${Date.now()}`,
      overwrite: false,
    })).secure_url;
  }
  if (result.url) {
    const r = await fetch(result.url);
    if (!r.ok) throw new Error(`image download failed (${r.status})`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) throw new Error('empty image');
    return (await uploadImage(buf, label)).secure_url;
  }
  throw new Error('no image data');
}

// ────────────────────────────────────────────────────────────
// DB helpers (raw SQL to dodge schema drift between local/prod)
// ────────────────────────────────────────────────────────────

function cuid() {
  // backend uses prisma's @default(cuid()), but for raw inserts we need an id.
  // Quick locally-unique id with cuid-ish prefix.
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

async function upsertGenre(name) {
  const slug = slugify(name);
  const existing = await prisma.$queryRaw`SELECT id, name, slug FROM genres WHERE LOWER(name) = LOWER(${name}) OR slug = ${slug} LIMIT 1`;
  if (existing.length) return existing[0];
  const id = cuid();
  await prisma.$executeRaw`INSERT INTO genres (id, name, slug) VALUES (${id}, ${name}, ${slug})`;
  console.log(`  + created genre "${name}" (${slug})`);
  return { id, name, slug };
}

async function upsertAgent({ ownerId, name, slug, bio, genreId }) {
  const existing = await prisma.$queryRaw`SELECT id FROM ai_agents WHERE slug = ${slug} LIMIT 1`;
  let agentId;
  if (existing.length) {
    agentId = existing[0].id;
  } else {
    agentId = cuid();
    await prisma.$executeRaw`
      INSERT INTO ai_agents (id, name, slug, bio, status, ai_model, owner_id, created_at, updated_at)
      VALUES (${agentId}, ${name}, ${slug}, ${bio}, 'ACTIVE', 'MiniMax music-2.6', ${ownerId}, NOW(), NOW())
    `;
    console.log(`  + created agent "${name}" (${slug})`);
  }
  // Ensure genre link
  await prisma.$executeRaw`
    INSERT INTO ai_agent_genres (agent_id, genre_id) VALUES (${agentId}, ${genreId})
    ON CONFLICT DO NOTHING
  `;
  return agentId;
}

// ────────────────────────────────────────────────────────────
// Per-idea pipeline
// ────────────────────────────────────────────────────────────

async function processIdea(spec, ownerId) {
  console.log(`\n══ "${spec.idea}"`);
  console.log(`   suggested-genre=${spec.suggestedGenre || '(none)'}, agent=${spec.agentName}`);

  // Skip if a track for this agent already exists with the planned title.
  // We don't know the title yet — defer skip-check until after orchestration.

  // Step 1: orchestrate
  const plan = await orchestrate({
    idea: spec.idea,
    suggestedGenre: spec.suggestedGenre || null,
  });
  console.log(`  ✓ plan: title="${plan.workingTitle}" genre="${plan.genre}/${plan.subGenre || '-'}" bpm=${plan.bpm} key=${plan.key}`);
  console.log(`    musicPrompt:  ${plan.musicPrompt.slice(0, 140)}...`);
  console.log(`    lyricsBrief:  ${plan.lyricsBrief.slice(0, 140)}...`);

  // Idempotency check on title + agent slug
  const existingTrack = await prisma.$queryRaw`
    SELECT t.id, t.slug FROM tracks t
    JOIN ai_agents a ON a.id = t.agent_id
    WHERE a.slug = ${spec.agentSlug} AND t.title = ${plan.workingTitle || spec.fallbackTitle}
    LIMIT 1
  `;
  if (existingTrack.length) {
    console.log(`  = skip — already published as ${existingTrack[0].slug}`);
    return { skipped: true };
  }

  // Step 2: lyrics (MiniMax-authored)
  const lyrics = await generateLyricsFromPlan(plan, spec.idea);
  const ok = lyricsHaveSections(lyrics);
  console.log(`  ✓ lyrics: ${lyrics.length} chars, sections=${ok ? 'yes' : 'WARN'}`);

  // Step 3: cover prompt + image
  const coverPrompt = await generateCoverPrompt(plan, spec.idea);
  console.log(`    coverPrompt: ${coverPrompt.slice(0, 140)}...`);
  let coverArt = null;
  try {
    const img = await minimaxImage(coverPrompt);
    coverArt = await persistImage(img, slugify(plan.workingTitle, 30));
    console.log(`  ✓ cover: ${coverArt}`);
  } catch (err) {
    console.warn(`  ! cover failed: ${err.message}`);
  }

  // Step 4: ensure genre + agent
  const genre = await upsertGenre(spec.suggestedGenre || plan.genre || 'Pop');
  const agentId = await upsertAgent({
    ownerId,
    name: spec.agentName,
    slug: spec.agentSlug,
    bio: spec.agentBio,
    genreId: genre.id,
  });

  // Step 5: persist generation row + music
  const genId = cuid();
  await prisma.$executeRaw`
    INSERT INTO music_generations
      (id, kind, status, title, prompt, lyrics, genre, sub_genre, mood, is_instrumental, provider, provider_model, user_id, agent_id, created_at, updated_at)
    VALUES
      (${genId}, 'MUSIC', 'PROCESSING', ${plan.workingTitle}, ${plan.musicPrompt.slice(0, 2000)},
       ${lyrics.slice(0, 3500)}, ${genre.name}, ${plan.subGenre}, ${plan.energyArc.slice(0, 200)},
       false, 'minimax', ${MUSIC_MODEL}, ${ownerId}, ${agentId}, NOW(), NOW())
  `;

  let musicResult;
  try {
    musicResult = await minimaxMusic({
      prompt: plan.musicPrompt.slice(0, 2000),
      lyrics: lyrics.slice(0, 3500),
      isInstrumental: false,
    });
  } catch (err) {
    await prisma.$executeRaw`
      UPDATE music_generations SET status='FAILED', error_message=${String(err.message).slice(0,500)}, updated_at=NOW()
      WHERE id=${genId}
    `;
    throw err;
  }
  console.log(`  ✓ music (duration=${musicResult.durationSec}s, trace=${musicResult.traceId})`);

  let audioUrl;
  try {
    audioUrl = await persistAudio(musicResult, slugify(plan.workingTitle, 30));
  } catch (err) {
    await prisma.$executeRaw`
      UPDATE music_generations SET status='FAILED', error_message=${`cloudinary: ${err.message}`.slice(0,500)}, updated_at=NOW()
      WHERE id=${genId}
    `;
    throw err;
  }
  console.log(`  ✓ audio: ${audioUrl}`);

  await prisma.$executeRaw`
    UPDATE music_generations
    SET status='COMPLETED', audio_url=${audioUrl}, cover_art=${coverArt},
        duration_sec=${musicResult.durationSec || null}, provider_trace_id=${musicResult.traceId || null},
        updated_at=NOW()
    WHERE id=${genId}
  `;

  // Step 6: publish as Track
  let trackSlug = slugify(plan.workingTitle);
  const slugClash = await prisma.$queryRaw`SELECT 1 FROM tracks WHERE slug=${trackSlug} LIMIT 1`;
  if (slugClash.length) trackSlug = `${trackSlug}-${suffix()}`;

  const trackId = cuid();
  const tags = [plan.genre, plan.subGenre, ...(plan.instrumentation || []).slice(0, 4)]
    .filter(Boolean)
    .map((t) => String(t).slice(0, 30));

  await prisma.$executeRaw`
    INSERT INTO tracks
      (id, title, slug, duration, audio_url, cover_art, status, is_public, mood, tags, bpm, key, lyrics, ai_model, ai_prompt, agent_id, genre_id, created_at, updated_at)
    VALUES
      (${trackId}, ${plan.workingTitle}, ${trackSlug}, ${musicResult.durationSec || 240},
       ${audioUrl}, ${coverArt}, 'ACTIVE', true, ${plan.energyArc.slice(0, 200)},
       ${tags}, ${plan.bpm || null}, ${plan.key || null}, ${lyrics.slice(0, 3500)},
       ${MUSIC_MODEL}, ${plan.musicPrompt.slice(0, 2000)}, ${agentId}, ${genre.id}, NOW(), NOW())
  `;
  await prisma.$executeRaw`UPDATE music_generations SET track_id=${trackId} WHERE id=${genId}`;

  console.log(`  ✓ track /${trackSlug} (id=${trackId})`);
  return { trackId, slug: trackSlug, title: plan.workingTitle, plan };
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  const userRows = await prisma.$queryRaw`SELECT id FROM users WHERE email = ${DEMO_EMAIL} LIMIT 1`;
  if (!userRows.length) throw new Error(`demo user not found (${DEMO_EMAIL})`);
  const ownerId = userRows[0].id;
  console.log(`Demo user: ${ownerId}\nWill process ${USER_IDEAS.length} ideas\n`);

  const limit = process.env.SEED_LIMIT ? parseInt(process.env.SEED_LIMIT, 10) : USER_IDEAS.length;
  const filter = process.env.SEED_AGENT || null;
  const list = USER_IDEAS.filter((s) => !filter || s.agentSlug === filter).slice(0, limit);

  let ok = 0, skipped = 0, failed = 0;
  const failures = [];
  for (let i = 0; i < list.length; i++) {
    const spec = list[i];
    try {
      const r = await processIdea(spec, ownerId);
      if (r.skipped) skipped++; else ok++;
    } catch (err) {
      failed++;
      failures.push({ idea: spec.idea, error: String(err.message).slice(0, 200) });
      console.error(`  ✗ ${spec.idea} — ${err.message}`);
    }
    console.log(`  [${i + 1}/${list.length}] ok=${ok} skipped=${skipped} failed=${failed}`);
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`Done. ok=${ok} skipped=${skipped} failed=${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    for (const f of failures) console.log(`  - ${f.idea}: ${f.error}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
