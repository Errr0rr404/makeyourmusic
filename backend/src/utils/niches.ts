// Curated niche definitions. The product strategy is to dominate one niche
// (start narrow, win, expand) rather than being a generic Suno/Udio. Each
// niche maps to:
//   - genre/mood/era seeds for the radio algorithm
//   - prompt templates we surface in the create flow
//   - a curated agent allow-list (filled in by the admin UI later)
//
// Frontend reads NICHE_DEFINITIONS via the /api/niches endpoint to build
// landing pages at /lofi, /sleep, /korean-pop, etc.

export interface NicheDefinition {
  slug: string;
  title: string;
  tagline: string;
  // Used as the radio seed when no track is supplied.
  seedGenre?: string;
  seedMood?: string;
  seedEra?: string;
  // Surfaced in the create page as one-tap prompt presets.
  promptTemplates: string[];
}

export const NICHE_DEFINITIONS: NicheDefinition[] = [
  {
    slug: 'lofi',
    title: 'Lo-fi for everything',
    tagline: 'Endless lo-fi beats for studying, working, and falling asleep.',
    seedGenre: 'lo-fi',
    seedMood: 'calm',
    promptTemplates: [
      'lo-fi study beat with vinyl crackle and Rhodes piano, 70 bpm',
      'late-night lo-fi hip hop, jazz samples, soft drum brushes',
      'rainy-afternoon lo-fi, muted trumpet, warm tape saturation',
    ],
  },
  {
    slug: 'sleep',
    title: 'Sleep & meditation',
    tagline: 'Personalized soundscapes for sleep, focus, and meditation.',
    seedMood: 'peaceful',
    seedGenre: 'ambient',
    promptTemplates: [
      'deep ambient drone for sleep, no melody, 432Hz',
      'meditation pad with soft binaural texture, slow swells',
      'rainforest soundscape with low cello bed',
    ],
  },
  {
    slug: 'korean-pop',
    title: 'K-pop & Mando-pop',
    tagline: 'Made for global pop fans, not just English-speakers.',
    seedGenre: 'k-pop',
    seedMood: 'energetic',
    promptTemplates: [
      'k-pop dance track with synth stabs, female-led chorus, hookline',
      'mando-pop ballad with acoustic guitar and string swells',
      'modern j-pop with city-pop bass and shimmering synths',
    ],
  },
  {
    slug: 'kids',
    title: 'Songs for kids',
    tagline: 'Custom lullabies, learning songs, and silly tunes.',
    seedMood: 'happy',
    promptTemplates: [
      'gentle lullaby with music box and soft humming',
      'upbeat kids learning song about counting, 110 bpm',
      'silly nonsense song for toddlers, ukulele and hand claps',
    ],
  },
];

// ─── Programmatic niches (genre × mood × era) ─────────────
//
// We hand-curate a small set of high-conversion niches above, then
// programmatically expand the longtail. Each combination becomes a
// dedicated landing page at /n/<slug>, indexed by Google. The combos are
// stable (sorted output, deterministic slugs) so the sitemap doesn't churn
// across deploys.

const PROGRAMMATIC_GENRES = [
  'lo-fi', 'synthwave', 'ambient', 'jazz', 'k-pop', 'lofi-hip-hop',
  'phonk', 'house', 'trap', 'folk', 'cinematic', 'drum-and-bass',
  'bossa-nova', 'dreampop', 'indie', 'afrobeat',
] as const;

const PROGRAMMATIC_MOODS = [
  'study', 'sleep', 'workout', 'driving', 'rainy-day',
  'late-night', 'morning', 'sunset', 'gaming', 'coding',
  'reading', 'crying', 'dancing',
] as const;

const PROGRAMMATIC_ERAS = [
  '70s', '80s', '90s', '2000s', 'modern',
] as const;

const TITLE_GENRE_LABEL: Record<string, string> = {
  'lo-fi': 'Lo-fi',
  'synthwave': 'Synthwave',
  'ambient': 'Ambient',
  'jazz': 'Jazz',
  'k-pop': 'K-Pop',
  'lofi-hip-hop': 'Lo-fi Hip-Hop',
  'phonk': 'Phonk',
  'house': 'House',
  'trap': 'Trap',
  'folk': 'Folk',
  'cinematic': 'Cinematic',
  'drum-and-bass': 'Drum & Bass',
  'bossa-nova': 'Bossa Nova',
  'dreampop': 'Dreampop',
  'indie': 'Indie',
  'afrobeat': 'Afrobeat',
};

const MOOD_LABEL: Record<string, string> = {
  study: 'studying', sleep: 'sleep', workout: 'workouts',
  driving: 'driving', 'rainy-day': 'rainy days', 'late-night': 'late nights',
  morning: 'mornings', sunset: 'sunset', gaming: 'gaming',
  coding: 'coding', reading: 'reading', crying: 'crying',
  dancing: 'dancing',
};

function genreLabel(slug: string): string {
  return TITLE_GENRE_LABEL[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildProgrammaticNiche(genre: string, mood: string, era?: string): NicheDefinition {
  const slug = era ? `${genre}-for-${mood}-${era}` : `${genre}-for-${mood}`;
  const gLabel = genreLabel(genre);
  const mLabel = MOOD_LABEL[mood] || mood.replace(/-/g, ' ');
  const eraSuffix = era ? ` — ${era}` : '';
  return {
    slug,
    title: `${gLabel} for ${mLabel}${eraSuffix}`,
    tagline: `Endless AI-generated ${gLabel.toLowerCase()} tuned for ${mLabel}${eraSuffix}.`,
    seedGenre: genre,
    seedMood: mood,
    seedEra: era,
    promptTemplates: [
      `${gLabel.toLowerCase()} for ${mLabel}, soft and consistent, easy to keep in the background`,
      `${gLabel.toLowerCase()} ${mLabel} mix, ${era ? era + ' textures' : 'modern production'}, instrumental`,
      `${era ? era + ' ' : ''}${gLabel.toLowerCase()} that fits a ${mLabel} session`,
    ],
  };
}

/**
 * Returns every niche slug we want indexed: curated + programmatic combos.
 * Used by the sitemap and admin tooling. Eras are intentionally limited to
 * the most-searched ones to keep the sitemap under Google's 50K-URL cap
 * even with multiple genre × mood × era branches.
 */
export function listAllNicheSlugs(): string[] {
  const out = new Set<string>(NICHE_DEFINITIONS.map((n) => n.slug));
  for (const g of PROGRAMMATIC_GENRES) {
    for (const m of PROGRAMMATIC_MOODS) {
      out.add(`${g}-for-${m}`);
      // Era branch only for a handful of high-value combos to stay under
      // the URL cap and keep crawl budget meaningful.
      if (m === 'study' || m === 'driving' || m === 'late-night') {
        for (const e of PROGRAMMATIC_ERAS) out.add(`${g}-for-${m}-${e}`);
      }
    }
  }
  return Array.from(out).sort();
}

const SLUG_RE = /^([a-z0-9-]+?)-for-([a-z-]+?)(?:-(\d{2,4}s|modern))?$/;

function parseProgrammaticSlug(slug: string): NicheDefinition | null {
  const m = slug.match(SLUG_RE);
  if (!m) return null;
  const genre = m[1]!;
  const mood = m[2]!;
  const era = m[3];
  // Validate the components are in our allowed lists — reject random
  // user-supplied slugs so we don't synthesize SEO content for arbitrary
  // attacker-chosen keywords.
  if (!(PROGRAMMATIC_GENRES as readonly string[]).includes(genre)) return null;
  if (!(PROGRAMMATIC_MOODS as readonly string[]).includes(mood)) return null;
  if (era && !(PROGRAMMATIC_ERAS as readonly string[]).includes(era)) return null;
  return buildProgrammaticNiche(genre, mood, era);
}

export function getNiche(slug: string): NicheDefinition | null {
  const curated = NICHE_DEFINITIONS.find((n) => n.slug === slug);
  if (curated) return curated;
  return parseProgrammaticSlug(slug);
}
