// One-shot script: walk seed-50-songs-data.mjs and run the lyric sanitizer
// over every `lyrics: \`...\`` template literal. Mirror of
// backend/src/utils/lyricsSanitizer.ts (kept in sync by hand — both files
// are short).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STRUCTURE_TAGS = new Set([
  'intro','verse','pre-chorus','prechorus','post-chorus','postchorus',
  'chorus','bridge','outro','hook','refrain','tag','drop','build',
]);

const INSTRUMENTAL_TAGS =
  /^(guitar\s*solo|piano\s*solo|sax\s*solo|drum\s*solo|instrumental|solo|interlude|breakdown(?!.*bridge)|riff|fill|drop\s*beat)$/i;

const PRODUCTION_TERMS =
  /\b(drum|drums|kick|snare|hat|hi-hat|bass|guitar|riff|synth|pad|string|strings|horn|brass|sax|saxophone|piano|keys?|rhodes|organ|hammond|808|kit|cymbal|tom|reverb|delay|echo|tape|vinyl|fade|swell|bell|choir|whistle|arpeggi|sample|crackle|loop|talkbox|count[- ]in|click|metronome|riser|build|stab|chop|fill|roll|hit|pulse|drone|fingerpick|nylon|bossa|amapiano|808s|sub[- ]bass|mute(d)?\s+(trumpet|guitar)|pluck|arpeggiator|gated|breakbeat)\b/i;

function normalizeStructureTag(inner) {
  const lower = inner.trim().toLowerCase();
  let m = lower.match(/^verse\s*(\d+)?$/);
  if (m) return m[1] ? `[Verse ${m[1]}]` : '[Verse]';
  m = lower.match(/^chorus\s*(\d+)?$/);
  if (m) return m[1] ? `[Chorus ${m[1]}]` : '[Chorus]';
  if (/^(final|last)\s+chorus$/.test(lower)) return '[Final Chorus]';
  if (/^pre[\s-]?chorus(\s*\d+)?$/.test(lower)) return '[Pre-Chorus]';
  if (/^post[\s-]?chorus$/.test(lower)) return '[Post-Chorus]';
  if (STRUCTURE_TAGS.has(lower)) {
    return `[${lower.charAt(0).toUpperCase()}${lower.slice(1)}]`;
  }
  return null;
}

function normalizeBracketTag(inner) {
  const primary = inner.split(/[—–:]/)[0].trim();
  const parts = primary.split(/[/&,+]/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const n = normalizeStructureTag(part);
    if (n) return n;
  }
  if (INSTRUMENTAL_TAGS.test(primary)) return null;
  return null;
}

function isProductionParenthetical(inner) {
  if (PRODUCTION_TERMS.test(inner)) return true;
  const parts = inner.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) return true;
  return false;
}

export function sanitizeLyrics(input) {
  if (!input) return '';
  const lines = input.split(/\r?\n/);
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(''); continue; }
    const bracketMatch = line.match(/^\[(.+)\]\s*$/);
    if (bracketMatch) {
      const norm = normalizeBracketTag(bracketMatch[1]);
      if (norm) out.push(norm);
      continue;
    }
    const parenOnly = line.match(/^\(([^()]+)\)\s*$/);
    if (parenOnly) {
      if (isProductionParenthetical(parenOnly[1])) continue;
      out.push(line);
      continue;
    }
    const cleaned = line
      .replace(/\s*\(([^()]+)\)/g, (m, inner) =>
        isProductionParenthetical(inner) ? '' : m
      )
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned) out.push(cleaned);
  }
  const collapsed = [];
  let prevBlank = false;
  for (const l of out) {
    if (!l) {
      if (prevBlank) continue;
      prevBlank = true;
    } else {
      prevBlank = false;
    }
    collapsed.push(l);
  }
  while (collapsed.length && !collapsed[0]) collapsed.shift();
  while (collapsed.length && !collapsed[collapsed.length - 1]) collapsed.pop();
  return collapsed.join('\n');
}

// ─── one-shot rewrite of the seed file ───────────────────────────
const target = path.join(__dirname, 'seed-50-songs-data.mjs');
const original = fs.readFileSync(target, 'utf8');

let count = 0;
let droppedLines = 0;

const rewritten = original.replace(/lyrics:\s*`([\s\S]*?)`/g, (_match, body) => {
  const before = body.split('\n').length;
  const cleaned = sanitizeLyrics(body);
  const after = cleaned.split('\n').length;
  count++;
  droppedLines += Math.max(0, before - after);
  return 'lyrics: `' + cleaned + '`';
});

if (rewritten !== original) {
  fs.writeFileSync(target, rewritten);
  console.log(`Sanitized ${count} lyric blocks. Dropped/cleaned ~${droppedLines} lines.`);
} else {
  console.log('No changes needed — all lyrics already clean.');
}
