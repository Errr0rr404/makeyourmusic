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

export function getNiche(slug: string): NicheDefinition | null {
  return NICHE_DEFINITIONS.find((n) => n.slug === slug) ?? null;
}
