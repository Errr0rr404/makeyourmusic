// Parse / rebuild section-tagged lyrics so the AI flow can regenerate a
// single section (chorus, verse 2, bridge…) without rewriting the whole song.
//
// Input is the canonical `[Section Name]\nLine\nLine\n[Other Section]\nLine`
// format produced by minimaxGenerateLyrics. Tag matching is case-insensitive
// and forgiving of "verse 1" / "Verse 1" / "[Verse-1]".

export interface LyricSection {
  tag: string;          // canonical "[Verse 1]"
  rawTag: string;       // original "[verse 1]" / "[VERSE 1]"
  body: string;         // lines under this section, no trailing newline
  start: number;        // char offset of the tag line in the source
  end: number;          // char offset just past this section's body
}

const SECTION_RE_GLOBAL = /^\s*\[([^\]\n]+)\]\s*$/gm;

function canonicalize(tag: string): string {
  const cleaned = tag.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((w) => (w.length ? (w[0] as string).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export function parseLyrics(text: string): LyricSection[] {
  if (!text) return [];
  const sections: LyricSection[] = [];
  const matches = Array.from(text.matchAll(SECTION_RE_GLOBAL));
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (!m) continue;
    const next = matches[i + 1];
    const start = m.index ?? 0;
    const tagLineEnd = start + m[0].length;
    const sectionEnd = next?.index ?? text.length;
    const body = text.slice(tagLineEnd, sectionEnd).replace(/^\n/, '').replace(/\n+$/, '');
    const inner = m[1] ?? '';
    sections.push({
      tag: `[${canonicalize(inner)}]`,
      rawTag: `[${inner}]`,
      body,
      start,
      end: sectionEnd,
    });
  }
  return sections;
}

export function findSection(text: string, tag: string): LyricSection | null {
  const target = canonicalize(tag.replace(/^\[|\]$/g, ''));
  const sections = parseLyrics(text);
  return sections.find((s) => canonicalize(s.tag.replace(/^\[|\]$/g, '')) === target) ?? null;
}

export function replaceSection(
  text: string,
  tag: string,
  newBody: string
): string {
  const found = findSection(text, tag);
  if (!found) return text;
  const before = text.slice(0, found.start);
  const after = text.slice(found.end);
  const trailingNewline = after.startsWith('\n') ? '' : '\n';
  return `${before}${found.tag}\n${newBody.trim()}\n${trailingNewline}${after.replace(/^\n+/, '')}`;
}

export function listSections(text: string): string[] {
  return parseLyrics(text).map((s) => s.tag);
}
