// Server-side mirror of the production hints used in shared/musicCatalog.ts.
// Only the strings the prompt builder needs live here — the full catalog
// (with emojis/blurbs for UI rendering) lives in the shared package.
// When adding/renaming entries, update both files in lock-step.

const SUBGENRE_HINTS: Record<string, string> = {
  // Pop
  'Synth-Pop': 'shimmering synth pads, 80s drum machines, glossy production, neon energy',
  'Dream Pop': 'reverb-soaked guitars, ethereal vocals, hazy atmosphere, soft tempos',
  'Bedroom Pop': 'lo-fi DIY production, intimate vocals, jangly clean guitars, tape warmth',
  'Indie Pop': 'jangly guitars, melodic hooks, slightly off-kilter playful production',
  'K-Pop': 'glossy maximalist production, layered harmonies, dynamic genre-switching bridges, EDM influences',
  'Hyperpop': 'pitched-up vocals, distorted 808s, glitchy maximalism, hyper-saturated synths',
  'Dance Pop': 'four-on-the-floor kick, big synth drops, chant-along chorus, festival energy',
  'Power Pop': 'crunchy power-chord guitars, big chorus harmonies, driving 4/4',
  'Art Pop': 'experimental textures, theatrical vocals, baroque arrangements, cinematic builds',

  // Hip Hop
  'Trap': 'rolling 808 sub-bass, hi-hat triplets, dark melodic synths, half-time feel, ~140 BPM',
  'Boom Bap': 'dusty drum samples, chopped soul samples, hard kick on the 1, snare on the 3, ~90 BPM',
  'Drill': 'sliding 808 basslines, ominous melodies, syncopated hats, tight kicks',
  'Lo-Fi Hip Hop': 'crackly dusty drums, mellow jazz piano/guitar samples, head-nodding tempo, vinyl warmth',
  'Cloud Rap': 'hazy ethereal pads, sparse drums, dreamy atmosphere, melodic sing-rap delivery',
  'Conscious': 'live instrumentation, soulful samples, jazzy chords, lyrical-focused production',
  'Jersey Club': 'fast bouncy kicks, bed-squeak samples, vocal chops, syncopated 140 BPM rhythm',
  'Phonk': 'memphis-style cowbell loops, distorted 808s, vintage cassette feel, dark vibes',
  'Old School': 'classic break-beat drums, funk samples, scratched turntable hits, 80s-90s energy',
  'Afrobeats Rap': 'amapiano log drums, melodic afro percussion, syncopated grooves, sing-rap delivery',

  // Rock
  'Indie Rock': 'jangly clean guitars, driving rhythm section, lo-fi production warmth, charismatic vocals',
  'Alternative': 'distorted guitars, dynamic loud-quiet shifts, anthemic choruses',
  'Punk Rock': 'fast tempos, three-chord progressions, raw energy, shouted vocals',
  'Garage Rock': 'fuzzy distorted guitars, raw production, primal drumming, gritty vocals',
  'Post-Rock': 'instrumental crescendos, layered ambient guitars, cinematic builds, no traditional chorus',
  'Math Rock': 'odd time signatures, intricate finger-tapping, angular riffs, clean guitar tone',
  'Shoegaze': 'walls of distorted guitar, washed-out reverb vocals, dense fuzzy textures',
  'Hard Rock': 'driving riffs, powerful drums, big anthemic choruses, blues-pentatonic licks',
  'Prog Rock': 'long compositions, complex arrangements, virtuosic instrumentation, conceptual lyrics',
  'Grunge': 'distorted guitars, slacker vibe, dynamic loud-quiet shifts, raw vocals',
  'Surf Rock': 'reverb-drenched twangy guitar, snappy drums, retro 60s coastal energy',

  // R&B
  'Neo-Soul': 'live drums, jazzy chord progressions, smooth vocals, organic warmth, Rhodes piano',
  'Alternative R&B': 'atmospheric production, moody synths, layered vocal harmonies, slow tempo',
  'Trap Soul': 'auto-tuned vocals, 808 sub-bass, melodic hooks, half-time grooves',
  'Smooth R&B': 'silky vocals, lush keys, mid-tempo groove, sensual sax/guitar fills',
  'Funk-R&B': 'syncopated bass, slick rhythm guitar licks, tight horn stabs',
  'PBR&B': 'minimalist production, hazy synth pads, intimate close-mic vocals',
  'Quiet Storm': '70s/80s slow-jam feel, smooth saxophone, lush keys, romantic mood',

  // Electronic
  'House': 'four-on-the-floor kick, soulful piano stabs, deep basslines, 120-128 BPM',
  'Deep House': 'warm analog basslines, jazzy chords, soulful vocal samples, 118-124 BPM',
  'Tech House': 'punchy drums, percussive vocal hooks, driving bassline, 124-128 BPM',
  'Techno': 'driving 4/4 kick, hypnotic synth loops, industrial textures, 130-140 BPM',
  'Trance': 'soaring synth leads, euphoric breakdowns, fast tempo, layered pads, 132-140 BPM',
  'Drum & Bass': 'breakbeat drums at 170-180 BPM, sub-bass wobble, atmospheric pads',
  'Dubstep': 'half-time grooves, wobbling bass drops, syncopated drums, 140 BPM',
  'Future Bass': 'pitched vocal chops, lush supersaws, snappy snares, big drops',
  'Synthwave': 'gated reverb drums, neon synth leads, retro-80s atmosphere, analog warmth',
  'Lo-Fi House': 'crackly textures, dusty drums, washed-out melodies, intentionally degraded',
  'UK Garage': 'shuffled 2-step rhythm, syncopated hats, sub-bass, soulful vocal chops, ~130 BPM',
  'Ambient': 'evolving textures, slow drones, atmospheric pads, no rhythm, meditative',
  'Breakbeat': 'syncopated breakbeat drums, energetic basslines, funky samples',
  'IDM': 'glitchy programmed drums, melodic synths, complex rhythms, experimental',
  'Hardstyle': 'distorted reverse-bass, kick drums, hard leads, festival energy, 150 BPM',

  // Indie / Folk
  'Indie Folk': 'fingerpicked acoustic guitars, intimate vocals, occasional strings or banjo',
  'Folktronica': 'acoustic instruments meet electronic textures, glitchy beats, organic-meets-digital',
  'Chamber Pop': 'orchestral arrangements, strings + woodwinds, baroque-influenced songwriting',
  'Folk Rock': 'electric+acoustic guitars, harmonies, narrative lyrics, mid-tempo drive',
  'Singer-Songwriter': 'sparse acoustic guitar or piano, conversational vocals, narrative storytelling',
  'Americana': 'pedal steel, acoustic guitar, organ, twangy heartfelt vocals',
  'Bluegrass': 'banjo, mandolin, fiddle, upright bass, fast picking, tight harmonies',
  'Celtic Folk': 'tin whistles, fiddles, acoustic guitar, modal melodies, jig/reel rhythms',
  'Sea Shanty': 'group vocal call-and-response, accordion, marching tempo, communal energy',

  // Jazz
  'Bebop': 'fast tempos, complex chord changes, virtuosic horn improvisation, walking bass',
  'Cool Jazz': 'mellow tempos, smooth horns, relaxed swing feel, west-coast vibe',
  'Jazz Fusion': 'electric instruments, rock energy, complex jazz harmony, virtuosic playing',
  'Smooth Jazz': 'silky saxophone, lush keys, polished mid-tempo grooves, radio-friendly',
  'Acid Jazz': 'funky basslines, jazzy keys, hip-hop drum breaks, soulful flair',
  'Bossa Nova': 'gentle nylon guitar, brushed drums, soft vocals, Brazilian feel, syncopation',
  'Lounge Jazz': 'piano trio, brushed drums, intimate dinner-party vibe, warm bass',
  'Big Band': 'horn sections, swing rhythm, virtuosic soloing, dance-hall energy',

  // Classical
  'Cinematic': 'sweeping orchestra, dramatic builds, film-score grandeur, epic emotional arcs',
  'Piano Solo': 'unaccompanied piano, emotive melodies, sustain pedal warmth, expressive dynamics',
  'String Quartet': 'two violins, viola, cello, intricate counterpoint, chamber intimacy',
  'Modern Classical': 'minimalist arpeggios, atmospheric pads, contemporary harmony, post-classical',
  'Neoclassical': 'piano + strings, modern emotive minimalism, melancholic warmth',
  'Baroque': 'harpsichord, ornate counterpoint, ornamental melodies, period-correct dynamics',
  'Choral': 'layered choir vocals, ethereal harmonies, sacred or secular grandeur',

  // Lo-Fi
  'Chillhop': 'jazzy chords, laid-back hip-hop drums, organic warmth, café atmosphere',
  'Bedroom Lo-Fi': 'cassette-tape hiss, intimate vocals, DIY warmth, imperfect charm',
  'Vaporwave': 'pitched-down 80s samples, dreamy chords, hazy nostalgia, slow tempo',
  'Lo-Fi Jazz': 'dusty piano, brushed drums, vinyl crackle, late-night cocktail-bar feel',

  // Metal
  'Heavy Metal': 'distorted guitars, double-kick drums, soaring vocals, anthemic choruses',
  'Death Metal': 'guttural vocals, blast beats, downtuned guitars, brutal tempo',
  'Black Metal': 'tremolo-picked guitars, blast beats, shrieked vocals, lo-fi atmospheric production',
  'Doom Metal': 'slow heavy riffs, dark atmosphere, downtuned guitars, oppressive mood',
  'Metalcore': 'breakdowns, screamed/sung vocals, melodic hooks, palm-muted riffs',
  'Djent': 'palm-muted polyrhythmic riffs, syncopated grooves, virtuosic technicality',
  'Power Metal': 'galloping rhythms, fantasy themes, soaring vocals, dual harmonized guitars',
  'Progressive Metal': 'complex time signatures, virtuosic playing, long compositions',
  'Folk Metal': 'metal energy + folk instruments (fiddle, flute), epic anthemic builds',

  // Country
  'Outlaw Country': 'gritty vocals, twangy guitar, narrative lyrics about hard living, rebellious spirit',
  'Country Pop': 'polished production, big choruses, country flavor + pop hooks, radio-ready',
  'Alt-Country': 'rockier edge, rough-around-the-edges production, indie sensibility',
  'Country Rock': 'electric guitars + steel guitar, driving rock rhythm, southern energy',
  'Honky-Tonk': 'piano, fiddle, pedal steel, danceable shuffle, beer-bar vibe',
  'Modern Country': 'glossy production, hip-hop-influenced beats, mainstream radio polish',

  // Soul
  'Neo Soul': 'jazzy chords, organic drums, smooth vocals, hip-hop influence',
  'Northern Soul': 'driving 4/4 beat, soaring vocals, brass-heavy production, 60s feel',
  'Motown': 'tight horns, gospel-tinged backing vocals, snappy production, danceable groove',
  'Southern Soul': 'gritty vocals, organ, horn stabs, gospel influence, raw passion',
  'Psychedelic Soul': 'wah guitar, fuzzy bass, lush strings, late-60s atmosphere',
  'Gospel': 'choir-driven harmonies, Hammond organ, uplifting tempos, spiritual energy',

  // Funk
  'P-Funk': 'syncopated bass, horn sections, stretched-out grooves, cosmic vibe',
  'Modern Funk': 'glossy synth bass, tight drums, sleek production, falsetto vocals',
  'Disco-Funk': 'four-on-the-floor kick, slap bass, lush strings, 120-130 BPM',
  'G-Funk': 'whiny synth leads, deep bass, west-coast hip-hop tempo, smooth vibes',
  'Afrobeat': 'polyrhythmic percussion, horn stabs, hypnotic looping grooves, Fela-style',
  'Jazz-Funk': 'jazzy chord changes, funky bassline, horn solos, electric piano',

  // Reggae
  'Roots Reggae': 'one-drop drums, skanking offbeat guitars, deep bass, conscious lyrics',
  'Dub': 'heavy reverb, echo effects, instrumental remixes, deep bass, sparse drums',
  'Dancehall': 'digital riddims, syncopated rhythms, energetic vocal delivery',
  'Rocksteady': 'slower tempo, smooth basslines, romantic vocals, pre-reggae 60s',
  'Reggaeton': 'dembow rhythm, syncopated kicks, Spanish vocals, club energy',
  'Ska': 'upbeat tempo, horns, walking bass, offbeat guitar skank, danceable',

  // World
  'Afrobeats': 'syncopated rhythms, lush percussion, melodic vocals, modern African pop',
  'Latin Pop': 'reggaeton beats, Spanish vocals, glossy production, danceable energy',
  'Flamenco': 'fiery nylon guitar, palmas hand-claps, passionate vocals, Andalusian scales',
  'J-Pop': 'bright melodies, polished production, cheerful energy, anime-vibe arrangements',
  'Bollywood': 'tabla rhythms, sitar, lush strings, Hindi vocals, theatrical energy',
  'Celtic': 'tin whistles, fiddles, bodhráns, modal melodies, jig/reel rhythms',
  'Amapiano': 'log drums, jazzy synth chords, syncopated percussion, slow danceable groove',
  'Salsa': 'horns, congas, piano montuno, syncopated 2-3 / 3-2 clave, danceable',
  'Bachata': 'romantic guitar lines, bongos, güira, Spanish vocals, danceable shuffle',

  // Cinematic
  'Epic Orchestral': 'massive orchestra, choir, taiko drums, heroic builds, blockbuster energy',
  'Dark Score': 'dissonant strings, ominous percussion, brooding atmosphere, thriller vibes',
  'Trailer Music': 'big rises, dramatic drops, hybrid orchestra+electronic, tension+release',
  'Ambient Score': 'evolving textures, atmospheric pads, slow builds, contemplative mood',
  'Western Score': 'whistles, twangy guitar, brass, sweeping desert vibes, Morricone-esque',
  'Sci-Fi Score': 'analog synths, otherworldly textures, pulsing rhythms, retrofuturistic',
  'Lo-Fi Cinematic': 'tape-saturated strings, simple piano motifs, cassette warmth, intimate scale',
};

const ENERGY_HINTS: Record<string, string> = {
  'Chill': 'relaxed grooves, soft dynamics, 60-80 BPM range',
  'Mellow': 'mid-tempo, gentle energy, smooth flow, 80-100 BPM',
  'Mid': 'steady drive, balanced energy, 100-120 BPM',
  'Upbeat': 'danceable, lifted energy, 120-140 BPM',
  'Energetic': 'driving high-energy rhythm, 140-160 BPM',
  'Hype': 'maximum intensity, festival energy, 160+ BPM',
};

const VOCAL_STYLE_HINTS: Record<string, string> = {
  'Female lead': 'female lead vocals',
  'Male lead': 'male lead vocals',
  'Mixed/duet': 'mixed lead vocals (male + female duet)',
  'Choir/group': 'group vocals, layered harmonies, choir-style backing',
  'Whispered': 'soft whispered intimate vocal delivery',
  'Belted': 'powerful belted vocals, strong dynamics',
  'Soft/gentle': 'soft gentle close-mic vocal delivery',
  'Rap': 'rap-style rhythmic vocal delivery, flow-driven cadence',
  'Auto-tuned': 'melodic auto-tuned vocals, pitched delivery',
  'Spoken word': 'spoken-word delivery, conversational, poetic cadence',
  'Falsetto': 'falsetto/head-voice vocals, airy and high-register',
};

const ERA_HINTS: Record<string, string> = {
  'Modern': 'modern 2020s production, contemporary mixing standards',
  '2010s': '2010s production aesthetics, polished digital sheen',
  '2000s': '2000s production, early-digital punchy mixes',
  '90s': '90s production, mix of analog warmth and early-digital crispness',
  '80s': '80s production: gated reverb, analog synths, big drum sounds',
  '70s': '70s production: warm analog tape, live-room ambience, vintage tones',
  '60s': '60s production: mono/early-stereo, plate reverb, vintage room sound',
  'Vintage': 'pre-60s vintage feel, analog tape saturation, period-correct instrumentation',
  'Timeless': 'genre-classic production that does not signal a specific decade',
};

// Primary-genre fallback hints. Only used when no subgenre is selected — gives
// the music model at least something to anchor on for "Rock" / "Pop" / "Metal"
// without forcing the caller to pick a subgenre.
const GENRE_HINTS: Record<string, string> = {
  'Pop': 'modern pop production, hook-driven topline, polished mix, big chorus, 100-128 BPM',
  'Hip Hop': '808 sub-bass, syncopated trap-style hi-hats, punchy kick/snare, rap-cadence vocals, 70-160 BPM',
  'Rock': 'electric guitars, full drum kit with strong backbeat, driving bass, anthemic chorus, 90-150 BPM',
  'R&B': 'smooth soulful vocals, lush keys/Rhodes, syncopated drums, 70-100 BPM, romantic harmonic palette',
  'Electronic': 'synth-driven production, programmed drums, bass focal point, sound-design textures, club-ready dynamics',
  'Indie': 'jangly clean guitars, lo-fi sheen, charismatic vocals, mid-tempo drive, 95-130 BPM',
  'Folk': 'fingerpicked acoustic guitar, narrative vocals, organic warmth, sparse arrangement, 70-110 BPM',
  'Jazz': 'swung drums, walking upright bass, jazz piano comping, horn solos, complex 7th/9th harmony',
  'Classical': 'acoustic orchestra, dynamic phrasing, no programmed drums, expressive rubato, romantic harmony',
  'Lo-Fi': 'tape hiss, dusty drums, mellow jazz/soul samples, head-nod tempo, vinyl warmth, 70-90 BPM',
  'Metal': 'distorted downtuned guitars, double-kick drums, aggressive vocals, palm-muted riffs, 100-180 BPM',
  'Country': 'acoustic+electric guitar, pedal steel or fiddle, twangy vocals, 2/4 or shuffle rhythm, 80-130 BPM',
  'Soul': 'gospel-tinged vocals, organ, horn stabs, tight rhythm section, 70-120 BPM, vintage analog warmth',
  'Funk': 'syncopated slap bass, tight drum-pocket, rhythmic guitar comping, horn stabs, ~95-115 BPM',
  'Reggae': 'one-drop or rockers drums, off-beat skanking guitar, deep bass, dub-style space, 70-90 BPM',
  'World': 'genre-authentic regional percussion, traditional instruments, native-language vocal phrasing',
  'Cinematic': 'orchestral palette with optional hybrid synth, emotive dynamic arc, no pop chorus, build-and-release form',
};

// Mood hints translate the user's chosen mood word into production-language
// cues. Without this, "Mood: Heartbroken" reaches the model as just a label;
// with it, the model gets imagery + harmonic + dynamic guidance.
const MOOD_HINTS: Record<string, string> = {
  'Happy': 'major-key harmonic palette, bright timbres, upbeat groove, smiling vocal delivery',
  'Sad': 'minor-key harmonic palette, sparse arrangement, slower tempo, plaintive vocal phrasing',
  'Energetic': 'driving rhythm, high-velocity drums, prominent bassline, urgent vocal energy',
  'Calm': 'soft dynamics, slow tempo, sustained pads, breathy intimate vocals',
  'Romantic': 'lush warm chords, expressive lead instrument, sensual vocal delivery, mid-tempo sway',
  'Dark': 'low-register harmonic palette, dissonant textures, ominous low-end, restrained vocal delivery',
  'Epic': 'expansive arrangement, layered builds, big drums, soaring lead melody, dramatic dynamic arc',
  'Nostalgic': 'analog warmth, tape saturation, slightly washed-out reverb, longing-tinged vocal melody',
  'Dreamy': 'shimmering reverb, lush pads, floating vocal delivery, hazy mix character',
  'Aggressive': 'distorted timbres, hard-hit drums, growling/shouted attack, dense low-end',
  'Melancholic': 'minor key, rainy-day chord voicings, restrained dynamics, wistful vocal tone',
  'Triumphant': 'major-key harmonic resolution, brass/anthemic synth leads, big drum hits, victorious vocal stance',
  'Mysterious': 'unresolved harmony, sparse texture, ambiguous tonal center, breathy or whispered vocals',
  'Playful': 'syncopated rhythms, bouncy basslines, playful vocal phrasing, bright lively timbres',
  'Anxious': 'tight syncopation, restless arpeggios, dissonant harmonic motion, urgent vocal cadence',
  'Hopeful': 'gradually rising harmonic motion, opening dynamics, warm uplifting timbres',
  'Bittersweet': 'major chords with minor-9 colorings, mid-tempo, vocal delivered with warmth and longing',
  'Euphoric': 'huge supersaw or piano stabs, four-on-the-floor energy, layered vocal hooks, festival-scale build',
  'Sensual': 'slow groove, syncopated drums, smoky chord voicings, breathy close-mic vocals',
  'Heartbroken': 'minor key, sparse arrangement, raw vulnerable vocal performance, slow ballad tempo',
  'Confident': 'pocket-locked groove, swaggering vocal delivery, strong bass presence, mid-tempo confidence',
  'Reflective': 'mid-tempo, sparse instrumentation, conversational vocal delivery, introspective space',
  'Rebellious': 'distorted attack, defiant vocal energy, driving rhythm, anti-establishment edge',
  'Peaceful': 'gentle acoustic timbres, soft dynamics, tonal harmonic palette, breath-led pacing',
  'Uplifting': 'major key, bright lead instruments, lifting harmonic motion, optimistic vocal delivery',
};

// Per-genre lyric conventions: rhyme scheme, line length, vocabulary register,
// total length target, structure conventions. The lyric system prompt picks the
// matching block by genre; subgenre overrides primary genre.
export interface LyricConvention {
  /** Short comma-separated rhyme/meter cues (e.g. "AABB couplets, 8-syllable lines"). */
  rhyme: string;
  /** Vocabulary register, point of view, narrative shape. */
  voice: string;
  /** Genre-typical structure (mirror what the music will support). */
  structure: string;
  /** Target total length range for the song body. */
  lengthHint: string;
}

const SUBGENRE_LYRIC_HINTS: Record<string, LyricConvention> = {
  // Hip Hop
  'Trap': {
    rhyme: 'multi-syllable internal rhymes, AAAA bars, triplet flow accents',
    voice: 'first-person swagger, modern slang, brand/lifestyle imagery, present tense',
    structure: 'Intro → 16-bar Verse → Hook → 16-bar Verse → Hook → Bridge → Hook',
    lengthHint: '350-600 words',
  },
  'Boom Bap': {
    rhyme: 'dense end-rhymes with internal multis, 4-bar punchlines',
    voice: 'first-person storyteller, street-poetic vocabulary, vivid concrete imagery',
    structure: 'Intro → 16-bar Verse → 8-bar Hook → 16-bar Verse → 8-bar Hook → Verse → Hook',
    lengthHint: '400-700 words',
  },
  'Drill': {
    rhyme: 'aggressive end-rhymes, sliding cadence on the last word, repeated tag refrains',
    voice: 'first-person hard-edged, blunt declarative imagery, present-tense menace',
    structure: 'Tag → 16-bar Verse → Hook → 16-bar Verse → Hook',
    lengthHint: '300-500 words',
  },
  'Conscious': {
    rhyme: 'literary multi-syllable rhymes, layered metaphors, complex word-flips',
    voice: 'first-person reflective, social/political imagery, allegory and metaphor',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Verse → Hook',
    lengthHint: '450-800 words',
  },
  'Cloud Rap': {
    rhyme: 'loose half-rhymes, repeated words for hypnotic effect, melodic phrasing',
    voice: 'first-person dreamy, abstract imagery, present-tense languid',
    structure: 'Intro → Verse → Hook → Verse → Hook → Outro',
    lengthHint: '250-450 words',
  },
  'Lo-Fi Hip Hop': {
    rhyme: 'soft end-rhymes, conversational phrasing, repeated mantra hooks',
    voice: 'first-person introspective, study/late-night imagery, calm present tense',
    structure: 'Verse → Hook → Verse → Hook (often instrumental-heavy with sparse vocals)',
    lengthHint: '200-400 words',
  },
  // R&B
  'Neo-Soul': {
    rhyme: 'flowing end-rhymes with vocal runs, conversational meter',
    voice: 'first-person sensual, organic body imagery, expressive vulnerability',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '280-500 words',
  },
  'Alternative R&B': {
    rhyme: 'sparse rhyme, melodic repetition over rhyme density, atmospheric phrasing',
    voice: 'first-person introspective, modern romantic ambiguity, dreamlike imagery',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Outro',
    lengthHint: '250-450 words',
  },
  // Pop
  'Synth-Pop': {
    rhyme: 'simple AABB or ABAB end-rhymes, hook-forward chorus',
    voice: 'first or second person, bright modern imagery, repeated chant-able chorus',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '250-400 words',
  },
  'Dance Pop': {
    rhyme: 'simple ABAB rhymes, chant-along chorus with title-as-hook',
    voice: 'first or second person, body/club imagery, present-tense urgency',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Drop/Final Chorus',
    lengthHint: '230-380 words',
  },
  'K-Pop': {
    rhyme: 'mixed-language ABAB rhymes, chant hook, repeated catchphrase ad-libs',
    voice: 'group POV, aspirational imagery, dynamic shifts in tone across sections',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge (rap or dance break) → Final Chorus',
    lengthHint: '280-450 words',
  },
  'Hyperpop': {
    rhyme: 'rapid-fire end-rhymes, repeated short phrases, chant-style hook',
    voice: 'first-person hyper-emotional, internet/digital imagery, exaggerated affect',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus (often sub-2 min)',
    lengthHint: '180-320 words',
  },
  'Bedroom Pop': {
    rhyme: 'soft slant-rhymes, conversational meter, quiet hook',
    voice: 'first-person intimate, diary-room imagery, vulnerable present tense',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Outro',
    lengthHint: '220-400 words',
  },
  // Rock
  'Indie Rock': {
    rhyme: 'loose ABAB, conversational meter, hook line in chorus',
    voice: 'first-person observational, slice-of-life imagery, ironic distance',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '250-450 words',
  },
  'Punk Rock': {
    rhyme: 'simple AABB, short blunt lines, shouted chorus',
    voice: 'first-person defiant, anti-establishment imagery, present-tense confrontation',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus (often <2:30)',
    lengthHint: '150-280 words',
  },
  'Alternative': {
    rhyme: 'AABA or ABCB, dynamic chorus contrast, vivid imagery',
    voice: 'first-person introspective with anthemic chorus turn, layered emotion',
    structure: 'Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '280-480 words',
  },
  'Metalcore': {
    rhyme: 'screamed verses with sung chorus contrast, anthemic AABB chorus',
    voice: 'first-person catharsis, anguished imagery, declarative chorus statement',
    structure: 'Intro → Verse (scream) → Pre-Chorus → Chorus (sung) → Verse (scream) → Chorus → Breakdown → Bridge → Final Chorus',
    lengthHint: '250-450 words',
  },
  // Folk
  'Indie Folk': {
    rhyme: 'AABB or ABAB, narrative imagery, refrain instead of pop chorus',
    voice: 'first-person reflective, nature/place imagery, past-tense storytelling',
    structure: 'Verse → Refrain → Verse → Refrain → Bridge → Refrain (often strophic)',
    lengthHint: '300-550 words',
  },
  'Singer-Songwriter': {
    rhyme: 'AABB or ABAB, conversational meter, narrative arc',
    voice: 'first-person confessional, autobiographical imagery, vulnerable specificity',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '300-550 words',
  },
  'Americana': {
    rhyme: 'AABB end-rhymes, narrative ballad meter, regional vocabulary',
    voice: 'first-person plain-spoken, working-class imagery, place names and concrete details',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '300-550 words',
  },
  'Bluegrass': {
    rhyme: 'AABB tight end-rhymes, fast-meter narrative',
    voice: 'first-person folk-tale storyteller, rural imagery, past-tense narrative',
    structure: 'Verse → Chorus → Verse → Chorus → Instrumental break → Verse → Chorus',
    lengthHint: '250-450 words',
  },
  // Country
  'Outlaw Country': {
    rhyme: 'AABB couplets, shuffle meter, twangy turn-of-phrase',
    voice: 'first-person rebel, working-class imagery, hard-living specificity',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '280-500 words',
  },
  'Country Pop': {
    rhyme: 'AABB simple rhymes, hook-forward chorus, country twang vocabulary',
    voice: 'first-person heartfelt, small-town/rural imagery, big chorus payoff',
    structure: 'Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '280-450 words',
  },
  // Electronic
  'House': {
    rhyme: 'minimal lyric content, repeated short phrases, chant-style hook',
    voice: 'second-person dance-floor invitation, sensory body imagery',
    structure: 'Intro → Verse → Build → Drop/Hook → Breakdown → Build → Drop/Hook → Outro',
    lengthHint: '120-280 words (dance music is hook-heavy with sparse verse content)',
  },
  'Future Bass': {
    rhyme: 'simple ABAB, chopped vocal phrases, repeated chant pre-drop',
    voice: 'first-person uplifting, big-feeling imagery, festival-anthem direct address',
    structure: 'Intro → Verse → Pre-Drop → Drop/Hook → Verse → Pre-Drop → Drop/Hook → Outro',
    lengthHint: '150-300 words',
  },
  'Trance': {
    rhyme: 'sparse repeated phrases, chant-style hook',
    voice: 'second-person ecstatic, transcendent imagery, present-tense surrender',
    structure: 'Intro → Verse → Pre-Drop/Build → Drop → Breakdown → Build → Drop → Outro',
    lengthHint: '120-250 words',
  },
  // Soul / Funk / Reggae
  'Gospel': {
    rhyme: 'AABB or ABAB, refrain-heavy, call-and-response',
    voice: 'first-person or congregational, spiritual/uplifting imagery, declarative testimony',
    structure: 'Verse → Chorus/Refrain → Verse → Chorus → Bridge → Final Chorus (often with vamp)',
    lengthHint: '250-500 words',
  },
  'Motown': {
    rhyme: 'AABB simple rhymes, snappy hook, call-and-response with backing vocals',
    voice: 'first-person heartfelt, romantic imagery, classic mid-century vocabulary',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '230-400 words',
  },
  'Roots Reggae': {
    rhyme: 'simple AABB, conscious refrain, repeated mantra hook',
    voice: 'first-person spiritual/political, communal imagery, repeated declarative refrain',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus',
    lengthHint: '250-450 words',
  },
  'Reggaeton': {
    rhyme: 'Spanish AABB or ABAB, hook-forward chorus, ad-libs woven through',
    voice: 'first-person sensual or party, club imagery, direct address',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '230-420 words',
  },
  // World
  'Bossa Nova': {
    rhyme: 'subtle slant rhymes, soft conversational meter',
    voice: 'first-person quiet romantic, warm tropical imagery, breathy intimacy',
    structure: 'Verse → Chorus → Verse → Chorus → Instrumental → Final Chorus',
    lengthHint: '200-400 words',
  },
  'Afrobeats': {
    rhyme: 'mixed-language ABAB rhymes, repeated catch-phrase hook, ad-libs',
    voice: 'first-person celebratory, body/dance imagery, communal direct address',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Hook',
    lengthHint: '250-450 words',
  },
  // Cinematic — usually instrumental, but if vocal:
  'Choral': {
    rhyme: 'simple AABB or sacred-text style, repeated invocational refrain',
    voice: 'collective POV, sacred or epic imagery, vowel-driven phrasing for choir',
    structure: 'Verse → Refrain → Verse → Refrain → Final Refrain (or through-composed)',
    lengthHint: '180-380 words',
  },
};

const PRIMARY_GENRE_LYRIC_HINTS: Record<string, LyricConvention> = {
  'Pop': {
    rhyme: 'simple AABB or ABAB end-rhymes, chant-able chorus repeated verbatim',
    voice: 'first or second person, hook-driven, modern relatable imagery',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '250-400 words',
  },
  'Hip Hop': {
    rhyme: 'multi-syllable internal rhymes, dense end-rhymes, 16-bar verses',
    voice: 'first-person, vivid concrete imagery, present-tense delivery',
    structure: 'Intro → 16-bar Verse → 8-bar Hook → 16-bar Verse → 8-bar Hook → Bridge → Hook',
    lengthHint: '350-650 words',
  },
  'Rock': {
    rhyme: 'AABB or ABAB, anthemic chorus, vivid hook line',
    voice: 'first-person emotive, declarative imagery, dynamic vocal delivery',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '280-450 words',
  },
  'R&B': {
    rhyme: 'flowing end-rhymes with melodic runs, conversational meter',
    voice: 'first-person, romantic/sensual imagery, vulnerable expressive delivery',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '280-500 words',
  },
  'Electronic': {
    rhyme: 'sparse repeated phrases, chant-style hook',
    voice: 'second-person direct address, body/dance/sky imagery, simple repeated phrasing',
    structure: 'Intro → Verse → Build/Pre-Drop → Drop/Hook → Verse → Build → Drop → Outro',
    lengthHint: '150-300 words',
  },
  'Indie': {
    rhyme: 'loose ABAB or slant rhymes, conversational meter',
    voice: 'first-person observational, slice-of-life imagery, ironic warmth',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '270-480 words',
  },
  'Folk': {
    rhyme: 'AABB or ABAB end-rhymes, narrative ballad meter',
    voice: 'first-person reflective, nature/place/people imagery, past-tense storytelling',
    structure: 'Verse → Refrain → Verse → Refrain → Bridge → Refrain (often strophic, no big chorus)',
    lengthHint: '320-580 words',
  },
  'Jazz': {
    rhyme: 'AABA standard form, sophisticated vocabulary, slant rhymes welcome',
    voice: 'first-person reflective, sophisticated romantic imagery, conversational delivery',
    structure: 'AABA standard form (32-bar) or Verse → Chorus → Bridge → Chorus',
    lengthHint: '180-380 words',
  },
  'Lo-Fi': {
    rhyme: 'soft end-rhymes, repeated mantras, conversational meter',
    voice: 'first-person introspective, late-night/study imagery, calm present tense',
    structure: 'Verse → Hook → Verse → Hook (often very sparse vocals)',
    lengthHint: '180-350 words',
  },
  'Metal': {
    rhyme: 'AABB or AABA, anthemic chorus, declarative dark imagery',
    voice: 'first-person catharsis, mythic/dark/political imagery, declarative vocal stance',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: '250-450 words',
  },
  'Country': {
    rhyme: 'AABB couplets, narrative shuffle meter, plain-spoken vocabulary',
    voice: 'first-person plain-spoken, working-class/rural imagery, concrete specifics',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '280-500 words',
  },
  'Soul': {
    rhyme: 'flowing end-rhymes with vocal runs, AABB or ABAB',
    voice: 'first-person heartfelt, romantic or spiritual imagery, expressive vulnerability',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '250-450 words',
  },
  'Funk': {
    rhyme: 'AABB or repeated short phrases, chant-style hook',
    voice: 'first or second person, body/groove imagery, playful direct address',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Hook',
    lengthHint: '200-400 words',
  },
  'Reggae': {
    rhyme: 'simple AABB, conscious refrain, repeated mantra hook',
    voice: 'first-person spiritual or political, communal imagery, declarative refrain',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus',
    lengthHint: '250-450 words',
  },
  'World': {
    rhyme: 'genre-authentic rhyme scheme; native-language phrasing where applicable',
    voice: 'first-person celebratory or romantic, regional cultural imagery',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: '250-450 words',
  },
  'Cinematic': {
    rhyme: 'sparse if vocal — usually instrumental; if vocal, vowel-driven choral phrasing',
    voice: 'collective or narrator POV, mythic/epic imagery, vowel-forward delivery',
    structure: 'Through-composed build-and-release; if structured, Refrain → Verse → Refrain',
    lengthHint: '120-280 words (most cinematic music is instrumental)',
  },
};

// Cover-art visual language by primary genre. Each entry is a concrete art-
// direction brief: palette, composition, motifs, texture, lighting, finish.
// The cover-art prompt builder injects the matching block by primary genre.
// Subgenre-level overrides handle the most visually distinct subgenres.
export interface VisualConvention {
  /** Color palette in concrete terms. */
  palette: string;
  /** Composition + camera framing. */
  composition: string;
  /** Specific motifs to consider (objects, scenes, figures). */
  motifs: string;
  /** Surface texture and finish. */
  texture: string;
  /** Lighting / atmosphere descriptors. */
  lighting: string;
}

const PRIMARY_GENRE_VISUAL_HINTS: Record<string, VisualConvention> = {
  'Pop': {
    palette: 'saturated brights — magenta, cyan, lemon, candy pastels',
    composition: 'centered subject or bold typographic-suggested shape, clean negative space',
    motifs: 'stylized portrait, geometric shapes, gloss, motion blur',
    texture: 'glossy clean digital finish, light grain optional',
    lighting: 'high-key polished, soft rim light, fashion-editorial gloss',
  },
  'Hip Hop': {
    palette: 'high-contrast, blacks and reds with metallic gold accents, occasional neon',
    composition: 'low-angle hero portrait, tight crop, urban backdrop or studio black',
    motifs: 'portrait close-up, chains/diamonds, city skyline, chrome, smoke, moody street',
    texture: 'photographic with sharp grain, occasional film/disposable feel for boom-bap',
    lighting: 'dramatic chiaroscuro, single rim light, neon street reflection',
  },
  'Rock': {
    palette: 'desaturated earth tones, blacks and rust reds, occasional bleached whites',
    composition: 'wide-shot live-energy frame or single iconic object, asymmetric',
    motifs: 'guitar/amp/microphone silhouette, weathered surfaces, crowd, leather, denim',
    texture: 'film grain, scratched edges, photocopy-zine feel, paper fold',
    lighting: 'stage spotlight cutting through smoke, hard side light, high contrast',
  },
  'R&B': {
    palette: 'deep purples, burgundy, copper, soft warm browns, candlelight gold',
    composition: 'sensual portrait, soft-focus background, intimate framing, mid-distance crop',
    motifs: 'silhouette of body or hands, satin/silk drapery, candle, rose, bedroom interior',
    texture: 'velvety smooth, soft film grain, glow-bloom on highlights',
    lighting: 'warm tungsten low-light, golden hour, candle-glow, soft volumetric haze',
  },
  'Electronic': {
    palette: 'electric neons — cyan, magenta, deep ultraviolet, plus pure black',
    composition: 'symmetrical or geometric, abstract shapes, often grid or radial layout',
    motifs: 'fractals, light trails, wireframe geometry, pulsing orb, abstract topographic forms',
    texture: 'crisp digital, slight chromatic aberration, vector cleanness',
    lighting: 'glowing volumetric beams, laser scan-lines, screen-emitted light',
  },
  'Indie': {
    palette: 'muted vintage tones, faded blues and pinks, dusty pastels, off-whites',
    composition: 'off-center crop, candid framing, lo-fi snapshot feel',
    motifs: 'window light, hands, mundane objects, suburban exteriors, polaroid framing',
    texture: 'film grain, light scratches, slight color shift, paper texture',
    lighting: 'natural daylight, overcast soft light, golden-hour warmth',
  },
  'Folk': {
    palette: 'natural earth tones — moss greens, browns, ochre, parchment cream',
    composition: 'landscape or single still-life subject, painterly framing, rule-of-thirds',
    motifs: 'forest, river, lone figure on a path, acoustic instrument, hand-lettered feel',
    texture: 'painted/illustrated, paper grain, watercolor wash, woodcut',
    lighting: 'soft daylight, dappled forest light, golden-hour warmth',
  },
  'Jazz': {
    palette: 'midnight blues, smoky greys, brass yellows, cream, deep crimson',
    composition: 'mid-century editorial layout, abstract Blue-Note-style shapes',
    motifs: 'silhouetted instrument (sax, trumpet, upright bass), smoke, abstract type-suggesting shapes',
    texture: 'screen-print/litho-style flat color, halftone dots, aged paper',
    lighting: 'low-key bar light, single spotlight, rich shadow play',
  },
  'Classical': {
    palette: 'muted ivories, deep burgundies, antique gold, slate, marble grey',
    composition: 'classical symmetry, painterly central composition, baroque framing',
    motifs: 'orchestral instruments, statue, marble texture, ornate frame, abstract score',
    texture: 'oil-painting / fresco / engraved-print finish, fine grain',
    lighting: 'chiaroscuro Old-Master lighting, single window light, gilded warm glow',
  },
  'Lo-Fi': {
    palette: 'muted lavenders, sepia browns, soft oranges, dusty pinks',
    composition: 'small isolated subject, plenty of negative space, anime-style framing',
    motifs: 'study desk with cassette/headphones, window with rain, sleeping cat, anime-girl-by-window vibe',
    texture: 'cassette-tape grain, vinyl scratches, light VHS distortion, anime cel-shading',
    lighting: 'late-night warm desk lamp, neon sign glow through window',
  },
  'Metal': {
    palette: 'blacks, blood reds, bone whites, cold steel, occasional infernal orange',
    composition: 'symmetric occult or hellscape, baroque-detail dense fill',
    motifs: 'skulls, ravens, gothic cathedrals, runes, mountains, fire, occult symbols, weathered armor',
    texture: 'engraved/etched line-work, parchment burn, distressed leather, cracked stone',
    lighting: 'low-key with single hellish backlight, moonlight, smoke and embers',
  },
  'Country': {
    palette: 'sun-faded blues, dusty oranges, denim, weathered brown, prairie gold',
    composition: 'wide horizon, lone figure or pickup truck, landscape framing',
    motifs: 'highway, silhouetted cowboy hat, wheat field, weathered porch, neon honky-tonk sign',
    texture: 'sun-bleached photo, light film grain, denim and leather feel',
    lighting: 'golden-hour prairie sun, dusk silhouette, warm Americana glow',
  },
  'Soul': {
    palette: 'warm browns, gold, burgundy, mustard, vintage cream',
    composition: 'mid-century editorial portrait, classic LP-cover layout',
    motifs: 'portrait with vintage microphone, gospel/church visual cue, soul-era fashion',
    texture: 'vintage photograph grain, paper wear, screen-print color separation',
    lighting: 'warm tungsten, single spotlight, halo backlight',
  },
  'Funk': {
    palette: 'electric purples, hot pinks, oranges, gold, glitter accents',
    composition: 'maximalist 70s poster layout, asymmetric energetic flow',
    motifs: 'platform boots, afro silhouette, glittery suit, disco ball, abstract grooving figures',
    texture: 'screen-print 70s poster, halftone, glitter sparkle highlights',
    lighting: 'club-stage spotlights, disco-ball reflection scatter, neon backlight',
  },
  'Reggae': {
    palette: 'red-yellow-green tropics, ocean turquoise, sun-warmed earth tones',
    composition: 'sun-drenched landscape or icon-style portrait, flag-color banding',
    motifs: 'palm trees, sun rays, lion silhouette, smoke, ocean, hand-painted lettering feel',
    texture: 'hand-painted poster, sun-faded canvas, slight halftone',
    lighting: 'tropical sun, golden-hour beach, hazy heat shimmer',
  },
  'World': {
    palette: 'genre-authentic regional palette (e.g. saffron+turmeric for Bollywood, ocher+sienna for Afrobeats, indigo+coral for Latin)',
    composition: 'culturally rooted central subject, traditional framing or pattern motifs',
    motifs: 'regional textile patterns, traditional instrument, native landscape, cultural typography',
    texture: 'hand-painted or printed-textile feel, woven grain, ornate detailing',
    lighting: 'natural cultural lighting cue (sunset, lantern, stage)',
  },
  'Cinematic': {
    palette: 'teal-and-orange grade, deep navies, cold steel + ember warmth, or moody monochrome',
    composition: 'widescreen letterbox feel, single hero subject in vast environment, depth layers',
    motifs: 'landscape with single small figure, futuristic or fantasy environment, atmospheric weather',
    texture: 'photoreal CGI / matte-painted, soft film grain, atmospheric haze',
    lighting: 'volumetric light shafts, dramatic god-rays, cinematic key+rim+fill lighting',
  },
};

// Subgenre overrides for the most visually distinct subgenres only. Anything
// not listed inherits from the primary-genre block.
const SUBGENRE_VISUAL_HINTS: Record<string, Partial<VisualConvention>> = {
  'Synthwave': {
    palette: 'magenta-and-cyan neon gradient, deep violet sky, hot orange sunset',
    motifs: 'palm-tree silhouettes, gridded horizon, retro sports car, 80s sun, chrome typography feel',
    texture: 'pixel-grid scanlines, VHS chromatic aberration, vector smoothness',
    lighting: 'neon glow + chrome reflection, vaporous backlight',
  },
  'Vaporwave': {
    palette: 'soft pink, mint, lavender pastels, marble white',
    motifs: 'Greco-Roman bust, gridded floor, 90s computer iconography, dolphins, anime fragments',
    texture: 'JPEG compression artifacts, low-res screenshot feel, glossy 3D-render plastic',
    lighting: 'flat fluorescent, screen-emitted glow',
  },
  'Drill': {
    palette: 'cold blacks, slate greys, blood red flares',
    motifs: 'masked figure silhouette, foggy estate corridor, brutalist housing block, low-light street',
    texture: 'phone-camera flash photo, blocky compression, leaked-doc xerox feel',
    lighting: 'harsh single flash, sodium-vapor street lamp glow',
  },
  'Lo-Fi Hip Hop': {
    palette: 'muted browns, dusty pinks, peach, soft yellows',
    motifs: 'anime girl studying by window, cassette tape, lofi-beats bedroom, rain on glass',
    texture: 'cel-shaded anime, slight VHS noise, paper texture',
    lighting: 'warm desk-lamp glow, blue-hour window light',
  },
  'Phonk': {
    palette: 'cold steel grey, blood crimson, deep black',
    motifs: 'masked drift-car silhouette, smoky underpass, occult/Memphis cassette aesthetic',
    texture: 'distressed VHS, glitch artifacting, cassette-print feel',
    lighting: 'red flare, headlight cone in fog',
  },
  'Death Metal': {
    palette: 'black + blood red, putrid greens, bone whites',
    motifs: 'corpse imagery, illegible blackletter logo feel, gore-suggesting baroque detail',
    texture: 'engraved/etched line-work, smeared ink, decay surfaces',
    lighting: 'low-key with single red rim light, cold cave atmosphere',
  },
  'Black Metal': {
    palette: 'pure black + bone white, occasional steel blue, blood red highlights',
    motifs: 'snowy forest, bare trees, mountain silhouette, illegible spiky logo feel',
    texture: 'high-contrast engraved photocopy / xerox feel, raw black-and-white film',
    lighting: 'cold moonlight, single back-rim light, fog',
  },
  'Doom Metal': {
    palette: 'occult purples, deep greens, smoky greys, blood red',
    motifs: 'cathedral interior, occult symbol, smoke, slow-burning candle, mountain mass',
    texture: 'oil-paint / oil-on-canvas, heavy fog atmosphere',
    lighting: 'single candle or stained-glass shaft, deep shadow dominance',
  },
  'Bossa Nova': {
    palette: 'tropical pastel — soft cream, ocean turquoise, sun-warm peach',
    motifs: 'Rio coastline, café table, soft silhouette, mid-century type-suggested layout',
    texture: 'soft watercolor, paper grain, vintage poster',
    lighting: 'soft tropical sun, late afternoon warmth',
  },
  'Trap': {
    palette: 'deep purples, hot pink accents, glossy blacks, gold flashes',
    motifs: 'low-rise diamonds-and-smoke aesthetic, neon-lit interior, lean-purple gradient, blurred motion',
    texture: 'high-gloss digital, lens flare, motion blur',
    lighting: 'neon backlight, purple haze, single hot key light',
  },
  'Disco-Funk': {
    palette: 'glitter gold, hot pink, electric purple, mirrored silver',
    motifs: 'disco ball, platform boots, sequined fabric, 70s dancefloor silhouettes',
    texture: 'glittery sparkle highlights, screen-print 70s poster',
    lighting: 'rotating disco-ball scatter, multicolor stage spotlights',
  },
  'Cinematic': {
    palette: 'teal-and-orange Hollywood grade, deep blacks',
    motifs: 'lone hero on mountain ridge, vast landscape, dramatic weather, sci-fi or fantasy environment',
    texture: 'photoreal matte-painted, atmospheric haze',
    lighting: 'volumetric god-rays, magic-hour backlight, key+rim+fill',
  },
  'Western Score': {
    palette: 'sun-bleached ochre, dusty rose, prairie gold, deep navy night',
    motifs: 'lone figure at horizon, mesa, cactus silhouette, weathered wood',
    texture: 'sun-bleached photo, light grain, parchment',
    lighting: 'high-noon sun or magic-hour silhouette',
  },
  'Sci-Fi Score': {
    palette: 'deep ultraviolet, cyan, white-hot, neon teal',
    motifs: 'futuristic cityscape, alien landscape, geometric spacecraft, holographic interfaces',
    texture: 'photoreal CGI, glossy sci-fi finish',
    lighting: 'volumetric neon, hard rim light, glow-emit panels',
  },
};

export function lookupSubgenreHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return SUBGENRE_HINTS[name] ?? null;
}

export function lookupGenreHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return GENRE_HINTS[name] ?? null;
}

export function lookupMoodHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return MOOD_HINTS[name] ?? null;
}

export function lookupEnergyHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return ENERGY_HINTS[name] ?? null;
}

export function lookupVocalStyleHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return VOCAL_STYLE_HINTS[name] ?? null;
}

export function lookupEraHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return ERA_HINTS[name] ?? null;
}

// Resolve lyric conventions: subgenre first, then primary genre, then null.
export function lookupLyricConvention(
  genre: string | null | undefined,
  subGenre: string | null | undefined
): LyricConvention | null {
  if (subGenre && SUBGENRE_LYRIC_HINTS[subGenre]) return SUBGENRE_LYRIC_HINTS[subGenre]!;
  if (genre && PRIMARY_GENRE_LYRIC_HINTS[genre]) return PRIMARY_GENRE_LYRIC_HINTS[genre]!;
  return null;
}

// Resolve visual conventions: primary-genre block, with optional subgenre
// overrides merged on top.
export function lookupVisualConvention(
  genre: string | null | undefined,
  subGenre: string | null | undefined
): VisualConvention | null {
  const base = genre && PRIMARY_GENRE_VISUAL_HINTS[genre]
    ? { ...PRIMARY_GENRE_VISUAL_HINTS[genre]! }
    : null;
  const override = subGenre ? SUBGENRE_VISUAL_HINTS[subGenre] : undefined;
  if (!base && !override) return null;
  return { ...(base || PRIMARY_GENRE_VISUAL_HINTS['Pop']!), ...(override || {}) };
}
