// Audit every demo@gmail.com track for defects:
//   - audioUrl alive (HEAD 200)
//   - coverArt alive (HEAD 200)  AND  present (not null)
//   - title non-empty
//   - agent + genre linked
//   - lyrics quality: for vocal tracks, must have >= 2 section tags, no
//     leaked reasoning prose, no forbidden tags ([Guitar Solo] / [Instrumental])
//   - is_instrumental ↔ lyrics consistent (instrumental → lyrics empty/null)
//
// Mode: VERIFY_ONLY=1 → report only. Default → fix what's fixable in place.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VERIFY_ONLY = !!process.env.VERIFY_ONLY;

const FORBIDDEN_TAG_RX = /\[(?:Guitar\s*Solo|Instrumental|Breakdown|Drum\s*Fill|Solo|Sax\s*Solo|Synth\s*Solo|Whistle\s*Solo)\]/i;
const SECTION_TAG_RX = /^\[(?:Intro|Verse(?:\s*\d+)?|Pre[- ]?Chorus|Chorus|Post[- ]?Chorus|Bridge|Final\s*Chorus|Outro)\]/im;
const REASONING_LEAK_RX = /<think>|<\/think>|^Here(?:'s| are| is) the lyrics|^Let me write|^I'll (?:write|craft)|chain[\s-]of[\s-]thought/im;
// True stage directions only. We flag paren lines that mention instruments,
// production techniques, or transport cues — those are what the music model
// would literally sing. Sung backing vocals like "(Yeah, yeah)" or
// "(Should have married you)" are NOT stage directions and must not match.
const STAGE_DIR_INSTRUMENT_RX = /\b(guitar|drum|kick|snare|hi-?hat|bass|synth|piano|rhodes|wurlitzer|organ|hammond|sax|trumpet|brass|horn|strings?|cello|violin|brushed|cymbal|tambourine|cajon|congas?|tape\s*hiss|crackle|808|kit|loop|fill|talkbox|vocoder|harmonizer|whistle|stomp|clap|chime|bell|tom)\b/i;
const STAGE_DIR_TRANSPORT_RX = /\b(tape\s*stop|fade(?:s|d)?\s+(?:in|out)|build(?:s|ing)\s+up|drop\b|breaks?\s+down|kicks\s+in|pulls\s+back|pad\s+swell|filter\s+sweep|drum\s+break|rolls\s+in|enters?\s+(?:soft|loud|here)|reverb\s+tail)\b/i;
function findStageDirections(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('(') || !t.endsWith(')')) continue;
    const inner = t.slice(1, -1);
    if (STAGE_DIR_INSTRUMENT_RX.test(inner) || STAGE_DIR_TRANSPORT_RX.test(inner)) {
      hits.push(t);
      if (hits.length >= 3) break;
    }
  }
  return hits;
}

async function headOk(url) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

function inspectLyrics(lyrics, isInstrumental) {
  const defects = [];
  const txt = (lyrics || '').trim();

  if (isInstrumental) {
    // Instrumental: lyrics should be empty or null. Anything substantive is a defect.
    if (txt.length > 50) {
      defects.push({ kind: 'INST_HAS_LYRICS', detail: `instrumental but has ${txt.length} chars of lyrics` });
    }
    return defects;
  }

  // Vocal track from here on:
  if (!txt) {
    defects.push({ kind: 'VOCAL_NO_LYRICS', detail: 'vocal track but lyrics are empty/null' });
    return defects;
  }
  if (txt.length < 200) {
    defects.push({ kind: 'LYRICS_TOO_SHORT', detail: `only ${txt.length} chars` });
  }

  // Section tags: must have at least 2
  const tags = txt.match(/^\[[^\]]+\]/gim) || [];
  if (tags.length < 2 || !SECTION_TAG_RX.test(txt)) {
    defects.push({ kind: 'NO_SECTION_TAGS', detail: `found ${tags.length} bracket lines, no canonical section tags` });
  }

  if (REASONING_LEAK_RX.test(txt)) {
    defects.push({ kind: 'REASONING_LEAK', detail: 'looks like model chain-of-thought leaked into lyrics' });
  }

  // Forbidden instrumental section tags — these would be sung by the music model.
  // (Note: [Guitar Solo] in the OLD seed-50 zan-authored lyrics IS a defect — the
  // music model will literally try to sing those words.)
  if (FORBIDDEN_TAG_RX.test(txt)) {
    defects.push({ kind: 'FORBIDDEN_INSTRUMENTAL_TAG', detail: 'contains [Guitar Solo]/[Sax Solo]/etc — music model sings these' });
  }

  const hits = findStageDirections(txt);
  if (hits.length > 0) {
    defects.push({ kind: 'STAGE_DIRECTIONS', detail: `instrument/transport cues in parens (e.g. ${JSON.stringify(hits[0])})` });
  }

  return defects;
}

async function main() {
  const tracks = await prisma.$queryRaw`
    SELECT t.id, t.title, t.slug, t.audio_url AS "audioUrl", t.cover_art AS "coverArt",
           t.lyrics, t.ai_prompt AS "aiPrompt", t.mood, t.tags, t.duration, t.bpm, t.key,
           t.agent_id AS "agentId", t.genre_id AS "genreId",
           a.name AS "agentName", a.slug AS "agentSlug",
           g.name AS "genreName",
           mg.is_instrumental AS "isInstrumental"
    FROM tracks t
    JOIN ai_agents a ON a.id = t.agent_id
    JOIN users u ON u.id = a.owner_id
    LEFT JOIN genres g ON g.id = t.genre_id
    LEFT JOIN music_generations mg ON mg.track_id = t.id
    WHERE u.email = ${"demo@gmail.com"}
    ORDER BY a.name, t.title
  `;

  console.log(`Auditing ${tracks.length} tracks...\n`);

  const defects = [];

  // HEAD-check audio + cover in parallel (chunks of 10 to stay polite)
  console.log('Checking URLs (HEAD)...');
  for (let i = 0; i < tracks.length; i += 10) {
    const batch = tracks.slice(i, i + 10);
    await Promise.all(batch.map(async (t) => {
      t.audioAlive = await headOk(t.audioUrl);
      t.coverAlive = t.coverArt ? await headOk(t.coverArt) : false;
    }));
  }

  for (const t of tracks) {
    const trackDefects = [];

    if (!t.audioUrl || !t.audioAlive) {
      trackDefects.push({ kind: 'AUDIO_DEAD', detail: t.audioUrl ? 'HEAD failed' : 'no audio URL' });
    }
    if (!t.coverArt) {
      trackDefects.push({ kind: 'NO_COVER', detail: 'cover_art is NULL' });
    } else if (!t.coverAlive) {
      trackDefects.push({ kind: 'COVER_DEAD', detail: 'HEAD failed' });
    }
    if (!t.title || !t.title.trim()) {
      trackDefects.push({ kind: 'NO_TITLE', detail: '' });
    }
    if (!t.agentId) {
      trackDefects.push({ kind: 'NO_AGENT', detail: '' });
    }
    if (!t.genreId) {
      trackDefects.push({ kind: 'NO_GENRE', detail: '' });
    }

    // For lyrics inspection we need to know if it's instrumental.
    // mg.is_instrumental is available for tracks generated through MusicGeneration.
    // For pre-existing tracks without a MG row, infer from lyrics presence + title hints.
    let isInstrumental = t.isInstrumental;
    if (isInstrumental == null) {
      // Heuristic: tracks with no lyrics at all and Classical/Ambient/Lo-Fi instrumental titles.
      isInstrumental = !t.lyrics || t.lyrics.trim().length < 30;
    }
    const lyricDefects = inspectLyrics(t.lyrics, isInstrumental);
    trackDefects.push(...lyricDefects);

    if (trackDefects.length > 0) {
      defects.push({ track: t, isInstrumental, defects: trackDefects });
    }
  }

  // Report
  console.log(`\nFound ${defects.length} tracks with at least one defect.\n`);
  const byKind = {};
  for (const d of defects) {
    for (const x of d.defects) {
      byKind[x.kind] = (byKind[x.kind] || 0) + 1;
    }
  }
  console.log('Defects by kind:');
  for (const [kind, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(28)} ${n}`);
  }
  console.log();
  for (const d of defects) {
    const kinds = d.defects.map((x) => x.kind).join(',');
    console.log(`  ${d.track.agentName.padEnd(22)} ${d.track.title.slice(0, 32).padEnd(34)}  [${kinds}]`);
    for (const x of d.defects) {
      if (x.detail) console.log(`      → ${x.kind}: ${x.detail}`);
    }
  }

  // Emit JSON snapshot for the fix script to consume
  const snapshot = {
    auditedAt: new Date().toISOString(),
    totalTracks: tracks.length,
    defects: defects.map((d) => ({
      id: d.track.id,
      slug: d.track.slug,
      title: d.track.title,
      agent: d.track.agentName,
      agentSlug: d.track.agentSlug,
      genre: d.track.genreName,
      isInstrumental: d.isInstrumental,
      audioUrl: d.track.audioUrl,
      coverArt: d.track.coverArt,
      lyricsLen: (d.track.lyrics || '').length,
      lyricsHead: (d.track.lyrics || '').slice(0, 200),
      bpm: d.track.bpm,
      key: d.track.key,
      mood: d.track.mood,
      aiPrompt: d.track.aiPrompt,
      defects: d.defects,
    })),
  };
  const fs = await import('fs');
  fs.writeFileSync('/tmp/demo-audit.json', JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote snapshot to /tmp/demo-audit.json`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
