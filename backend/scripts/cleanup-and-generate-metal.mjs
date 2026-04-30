// One-shot script: clean demo account, rename Beat Laboratory to a metal-themed
// agent, generate two 80s heavy metal ballads via MiniMax, upload to Cloudinary,
// and publish as Tracks.
//
// Run from /backend with the DATABASE_URL, MINIMAX_API_KEY, MINIMAX_API_BASE,
// MINIMAX_MUSIC_MODEL, CLOUDINARY_* env vars set.

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MINIMAX_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimax.io/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
const MINIMAX_KEY = process.env.MINIMAX_API_KEY;
if (!MINIMAX_KEY) throw new Error('MINIMAX_API_KEY missing');

const DEMO_EMAIL = 'demo@gmail.com';
const KEEP_TRACK_SLUG = 'broken-heart';

// ────────────────────────────────────────────────────────────
// Lyrics — written to land squarely in the 80s power-ballad pocket:
//   • Whitesnake "Is This Love" / Bon Jovi "I'll Be There For You" /
//     Mötley Crüe "Home Sweet Home" / Skid Row "I Remember You" energy.
//   • Section tags on their own lines so MiniMax can place them
//     against the right sections (verses clean / choruses big).
// ────────────────────────────────────────────────────────────

const SONG_1 = {
  title: 'Velvet Thunder',
  genre: 'Rock',
  mood: 'Yearning, anthemic, bittersweet',
  tags: ['80s', 'heavy metal', 'power ballad', 'hair metal', 'rock ballad', 'guitar solo', 'arena rock'],
  bpm: 72,
  key: 'D minor',
  prompt:
    '80s heavy metal power ballad in the style of Whitesnake and Bon Jovi. ' +
    'Clean arpeggiated electric guitar intro with reverb, soft piano underneath. ' +
    'Verses stay restrained, just guitar + light snare cross-stick. ' +
    'Pre-chorus builds with tom fills. Choruses explode into wide-open arena rock — ' +
    'crashing power chords, layered harmony vocals, soaring lead melody. ' +
    'Big melodic guitar solo at the bridge with bends and vibrato. ' +
    'Final chorus modulates up. Male lead vocal, gritty but emotive, classic Coverdale-style delivery. ' +
    '4/4, around 72 BPM, key of D minor. Production: gated reverb on snare, ' +
    'long hall reverb, lush 80s polish. Roughly 4 minutes.',
  lyrics: `[Intro]
(Soft clean guitar, distant piano)

[Verse 1]
There's a photograph still hanging on my wall
Black and white memories of a love that wouldn't fall
You wore midnight like it loved you
And the city sang your name
But the rain came in like an old friend
And washed it all away

[Pre-Chorus]
Now I'm chasing every shadow, every trace of you I find
'Cause the hardest part of letting go
Is leaving love behind

[Chorus]
Oh, velvet thunder, roll on through the night
Take this broken heart and pull it back to life
I can hear you whisper in the wind and rain
Velvet thunder, calling out my name
Calling out my name

[Verse 2]
I drove the highway 'til the headlights met the dawn
Singing every song you used to love when you were gone
And the radio kept playing
Like it knew that I was there
Like it heard you swear forever
And it watched you disappear

[Pre-Chorus]
Now I'm reaching for an angel in the corners of my mind
'Cause the hardest part of letting go
Is leaving love behind

[Chorus]
Oh, velvet thunder, roll on through the night
Take this broken heart and pull it back to life
I can hear you whisper in the wind and rain
Velvet thunder, calling out my name
Calling out my name

[Guitar Solo]

[Bridge]
If I could turn back time, I'd hold you closer than the sky
I'd kiss the storm and tell the rain we never said goodbye
Yeah, we never said goodbye

[Chorus]
Oh, velvet thunder, roll on through the night
Take this broken heart and pull it back to life
I can hear you whisper in the wind and rain
Velvet thunder, calling out my name

[Outro]
Calling out my name
(Calling out my name)
Velvet thunder…
Calling me home`,
};

const SONG_2 = {
  title: 'Last Light on the Highway',
  genre: 'Rock',
  mood: 'Defiant, heartbroken, hopeful',
  tags: ['80s', 'heavy metal', 'power ballad', 'glam metal', 'rock ballad', 'arena rock', 'lighters-up'],
  bpm: 68,
  key: 'A minor',
  prompt:
    '80s heavy metal lighters-up ballad in the style of Mötley Crüe "Home Sweet Home", ' +
    'Skid Row "I Remember You", and Cinderella "Don\'t Know What You Got". ' +
    'Opens with a melancholic piano motif, then clean guitar enters with subtle chorus pedal. ' +
    'Verse 1 is piano + voice only. Verse 2 brings in soft drums and bass. ' +
    'Big half-time chorus with thick distorted guitars, double-tracked vocals, ' +
    'cymbal swells. Bridge has a screaming melodic guitar solo with sustained bends. ' +
    'Final chorus drops to just piano + voice, then explodes one last time. ' +
    'Male lead vocal, raspy, emotional rasp like Sebastian Bach. ' +
    '4/4, around 68 BPM, key of A minor. Production: huge gated drums, ' +
    'wide stereo guitars, 80s reverb tail. About 4 minutes.',
  lyrics: `[Intro]
(Solo piano, slow and aching)

[Verse 1]
The last light on the highway burns a hole inside my chest
Mile markers reading like the names of every regret
I left you in a doorway with a suitcase full of dreams
And the sound of slamming engines was the loudest thing it seems

[Pre-Chorus]
But I keep on driving, keep on driving through the night
Praying that the morning brings me back into your light

[Chorus]
'Cause every road I ride leads me back to you
Every star above is a promise we once knew
I've been running on the memory of your touch
The last light on the highway burns for us
Burns for us

[Verse 2]
There's a diner where you told me you'd love me 'til the end
A jukebox playing songs we wrote when we were just pretend
Now the waitress pours another cup, she's heard it all before
Some boy with a broken heart standing at her door

[Pre-Chorus]
But I keep on driving, keep on driving through the rain
Holding on to every word you swore you'd never change

[Chorus]
'Cause every road I ride leads me back to you
Every star above is a promise we once knew
I've been running on the memory of your touch
The last light on the highway burns for us
Burns for us

[Guitar Solo]

[Bridge]
(Quiet — just piano and voice)
And if you're somewhere out there tonight
Watching that same crooked moon
Know that I'm coming, I swear I'm coming
I'll be there soon

[Chorus]
Every road I ride leads me back to you
Every star above is a promise we once knew
I've been running on the memory of your touch
The last light on the highway burns for us

[Outro]
Burns for us
(Burns for us)
The last light…
The last light on the highway
Burns for us`,
};

// ────────────────────────────────────────────────────────────
// Cover art prompts — text-to-image not available in this stack,
// so we'll hand-pick public-domain-style hero imagery via Cloudinary
// AI generation if available, otherwise leave null (frontend has a fallback).
// ────────────────────────────────────────────────────────────

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

function uniqueSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function callMiniMaxMusic({ prompt, lyrics }) {
  const url = `${MINIMAX_BASE.replace(/\/$/, '')}/music_generation`;
  const body = {
    model: MINIMAX_MODEL,
    output_format: 'url',
    audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
    prompt,
    lyrics,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MINIMAX_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`MiniMax non-JSON (${res.status}): ${text.slice(0, 400)}`);
  }
  if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}: ${text.slice(0, 400)}`);
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(
      `MiniMax error ${json.base_resp.status_code}: ${json.base_resp.status_msg || 'unknown'}`
    );
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
  return { audioUrl, audioHex, durationSec, traceId: json?.trace_id, raw: json };
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
    r.push(buffer);
    r.push(null);
    r.pipe(stream);
  });
}

async function persistAudio(result, label) {
  if (result.audioHex) {
    const buf = Buffer.from(result.audioHex, 'hex');
    if (buf.length === 0) throw new Error('empty hex audio');
    const up = await uploadAudio(buf, `metal-${label}-${Date.now()}`);
    return up.secure_url;
  }
  if (result.audioUrl) {
    const r = await fetch(result.audioUrl);
    if (!r.ok) throw new Error(`download failed (${r.status})`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) throw new Error('empty audio download');
    const up = await uploadAudio(buf, `metal-${label}-${Date.now()}`);
    return up.secure_url;
  }
  throw new Error('MiniMax returned no audio');
}

// ────────────────────────────────────────────────────────────
// Step 1: cleanup
// ────────────────────────────────────────────────────────────

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error('demo user not found');

  const allTracks = await prisma.track.findMany({
    where: { agent: { ownerId: user.id } },
    select: { id: true, slug: true, agentId: true },
  });
  const keep = allTracks.find((t) => t.slug === KEEP_TRACK_SLUG);
  if (!keep) throw new Error('Broken Heart track not found');

  const trackIdsToDelete = allTracks.filter((t) => t.id !== keep.id).map((t) => t.id);

  console.log(`Deleting ${trackIdsToDelete.length} tracks (keeping ${KEEP_TRACK_SLUG})…`);
  // Delete dependents that don't cascade or might block
  await prisma.musicGeneration.deleteMany({ where: { trackId: { in: trackIdsToDelete } } });
  await prisma.video.deleteMany({ where: { trackId: { in: trackIdsToDelete } } });
  await prisma.report.deleteMany({ where: { trackId: { in: trackIdsToDelete } } });
  await prisma.track.deleteMany({ where: { id: { in: trackIdsToDelete } } });

  // Delete agents that now have zero tracks (and are not the one holding Broken Heart)
  const emptyAgents = await prisma.aiAgent.findMany({
    where: { ownerId: user.id, tracks: { none: {} } },
    select: { id: true, name: true, slug: true },
  });
  console.log(`Deleting ${emptyAgents.length} empty agents:`, emptyAgents.map((a) => a.name).join(', '));
  if (emptyAgents.length) {
    await prisma.aiAgent.deleteMany({ where: { id: { in: emptyAgents.map((a) => a.id) } } });
  }

  // Also clear any orphan / failed / unpublished generations the demo account has
  const orphanGens = await prisma.musicGeneration.deleteMany({
    where: { userId: user.id, trackId: null },
  });
  console.log(`Deleted ${orphanGens.count} orphan music generations`);

  return { user, keepTrackId: keep.id, keepAgentId: keep.agentId };
}

// ────────────────────────────────────────────────────────────
// Step 2: rename agent
// ────────────────────────────────────────────────────────────

async function renameAgent(agentId) {
  const newName = 'Iron Reverie';
  const newSlug = 'iron-reverie';
  const newBio =
    'Iron Reverie channels the soul of 1980s arena rock — clean-tone heartbreak verses ' +
    'that crash into wide-open distorted choruses, soaring guitar solos, and the ' +
    'gated-snare polish of the era when ballads filled stadiums. Power ballads, ' +
    'lighter-up anthems, and torch songs forged in steel.';

  // Check slug not taken
  const existing = await prisma.aiAgent.findUnique({ where: { slug: newSlug } });
  const finalSlug = existing && existing.id !== agentId ? `${newSlug}-${uniqueSuffix()}` : newSlug;

  await prisma.aiAgent.update({
    where: { id: agentId },
    data: { name: newName, slug: finalSlug, bio: newBio },
  });

  // Make sure agent is tagged with Rock genre
  const rock = await prisma.genre.findUnique({ where: { slug: 'rock' } });
  if (rock) {
    await prisma.aiAgentGenre.upsert({
      where: { agentId_genreId: { agentId, genreId: rock.id } },
      update: {},
      create: { agentId, genreId: rock.id },
    });
  }

  console.log(`Renamed agent → "${newName}" (${finalSlug})`);
  return { name: newName, slug: finalSlug };
}

// ────────────────────────────────────────────────────────────
// Step 3 + 4: generate, upload, publish
// ────────────────────────────────────────────────────────────

async function generateAndPublish(song, { userId, agentId, genreId, label }) {
  console.log(`\n── Generating "${song.title}"… (model=${MINIMAX_MODEL})`);

  // Trim lyrics to MiniMax cap
  const MAX_LYRICS = 3500;
  const lyrics = song.lyrics.length > MAX_LYRICS ? song.lyrics.slice(0, MAX_LYRICS) : song.lyrics;
  const MAX_PROMPT = 2000;
  const prompt = song.prompt.length > MAX_PROMPT ? song.prompt.slice(0, MAX_PROMPT) : song.prompt;

  // Persist generation row first (so we can debug if it fails)
  const gen = await prisma.musicGeneration.create({
    data: {
      userId,
      agentId,
      title: song.title,
      prompt,
      lyrics,
      genre: song.genre,
      mood: song.mood,
      isInstrumental: false,
      provider: 'minimax',
      providerModel: MINIMAX_MODEL,
      status: 'PROCESSING',
    },
  });

  let result;
  try {
    result = await callMiniMaxMusic({ prompt, lyrics });
  } catch (err) {
    await prisma.musicGeneration.update({
      where: { id: gen.id },
      data: { status: 'FAILED', errorMessage: String(err.message).slice(0, 500) },
    });
    throw err;
  }
  console.log(`  ✓ MiniMax returned (duration=${result.durationSec}s, trace=${result.traceId})`);

  let audioUrl;
  try {
    audioUrl = await persistAudio(result, label);
    console.log(`  ✓ Cloudinary uploaded: ${audioUrl}`);
  } catch (err) {
    await prisma.musicGeneration.update({
      where: { id: gen.id },
      data: { status: 'FAILED', errorMessage: `cloudinary: ${String(err.message).slice(0, 480)}` },
    });
    throw err;
  }

  await prisma.musicGeneration.update({
    where: { id: gen.id },
    data: {
      status: 'COMPLETED',
      audioUrl,
      durationSec: result.durationSec || null,
      providerTraceId: result.traceId || null,
    },
  });

  // Publish as Track
  let slug = slugify(song.title, 80);
  const existing = await prisma.track.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${uniqueSuffix()}`;

  const track = await prisma.$transaction(async (tx) => {
    const t = await tx.track.create({
      data: {
        title: song.title,
        slug,
        duration: result.durationSec || 240,
        audioUrl,
        coverArt: song.coverArt || null,
        status: 'ACTIVE',
        isPublic: true,
        mood: song.mood,
        tags: song.tags || [],
        bpm: song.bpm || null,
        key: song.key || null,
        lyrics: song.lyrics,
        aiModel: MINIMAX_MODEL,
        aiPrompt: song.prompt,
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

  console.log(`  ✓ Published track: /${track.slug}  (id=${track.id})`);
  return track;
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  const { user, keepTrackId, keepAgentId } = await cleanup();
  console.log(`Demo user: ${user.id}, kept track: ${keepTrackId}, kept agent: ${keepAgentId}`);

  await renameAgent(keepAgentId);

  const rock = await prisma.genre.findUnique({ where: { slug: 'rock' } });
  if (!rock) throw new Error('rock genre not found');

  // Update Broken Heart with metal-themed metadata while we're at it
  await prisma.track.update({
    where: { id: keepTrackId },
    data: {
      title: 'Broken Heart',
      mood: 'Heartache, longing, redemptive',
      tags: ['80s', 'heavy metal', 'power ballad', 'rock ballad', 'arena rock'],
      bpm: 76,
      key: 'E minor',
      genreId: rock.id,
    },
  });

  await generateAndPublish(SONG_1, {
    userId: user.id,
    agentId: keepAgentId,
    genreId: rock.id,
    label: 'velvet-thunder',
  });

  await generateAndPublish(SONG_2, {
    userId: user.id,
    agentId: keepAgentId,
    genreId: rock.id,
    label: 'last-light-highway',
  });

  console.log('\n✓ Done.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await prisma.$disconnect();
  process.exit(1);
});
