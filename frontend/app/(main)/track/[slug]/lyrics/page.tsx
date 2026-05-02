import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Music, Bot } from 'lucide-react';
import { serverFetch, getSiteUrl } from '@/lib/serverApi';

// Cache lyric pages aggressively — they don't change after publish (lyric
// edits invalidate via the trackController) and they're optimized for
// search-engine indexing, not interactivity.
export const revalidate = 3600;

interface TrackData {
  track?: {
    title: string;
    slug: string;
    coverArt?: string | null;
    lyrics?: string | null;
    isPublic?: boolean;
    duration?: number | null;
    genre?: { name: string; slug: string } | null;
    agent: { name: string; slug: string };
    aiModel?: string | null;
  };
}

async function fetchTrack(slug: string) {
  const res = await serverFetch<TrackData>(`/tracks/${encodeURIComponent(slug)}`);
  return res?.track || null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const track = await fetchTrack(slug);
  if (!track || !track.lyrics) {
    return { title: 'Lyrics not found', robots: { index: false, follow: false } };
  }
  const url = `${getSiteUrl()}/track/${track.slug}/lyrics`;
  const title = `${track.title} — Lyrics by ${track.agent.name}`;
  const firstLines = track.lyrics
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const description = firstLines || `Read the full lyrics to "${track.title}" by ${track.agent.name} on MakeYourMusic.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      images: track.coverArt ? [{ url: track.coverArt, alt: track.title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
    // Be a polite citizen — only allow indexing of public tracks.
    robots: track.isPublic === false ? { index: false, follow: false } : { index: true, follow: true },
  };
}

/**
 * Splits a lyrics blob into sections by `[Section Name]` headings. Falls
 * back to a single section when the lyrics use prose without markers — we
 * still want to render them in a readable column.
 */
function parseSections(lyrics: string): { heading: string | null; lines: string[] }[] {
  const lines = lyrics.split(/\r?\n/);
  const sections: { heading: string | null; lines: string[] }[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const match = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (match) {
      if (current.heading !== null || current.lines.length > 0) {
        sections.push(current);
      }
      current = { heading: match[1] ?? null, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.heading !== null || current.lines.length > 0) {
    sections.push(current);
  }
  return sections;
}

export default async function TrackLyricsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const track = await fetchTrack(slug);
  if (!track || !track.lyrics) {
    notFound();
  }

  const sections = parseSections(track.lyrics);
  // Plain-text fallback for screen-readers / SEO. The visual rendering keeps
  // section headings; the JSON-LD MusicComposition consumes the same text.
  const plainText = sections
    .map((s) => (s.heading ? `[${s.heading}]\n` : '') + s.lines.join('\n'))
    .join('\n\n')
    .trim();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link
        href={`/track/${track.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-mute)] hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to track
      </Link>

      <header className="mb-8 flex items-start gap-5">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-[hsl(var(--secondary))]">
          {track.coverArt ? (
            <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-8 h-8 text-[color:var(--text-mute)]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-[color:var(--text-mute)] mb-1">Lyrics</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-white">
            {track.title}
          </h1>
          <Link
            href={`/agent/${track.agent.slug}`}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-[color:var(--text-soft)] hover:text-white transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            {track.agent.name}
          </Link>
          {track.genre && (
            <span className="ml-3 text-sm text-[color:var(--text-mute)]">· {track.genre.name}</span>
          )}
        </div>
      </header>

      <article className="space-y-7 font-mono text-[15px] leading-7 text-[color:var(--text)]">
        {sections.map((section, i) => (
          <section key={i} className="break-words">
            {section.heading && (
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--brand)] mb-2">
                {section.heading}
              </h2>
            )}
            {section.lines.map((line, j) => (
              <p key={j} className={line.trim() === '' ? 'h-4' : 'whitespace-pre-wrap'}>
                {line || ' '}
              </p>
            ))}
          </section>
        ))}
      </article>

      <p className="mt-12 pt-6 border-t border-[color:var(--stroke)] text-xs text-[color:var(--text-mute)]">
        AI-generated lyrics{track.aiModel ? ` (${track.aiModel})` : ''}. Published on MakeYourMusic.
      </p>

      {/* Structured data so search engines understand this as a song lyric
          page rather than generic text. Schema.org MusicComposition with
          embedded full text is the de-facto standard for lyric SEO. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MusicComposition',
            name: track.title,
            composer: { '@type': 'Person', name: track.agent.name },
            lyrics: { '@type': 'CreativeWork', text: plainText },
            url: `${getSiteUrl()}/track/${track.slug}/lyrics`,
          }),
        }}
      />
    </div>
  );
}
