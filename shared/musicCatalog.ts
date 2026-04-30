// Shared music-creation catalog used by frontend + mobile create flows.
// The same hint strings live in backend/src/utils/musicCatalog.ts for
// server-side prompt building — keep both in sync when adding entries.

export interface Subgenre {
  name: string;
  /** Production cues injected into the AI prompt when this subgenre is picked. */
  hint: string;
}

export interface PrimaryGenre {
  name: string;
  emoji: string;
  /** Optional one-line vibe so the parent chip can show a tooltip. */
  blurb?: string;
  subgenres: Subgenre[];
}

export const GENRE_TREE: PrimaryGenre[] = [
  {
    name: 'Pop',
    emoji: '🎵',
    blurb: 'Catchy melodies, polished production',
    subgenres: [
      { name: 'Synth-Pop', hint: 'shimmering synth pads, 80s drum machines, glossy production, neon energy' },
      { name: 'Dream Pop', hint: 'reverb-soaked guitars, ethereal vocals, hazy atmosphere, soft tempos' },
      { name: 'Bedroom Pop', hint: 'lo-fi DIY production, intimate vocals, jangly clean guitars, tape warmth' },
      { name: 'Indie Pop', hint: 'jangly guitars, melodic hooks, slightly off-kilter playful production' },
      { name: 'K-Pop', hint: 'glossy maximalist production, layered harmonies, dynamic genre-switching bridges, EDM influences' },
      { name: 'Hyperpop', hint: 'pitched-up vocals, distorted 808s, glitchy maximalism, hyper-saturated synths' },
      { name: 'Dance Pop', hint: 'four-on-the-floor kick, big synth drops, chant-along chorus, festival energy' },
      { name: 'Power Pop', hint: 'crunchy power-chord guitars, big chorus harmonies, driving 4/4' },
      { name: 'Art Pop', hint: 'experimental textures, theatrical vocals, baroque arrangements, cinematic builds' },
    ],
  },
  {
    name: 'Hip Hop',
    emoji: '🎤',
    blurb: '808s, bars, head-nod grooves',
    subgenres: [
      { name: 'Trap', hint: 'rolling 808 sub-bass, hi-hat triplets, dark melodic synths, half-time feel, ~140 BPM' },
      { name: 'Boom Bap', hint: 'dusty drum samples, chopped soul samples, hard kick on the 1, snare on the 3, ~90 BPM' },
      { name: 'Drill', hint: 'sliding 808 basslines, ominous melodies, syncopated hats, tight kicks' },
      { name: 'Lo-Fi Hip Hop', hint: 'crackly dusty drums, mellow jazz piano/guitar samples, head-nodding tempo, vinyl warmth' },
      { name: 'Cloud Rap', hint: 'hazy ethereal pads, sparse drums, dreamy atmosphere, melodic sing-rap delivery' },
      { name: 'Conscious', hint: 'live instrumentation, soulful samples, jazzy chords, lyrical-focused production' },
      { name: 'Jersey Club', hint: 'fast bouncy kicks, bed-squeak samples, vocal chops, syncopated 140 BPM rhythm' },
      { name: 'Phonk', hint: 'memphis-style cowbell loops, distorted 808s, vintage cassette feel, dark vibes' },
      { name: 'Old School', hint: 'classic break-beat drums, funk samples, scratched turntable hits, 80s-90s energy' },
      { name: 'Afrobeats Rap', hint: 'amapiano log drums, melodic afro percussion, syncopated grooves, sing-rap delivery' },
    ],
  },
  {
    name: 'Rock',
    emoji: '🎸',
    blurb: 'Guitars, drums, attitude',
    subgenres: [
      { name: 'Indie Rock', hint: 'jangly clean guitars, driving rhythm section, lo-fi production warmth, charismatic vocals' },
      { name: 'Alternative', hint: 'distorted guitars, dynamic loud-quiet shifts, anthemic choruses' },
      { name: 'Punk Rock', hint: 'fast tempos, three-chord progressions, raw energy, shouted vocals' },
      { name: 'Garage Rock', hint: 'fuzzy distorted guitars, raw production, primal drumming, gritty vocals' },
      { name: 'Post-Rock', hint: 'instrumental crescendos, layered ambient guitars, cinematic builds, no traditional chorus' },
      { name: 'Math Rock', hint: 'odd time signatures, intricate finger-tapping, angular riffs, clean guitar tone' },
      { name: 'Shoegaze', hint: 'walls of distorted guitar, washed-out reverb vocals, dense fuzzy textures' },
      { name: 'Hard Rock', hint: 'driving riffs, powerful drums, big anthemic choruses, blues-pentatonic licks' },
      { name: 'Prog Rock', hint: 'long compositions, complex arrangements, virtuosic instrumentation, conceptual lyrics' },
      { name: 'Grunge', hint: 'distorted guitars, slacker vibe, dynamic loud-quiet shifts, raw vocals' },
      { name: 'Surf Rock', hint: 'reverb-drenched twangy guitar, snappy drums, retro 60s coastal energy' },
    ],
  },
  {
    name: 'R&B',
    emoji: '💜',
    blurb: 'Smooth grooves, soulful vocals',
    subgenres: [
      { name: 'Neo-Soul', hint: 'live drums, jazzy chord progressions, smooth vocals, organic warmth, Rhodes piano' },
      { name: 'Alternative R&B', hint: 'atmospheric production, moody synths, layered vocal harmonies, slow tempo' },
      { name: 'Trap Soul', hint: 'auto-tuned vocals, 808 sub-bass, melodic hooks, half-time grooves' },
      { name: 'Smooth R&B', hint: 'silky vocals, lush keys, mid-tempo groove, sensual sax/guitar fills' },
      { name: 'Funk-R&B', hint: 'syncopated bass, slick rhythm guitar licks, tight horn stabs' },
      { name: 'PBR&B', hint: 'minimalist production, hazy synth pads, intimate close-mic vocals' },
      { name: 'Quiet Storm', hint: '70s/80s slow-jam feel, smooth saxophone, lush keys, romantic mood' },
    ],
  },
  {
    name: 'Electronic',
    emoji: '⚡',
    blurb: 'Synths, beats, dance energy',
    subgenres: [
      { name: 'House', hint: 'four-on-the-floor kick, soulful piano stabs, deep basslines, 120-128 BPM' },
      { name: 'Deep House', hint: 'warm analog basslines, jazzy chords, soulful vocal samples, 118-124 BPM' },
      { name: 'Tech House', hint: 'punchy drums, percussive vocal hooks, driving bassline, 124-128 BPM' },
      { name: 'Techno', hint: 'driving 4/4 kick, hypnotic synth loops, industrial textures, 130-140 BPM' },
      { name: 'Trance', hint: 'soaring synth leads, euphoric breakdowns, fast tempo, layered pads, 132-140 BPM' },
      { name: 'Drum & Bass', hint: 'breakbeat drums at 170-180 BPM, sub-bass wobble, atmospheric pads' },
      { name: 'Dubstep', hint: 'half-time grooves, wobbling bass drops, syncopated drums, 140 BPM' },
      { name: 'Future Bass', hint: 'pitched vocal chops, lush supersaws, snappy snares, big drops' },
      { name: 'Synthwave', hint: 'gated reverb drums, neon synth leads, retro-80s atmosphere, analog warmth' },
      { name: 'Lo-Fi House', hint: 'crackly textures, dusty drums, washed-out melodies, intentionally degraded' },
      { name: 'UK Garage', hint: 'shuffled 2-step rhythm, syncopated hats, sub-bass, soulful vocal chops, ~130 BPM' },
      { name: 'Ambient', hint: 'evolving textures, slow drones, atmospheric pads, no rhythm, meditative' },
      { name: 'Breakbeat', hint: 'syncopated breakbeat drums, energetic basslines, funky samples' },
      { name: 'IDM', hint: 'glitchy programmed drums, melodic synths, complex rhythms, experimental' },
      { name: 'Hardstyle', hint: 'distorted reverse-bass, kick drums, hard leads, festival energy, 150 BPM' },
    ],
  },
  {
    name: 'Indie',
    emoji: '🎶',
    blurb: 'Eclectic, DIY-leaning',
    subgenres: [
      { name: 'Indie Folk', hint: 'fingerpicked acoustic guitars, intimate vocals, occasional strings, organic warmth' },
      { name: 'Indie Pop', hint: 'jangly guitars, melodic hooks, lo-fi sheen, dreamy vibes' },
      { name: 'Indie Rock', hint: 'angular guitars, driving bass, charismatic vocals, lo-fi production' },
      { name: 'Folktronica', hint: 'acoustic instruments meet electronic textures, glitchy beats, organic-meets-digital' },
      { name: 'Bedroom Pop', hint: 'lo-fi DIY production, dreamy reverb, intimate close-mic delivery' },
      { name: 'Chamber Pop', hint: 'orchestral arrangements, strings + woodwinds, baroque-influenced songwriting' },
    ],
  },
  {
    name: 'Folk',
    emoji: '🎻',
    blurb: 'Acoustic, narrative, organic',
    subgenres: [
      { name: 'Indie Folk', hint: 'fingerpicked acoustic guitars, intimate vocals, occasional strings or banjo' },
      { name: 'Folk Rock', hint: 'electric+acoustic guitars, harmonies, narrative lyrics, mid-tempo drive' },
      { name: 'Singer-Songwriter', hint: 'sparse acoustic guitar or piano, conversational vocals, narrative storytelling' },
      { name: 'Americana', hint: 'pedal steel, acoustic guitar, organ, twangy heartfelt vocals' },
      { name: 'Bluegrass', hint: 'banjo, mandolin, fiddle, upright bass, fast picking, tight harmonies' },
      { name: 'Celtic Folk', hint: 'tin whistles, fiddles, acoustic guitar, modal melodies, jig/reel rhythms' },
      { name: 'Sea Shanty', hint: 'group vocal call-and-response, accordion, marching tempo, communal energy' },
    ],
  },
  {
    name: 'Jazz',
    emoji: '🎷',
    blurb: 'Improvisation, complex harmony',
    subgenres: [
      { name: 'Bebop', hint: 'fast tempos, complex chord changes, virtuosic horn improvisation, walking bass' },
      { name: 'Cool Jazz', hint: 'mellow tempos, smooth horns, relaxed swing feel, west-coast vibe' },
      { name: 'Jazz Fusion', hint: 'electric instruments, rock energy, complex jazz harmony, virtuosic playing' },
      { name: 'Smooth Jazz', hint: 'silky saxophone, lush keys, polished mid-tempo grooves, radio-friendly' },
      { name: 'Acid Jazz', hint: 'funky basslines, jazzy keys, hip-hop drum breaks, soulful flair' },
      { name: 'Bossa Nova', hint: 'gentle nylon guitar, brushed drums, soft vocals, Brazilian feel, syncopation' },
      { name: 'Lounge Jazz', hint: 'piano trio, brushed drums, intimate dinner-party vibe, warm bass' },
      { name: 'Big Band', hint: 'horn sections, swing rhythm, virtuosic soloing, dance-hall energy' },
    ],
  },
  {
    name: 'Classical',
    emoji: '🎻',
    blurb: 'Orchestral, composed, refined',
    subgenres: [
      { name: 'Cinematic', hint: 'sweeping orchestra, dramatic builds, film-score grandeur, epic emotional arcs' },
      { name: 'Piano Solo', hint: 'unaccompanied piano, emotive melodies, sustain pedal warmth, expressive dynamics' },
      { name: 'String Quartet', hint: 'two violins, viola, cello, intricate counterpoint, chamber intimacy' },
      { name: 'Modern Classical', hint: 'minimalist arpeggios, atmospheric pads, contemporary harmony, post-classical' },
      { name: 'Neoclassical', hint: 'piano + strings, modern emotive minimalism, melancholic warmth' },
      { name: 'Baroque', hint: 'harpsichord, ornate counterpoint, ornamental melodies, period-correct dynamics' },
      { name: 'Choral', hint: 'layered choir vocals, ethereal harmonies, sacred or secular grandeur' },
    ],
  },
  {
    name: 'Lo-Fi',
    emoji: '☕',
    blurb: 'Hazy, chill, study-vibes',
    subgenres: [
      { name: 'Lo-Fi Hip Hop', hint: 'crackly drums, mellow jazz samples, head-nod tempo, study-vibe atmosphere' },
      { name: 'Chillhop', hint: 'jazzy chords, laid-back hip-hop drums, organic warmth, café atmosphere' },
      { name: 'Bedroom Lo-Fi', hint: 'cassette-tape hiss, intimate vocals, DIY warmth, imperfect charm' },
      { name: 'Vaporwave', hint: 'pitched-down 80s samples, dreamy chords, hazy nostalgia, slow tempo' },
      { name: 'Lo-Fi Jazz', hint: 'dusty piano, brushed drums, vinyl crackle, late-night cocktail-bar feel' },
    ],
  },
  {
    name: 'Metal',
    emoji: '🤘',
    blurb: 'Heavy, intense, riffs',
    subgenres: [
      { name: 'Heavy Metal', hint: 'distorted guitars, double-kick drums, soaring vocals, anthemic choruses' },
      { name: 'Death Metal', hint: 'guttural vocals, blast beats, downtuned guitars, brutal tempo' },
      { name: 'Black Metal', hint: 'tremolo-picked guitars, blast beats, shrieked vocals, lo-fi atmospheric production' },
      { name: 'Doom Metal', hint: 'slow heavy riffs, dark atmosphere, downtuned guitars, oppressive mood' },
      { name: 'Metalcore', hint: 'breakdowns, screamed/sung vocals, melodic hooks, palm-muted riffs' },
      { name: 'Djent', hint: 'palm-muted polyrhythmic riffs, syncopated grooves, virtuosic technicality' },
      { name: 'Power Metal', hint: 'galloping rhythms, fantasy themes, soaring vocals, dual harmonized guitars' },
      { name: 'Progressive Metal', hint: 'complex time signatures, virtuosic playing, long compositions' },
      { name: 'Folk Metal', hint: 'metal energy + folk instruments (fiddle, flute), epic anthemic builds' },
    ],
  },
  {
    name: 'Country',
    emoji: '🤠',
    blurb: 'Twang, storytelling, heart',
    subgenres: [
      { name: 'Outlaw Country', hint: 'gritty vocals, twangy guitar, narrative lyrics about hard living, rebellious spirit' },
      { name: 'Country Pop', hint: 'polished production, big choruses, country flavor + pop hooks, radio-ready' },
      { name: 'Bluegrass', hint: 'banjo, mandolin, fiddle, fast picking, tight harmonies' },
      { name: 'Alt-Country', hint: 'rockier edge, rough-around-the-edges production, indie sensibility' },
      { name: 'Country Rock', hint: 'electric guitars + steel guitar, driving rock rhythm, southern energy' },
      { name: 'Honky-Tonk', hint: 'piano, fiddle, pedal steel, danceable shuffle, beer-bar vibe' },
      { name: 'Modern Country', hint: 'glossy production, hip-hop-influenced beats, mainstream radio polish' },
    ],
  },
  {
    name: 'Soul',
    emoji: '💛',
    blurb: 'Heart-on-sleeve vocals',
    subgenres: [
      { name: 'Neo Soul', hint: 'jazzy chords, organic drums, smooth vocals, hip-hop influence' },
      { name: 'Northern Soul', hint: 'driving 4/4 beat, soaring vocals, brass-heavy production, 60s feel' },
      { name: 'Motown', hint: 'tight horns, gospel-tinged backing vocals, snappy production, danceable groove' },
      { name: 'Southern Soul', hint: 'gritty vocals, organ, horn stabs, gospel influence, raw passion' },
      { name: 'Psychedelic Soul', hint: 'wah guitar, fuzzy bass, lush strings, late-60s atmosphere' },
      { name: 'Gospel', hint: 'choir-driven harmonies, Hammond organ, uplifting tempos, spiritual energy' },
    ],
  },
  {
    name: 'Funk',
    emoji: '🕺',
    blurb: 'Syncopated bass, get up',
    subgenres: [
      { name: 'P-Funk', hint: 'syncopated bass, horn sections, stretched-out grooves, cosmic vibe' },
      { name: 'Modern Funk', hint: 'glossy synth bass, tight drums, sleek production, falsetto vocals' },
      { name: 'Disco-Funk', hint: 'four-on-the-floor kick, slap bass, lush strings, 120-130 BPM' },
      { name: 'G-Funk', hint: 'whiny synth leads, deep bass, west-coast hip-hop tempo, smooth vibes' },
      { name: 'Afrobeat', hint: 'polyrhythmic percussion, horn stabs, hypnotic looping grooves, Fela-style' },
      { name: 'Jazz-Funk', hint: 'jazzy chord changes, funky bassline, horn solos, electric piano' },
    ],
  },
  {
    name: 'Reggae',
    emoji: '🌴',
    blurb: 'Offbeat skank, deep bass',
    subgenres: [
      { name: 'Roots Reggae', hint: 'one-drop drums, skanking offbeat guitars, deep bass, conscious lyrics' },
      { name: 'Dub', hint: 'heavy reverb, echo effects, instrumental remixes, deep bass, sparse drums' },
      { name: 'Dancehall', hint: 'digital riddims, syncopated rhythms, energetic vocal delivery' },
      { name: 'Rocksteady', hint: 'slower tempo, smooth basslines, romantic vocals, pre-reggae 60s' },
      { name: 'Reggaeton', hint: 'dembow rhythm, syncopated kicks, Spanish vocals, club energy' },
      { name: 'Ska', hint: 'upbeat tempo, horns, walking bass, offbeat guitar skank, danceable' },
    ],
  },
  {
    name: 'World',
    emoji: '🌍',
    blurb: 'Global flavors',
    subgenres: [
      { name: 'Afrobeats', hint: 'syncopated rhythms, lush percussion, melodic vocals, modern African pop' },
      { name: 'Latin Pop', hint: 'reggaeton beats, Spanish vocals, glossy production, danceable energy' },
      { name: 'Bossa Nova', hint: 'gentle nylon guitar, soft brush drums, smooth Portuguese vocals, syncopation' },
      { name: 'Flamenco', hint: 'fiery nylon guitar, palmas hand-claps, passionate vocals, Andalusian scales' },
      { name: 'K-Pop', hint: 'glossy production, layered harmonies, EDM-influenced drops, dynamic genre-switching' },
      { name: 'J-Pop', hint: 'bright melodies, polished production, cheerful energy, anime-vibe arrangements' },
      { name: 'Bollywood', hint: 'tabla rhythms, sitar, lush strings, Hindi vocals, theatrical energy' },
      { name: 'Celtic', hint: 'tin whistles, fiddles, bodhráns, modal melodies, jig/reel rhythms' },
      { name: 'Amapiano', hint: 'log drums, jazzy synth chords, syncopated percussion, slow danceable groove' },
      { name: 'Salsa', hint: 'horns, congas, piano montuno, syncopated 2-3 / 3-2 clave, danceable' },
      { name: 'Bachata', hint: 'romantic guitar lines, bongos, güira, Spanish vocals, danceable shuffle' },
    ],
  },
  {
    name: 'Cinematic',
    emoji: '🎬',
    blurb: 'Score-style, no boundaries',
    subgenres: [
      { name: 'Epic Orchestral', hint: 'massive orchestra, choir, taiko drums, heroic builds, blockbuster energy' },
      { name: 'Dark Score', hint: 'dissonant strings, ominous percussion, brooding atmosphere, thriller vibes' },
      { name: 'Trailer Music', hint: 'big rises, dramatic drops, hybrid orchestra+electronic, tension+release' },
      { name: 'Ambient Score', hint: 'evolving textures, atmospheric pads, slow builds, contemplative mood' },
      { name: 'Western Score', hint: 'whistles, twangy guitar, brass, sweeping desert vibes, Morricone-esque' },
      { name: 'Sci-Fi Score', hint: 'analog synths, otherworldly textures, pulsing rhythms, retrofuturistic' },
      { name: 'Lo-Fi Cinematic', hint: 'tape-saturated strings, simple piano motifs, cassette warmth, intimate scale' },
    ],
  },
];

// ─── Mood ────────────────────────────────────────────────

export interface MoodOption {
  name: string;
  emoji: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { name: 'Happy', emoji: '😊' },
  { name: 'Sad', emoji: '😢' },
  { name: 'Energetic', emoji: '⚡' },
  { name: 'Calm', emoji: '🌿' },
  { name: 'Romantic', emoji: '💕' },
  { name: 'Dark', emoji: '🌑' },
  { name: 'Epic', emoji: '🦅' },
  { name: 'Nostalgic', emoji: '📼' },
  { name: 'Dreamy', emoji: '☁️' },
  { name: 'Aggressive', emoji: '🔥' },
  { name: 'Melancholic', emoji: '🌧️' },
  { name: 'Triumphant', emoji: '🏆' },
  { name: 'Mysterious', emoji: '🌙' },
  { name: 'Playful', emoji: '🎈' },
  { name: 'Anxious', emoji: '⚠️' },
  { name: 'Hopeful', emoji: '🌅' },
  { name: 'Bittersweet', emoji: '🍋' },
  { name: 'Euphoric', emoji: '✨' },
  { name: 'Sensual', emoji: '🌹' },
  { name: 'Heartbroken', emoji: '💔' },
  { name: 'Confident', emoji: '💎' },
  { name: 'Reflective', emoji: '🪞' },
  { name: 'Rebellious', emoji: '🤘' },
  { name: 'Peaceful', emoji: '🕊️' },
  { name: 'Uplifting', emoji: '🌞' },
];

// ─── Energy ──────────────────────────────────────────────

export interface EnergyOption {
  name: string;
  /** What we whisper into the AI prompt. */
  hint: string;
  emoji: string;
}

export const ENERGY_OPTIONS: EnergyOption[] = [
  { name: 'Chill', emoji: '🛋️', hint: 'relaxed grooves, soft dynamics, 60-80 BPM range' },
  { name: 'Mellow', emoji: '🌊', hint: 'mid-tempo, gentle energy, smooth flow, 80-100 BPM' },
  { name: 'Mid', emoji: '🚶', hint: 'steady drive, balanced energy, 100-120 BPM' },
  { name: 'Upbeat', emoji: '💃', hint: 'danceable, lifted energy, 120-140 BPM' },
  { name: 'Energetic', emoji: '⚡', hint: 'driving high-energy rhythm, 140-160 BPM' },
  { name: 'Hype', emoji: '🚀', hint: 'maximum intensity, festival energy, 160+ BPM' },
];

// ─── Vocal style (only when not instrumental) ────────────

export interface VocalStyleOption {
  name: string;
  hint: string;
}

export const VOCAL_STYLE_OPTIONS: VocalStyleOption[] = [
  { name: 'Female lead', hint: 'female lead vocals' },
  { name: 'Male lead', hint: 'male lead vocals' },
  { name: 'Mixed/duet', hint: 'mixed lead vocals (male + female duet)' },
  { name: 'Choir/group', hint: 'group vocals, layered harmonies, choir-style backing' },
  { name: 'Whispered', hint: 'soft whispered intimate vocal delivery' },
  { name: 'Belted', hint: 'powerful belted vocals, strong dynamics' },
  { name: 'Soft/gentle', hint: 'soft gentle close-mic vocal delivery' },
  { name: 'Rap', hint: 'rap-style rhythmic vocal delivery, flow-driven cadence' },
  { name: 'Auto-tuned', hint: 'melodic auto-tuned vocals, pitched delivery' },
  { name: 'Spoken word', hint: 'spoken-word delivery, conversational, poetic cadence' },
  { name: 'Falsetto', hint: 'falsetto/head-voice vocals, airy and high-register' },
];

// ─── Era ─────────────────────────────────────────────────

export interface EraOption {
  name: string;
  hint: string;
}

export const ERA_OPTIONS: EraOption[] = [
  { name: 'Modern', hint: 'modern 2020s production, contemporary mixing standards' },
  { name: '2010s', hint: '2010s production aesthetics, polished digital sheen' },
  { name: '2000s', hint: '2000s production, early-digital punchy mixes' },
  { name: '90s', hint: '90s production, mix of analog warmth and early-digital crispness' },
  { name: '80s', hint: '80s production: gated reverb, analog synths, big drum sounds' },
  { name: '70s', hint: '70s production: warm analog tape, live-room ambience, vintage tones' },
  { name: '60s', hint: '60s production: mono/early-stereo, plate reverb, vintage room sound' },
  { name: 'Vintage', hint: 'pre-60s vintage feel, analog tape saturation, period-correct instrumentation' },
  { name: 'Timeless', hint: 'genre-classic production that does not signal a specific decade' },
];

// ─── Helpers ─────────────────────────────────────────────

export function findSubgenreHint(subGenreName: string | null | undefined): string | null {
  if (!subGenreName) return null;
  for (const g of GENRE_TREE) {
    const match = g.subgenres.find((s) => s.name === subGenreName);
    if (match) return match.hint;
  }
  return null;
}

export function findGenre(name: string | null | undefined): PrimaryGenre | null {
  if (!name) return null;
  return GENRE_TREE.find((g) => g.name === name) || null;
}

export function findEnergyHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return ENERGY_OPTIONS.find((e) => e.name === name)?.hint ?? null;
}

export function findVocalStyleHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return VOCAL_STYLE_OPTIONS.find((v) => v.name === name)?.hint ?? null;
}

export function findEraHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return ERA_OPTIONS.find((e) => e.name === name)?.hint ?? null;
}

export const PRIMARY_GENRE_NAMES = GENRE_TREE.map((g) => g.name);
