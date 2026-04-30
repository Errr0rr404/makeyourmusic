// Strip non-singable content from lyrics before they reach the music model.
// MiniMax music_generation sings whatever is in `lyrics` — parenthetical stage
// directions like "(Hammond swell, hi-hat pulse, eighth-note bass)" or bracket
// tags like "[Guitar Solo]" become sung words otherwise.
//
// Also strip raw HTML/script-y tokens. The lyrics aren't currently rendered as
// HTML, but this is a defense-in-depth: if a future surface (e.g. an embed,
// a plain `<div dangerouslySetInnerHTML={{__html: lyrics}}>` in a CMS) ever
// inlines them, we don't want a stored payload like `<script>...` to execute.

const STRUCTURE_TAGS = new Set([
  'intro',
  'verse',
  'pre-chorus',
  'prechorus',
  'post-chorus',
  'postchorus',
  'chorus',
  'bridge',
  'outro',
  'hook',
  'refrain',
  'tag',
  'drop',
  'build',
]);

const INSTRUMENTAL_TAGS =
  /^(guitar\s*solo|piano\s*solo|sax\s*solo|drum\s*solo|instrumental|solo|interlude|breakdown(?!.*bridge)|riff|fill|drop\s*beat)$/i;

// Words that strongly indicate a parenthetical is a production / stage
// direction rather than a vocal ad-lib. Matches "Hammond", "808", "kick",
// "snare", "tape hiss", etc.
const PRODUCTION_TERMS =
  /\b(drum|drums|kick|snare|hat|hi-hat|bass|guitar|riff|synth|pad|string|strings|horn|brass|sax|saxophone|piano|keys?|rhodes|organ|hammond|808|kit|cymbal|tom|reverb|delay|echo|tape|vinyl|fade|swell|bell|choir|whistle|arpeggi|sample|crackle|loop|talkbox|count[- ]in|click|metronome|riser|build|stab|chop|fill|roll|hit|pulse|drone|fingerpick|nylon|bossa|amapiano|808s|sub[- ]bass|mute(d)?\s+(trumpet|guitar)|pluck|arpeggiator|gated|breakbeat)\b/i;

function normalizeStructureTag(inner: string): string | null {
  const lower = inner.trim().toLowerCase();

  const verseMatch = lower.match(/^verse\s*(\d+)?$/);
  if (verseMatch) {
    return verseMatch[1] ? `[Verse ${verseMatch[1]}]` : '[Verse]';
  }
  const chorusMatch = lower.match(/^chorus\s*(\d+)?$/);
  if (chorusMatch) {
    return chorusMatch[1] ? `[Chorus ${chorusMatch[1]}]` : '[Chorus]';
  }
  if (/^(final|last)\s+chorus$/.test(lower)) return '[Final Chorus]';
  if (/^pre[\s-]?chorus(\s*\d+)?$/.test(lower)) return '[Pre-Chorus]';
  if (/^post[\s-]?chorus$/.test(lower)) return '[Post-Chorus]';

  if (STRUCTURE_TAGS.has(lower)) {
    return `[${lower.charAt(0).toUpperCase()}${lower.slice(1)}]`;
  }
  return null;
}

function normalizeBracketTag(inner: string): string | null {
  // Strip post-dash/colon detail and pick the first canonical token from
  // compound tags. Examples:
  //   "Breakdown / Bridge — clean guitar" → ["Breakdown","Bridge"] → [Bridge]
  //     ("Breakdown" is non-canonical, falls through to "Bridge")
  //   "Final Chorus + Drop"               → ["Final Chorus","Drop"] → [Final Chorus]
  //   "Guitar Solo"                       → null (caller drops it)
  const primary = inner.split(/[—–:]/)[0]!.trim();
  const parts = primary.split(/[/&,+]/).map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const n = normalizeStructureTag(part);
    if (n) return n;
  }

  // Pure instrumental marker — drop entirely so the section isn't sung.
  if (INSTRUMENTAL_TAGS.test(primary)) return null;

  return null;
}

function isProductionParenthetical(inner: string): boolean {
  if (PRODUCTION_TERMS.test(inner)) return true;
  // Dense comma-separated technical descriptor list (3+ items) is almost
  // always a stage direction even without a matched keyword.
  const parts = inner.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return true;
  return false;
}

// Strip HTML-shaped substrings that could activate script execution if the
// lyrics are ever inlined into HTML. Conservative: drops `<script>...`,
// `<iframe>...`, `<object>...`, `<embed>...`, and `<style>...` tags entirely
// (with their contents), and leaves a-z text alone. Also rewrites bare `<` /
// `>` so a careless renderer can't treat fragments as tags.
function stripScriptyHtml(s: string): string {
  return s
    .replace(/<\s*(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style)\b[^>]*\/?>/gi, '')
    // Strip on-event handlers within other tags (e.g. <img onerror=...>).
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // javascript: / data:text/html URIs in href/src
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|data:text\/html)/gi, '$1=$2#');
}

export function sanitizeLyrics(input: string | null | undefined): string {
  if (!input) return '';
  // First pass: scrub anything that could turn into executable HTML if a
  // future rendering surface escapes the wrong way around its template.
  const cleaned = stripScriptyHtml(input);
  const lines = cleaned.split(/\r?\n/);
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push('');
      continue;
    }

    // Bracket tag line.
    const bracketMatch = line.match(/^\[(.+)\]\s*$/);
    if (bracketMatch) {
      const normalized = normalizeBracketTag(bracketMatch[1]!);
      if (normalized) out.push(normalized);
      continue;
    }

    // Parenthetical-only line.
    const parenOnly = line.match(/^\(([^()]+)\)\s*$/);
    if (parenOnly) {
      if (isProductionParenthetical(parenOnly[1]!)) continue;
      // Looks like a vocal ad-lib (e.g. "(woah)"); keep it.
      out.push(line);
      continue;
    }

    // Strip inline production parentheticals from a vocal line.
    const cleaned = line
      .replace(/\s*\(([^()]+)\)/g, (m, inner) =>
        isProductionParenthetical(inner) ? '' : m
      )
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (cleaned) out.push(cleaned);
  }

  // Collapse 2+ consecutive blank lines to 1.
  const collapsed: string[] = [];
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
  while (collapsed.length && !collapsed[collapsed.length - 1]!) collapsed.pop();
  return collapsed.join('\n');
}
