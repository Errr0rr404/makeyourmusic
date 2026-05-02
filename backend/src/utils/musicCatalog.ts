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
  'Shoegaze': 'walls of distorted feedback guitar, washed-out reverb vocals, dense fuzzy layered textures, wall-of-sound immersion',
  'Hard Rock': 'driving riffs, powerful drums, big anthemic choruses, blues-pentatonic licks',
  'Prog Rock': 'long compositions, complex arrangements, virtuosic instrumentation, conceptual lyrics',
  'Grunge': 'heavy fuzz guitar with quiet verse/loud chorus contrast, sardonic raw vocals, murky analog production, flannel-era rawness',
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

  // Hip Hop — extended
  'Melodic Rap': 'melodic auto-tuned singing over trap beats, emotional vulnerability, 808 sub-bass, sung hooks, half-time feel',
  'Emo Rap': 'confessional vulnerability over trap beats, melodic rap/singing blend, distorted 808s, lo-fi warmth, raw emotional delivery',
  'UK Drill': 'sliding chromatic 808 basslines, offbeat stuttering hi-hats, ominous piano or string samples, UK street cadence, 140 BPM',
  'Gospel Hip Hop': 'soulful gospel choir samples, uplifting bounce 808s, spiritual conviction, 90-100 BPM, organ accents',
  'Grime': 'fast MC over 140 BPM syncopated skipbeat, dark metallic synths, hard-edged UK street energy, sparse percussion',

  // Rock — extended
  'Emo': 'crunchy/jangly dual-guitar blend, confessional emotional vocals, loud verse-chorus dynamic contrast, double-tracked chorus guitars',
  'Post-Hardcore': 'angular urgent riffs, screamed/clean vocal dynamic, hard-hitting rhythm section, intense cathartic energy',
  'Nu-Metal': 'drop-D downtuned riffs, hip-hop influenced drums, turntable scratches, alternating rap/scream vocal dynamics',
  'Post-Punk': 'angular minimal guitar lines, bass-forward sparse mix, stark cold production, detached monotone-to-emotive vocal style',
  'New Wave': 'bright shimmering synths, angular post-punk guitar, programmed drum machine rhythms, quirky melodic 80s energy',
  'Darkwave': 'melancholic minor synths, post-punk clean guitar, deep reverb-heavy baritone vocals, cold atmospheric production',
  'Trip-Hop': 'dark downtempo hip-hop breakbeats, chopped cinematic samples, brooding bass haze, 70-90 BPM',

  // Electronic — extended
  'Jungle': 'rapid amen breakbeat at 160-170 BPM, reggae bass drops, chopped MC samples, jungle percussion rush',
  'Liquid DnB': 'smooth flowing breakbeats at 170 BPM, melodic liquid bass lines, soulful vocal samples, jazzy warm atmosphere',
  'Electro House': 'driving electro filtered bassline, four-on-the-floor kick, distorted lead synth, big room drop, 128 BPM',
  'Progressive House': 'evolving arpeggiated pads, sustained four-on-the-floor pulse, long melodic builds, euphoric peak drops, 128-132 BPM',
  'Melodic Techno': 'driving 130 BPM minimal kick, hypnotic evolving minor-key melodic pads, industrial texture, emotional dark depth',
  'Afro House': 'African polyrhythmic percussion, deep rolling bassline, soulful vocal chops, spiritual dance groove, 120-124 BPM',
  'Psytrance': 'relentless 145 BPM kick, layered psychedelic arpeggiated synths, intense peak-time energy, no vocals',
  'Chiptune': '8-bit chip synthesizer arpeggios, video-game sound design, upbeat fast BPM, retro digital pixelated energy',

  // Jazz — extended
  'Nu-Jazz': 'programmed electronic beats layered with live jazz improvisation, modern fusion harmony, atmospheric contemporary feel',
  'Latin Jazz': 'Afro-Cuban clave rhythm, jazz chord extensions, piano montuno, brass solos, swung Latin feel',

  // World — extended
  'Samba': 'fast samba percussion (surdo, pandeiro), syncopated cavaquinho guitar, call-and-response, Brazilian jubilee energy, 110-130 BPM',
  'Cumbia': 'accordion melody, guache and caja drum pattern, syncopated Colombian-Caribbean groove, danceable 90-100 BPM',
  'Merengue': 'rapid 2/4 accordion and tambora rhythm, syncopated horn stabs, Dominican party energy, 120-150 BPM',
  'Afropop': 'uptempo West African rhythms, bright synth hooks, autotuned modern vocals, danceable glossy pop production',
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
  'Harmonized': 'stacked multi-part vocal harmonies, rich layered backing vocals, lush choral texture',
  'Ad-libs heavy': 'frequent ad-libs woven throughout, improvisational vocal asides, energetic vocal reactions',
  'Operatic': 'classically trained operatic delivery, expansive dynamic range, vibrato-rich resonant tone',
  'Gravelly/Raspy': 'rough gravelly vocal texture, bluesy road-worn rasp, hoarse lived-in quality',
  'Deep baritone': 'deep resonant baritone male vocal, commanding low register, warm chest resonance',
  'Melodic rap': 'melodic rap delivery blending singing and rapping, auto-tuned pitch, emo-rap emotional inflection',
  'Screamed': 'screamed or growled aggressive vocal delivery, hardcore/metal catharsis',
  'Nasal/Twangy': 'distinctive nasal twang, country or indie folk flavor, regional character',
};

const ERA_HINTS: Record<string, string> = {
  'Modern': 'modern 2020s production, streaming-optimized loudness, clear digital transients, DSP clarity',
  '2010s': '2010s production aesthetics, polished digital sheen, punchy low-end, trap-era clarity',
  '2000s': '2000s production, early-digital punchy mixes, triggered drum replacements, radio-compressed loudness',
  '90s': '90s production, 44.1kHz digital crispness, chunky sampled drums, vinyl-sourced warmth, bright brittle highs',
  '80s': '80s production: gated reverb on snare, analog synths with digital delay, huge snare crack, neon production gloss',
  '70s': '70s production: warm analog tape saturation, live-room mic placement, vintage tube compression, organic low-end weight',
  '60s': '60s production: mono or narrow early-stereo, plate reverb, close-mic vintage room sound, tape-speed variation',
  'Vintage': 'pre-60s vintage: mono mix, spring reverb, 78rpm tape hiss, period-correct instrumentation, lo-fi intimacy',
  'Timeless': 'genre-classic production, timeless mix approach that avoids decade-specific artifacts',
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
  'Longing': 'sustained unresolved harmonic tension, yearning melodic intervals, minor-key searching phrases, intimate plaintive vocal',
  'Determined': 'driving rhythmic momentum, forward-pushing bass, building dynamics, resolute confident vocal delivery',
  'Wonder': 'wide open harmonic space, unexpected chord colors, floating ethereal phrases, hushed awed breathy vocal',
  'Tender': 'slow gentle harmonic movement, soft acoustic timbres, warm subtle low-end, close-mic intimate phrasing',
  'Vulnerable': 'stripped sparse arrangement, exposed naked dynamics, raw unprocessed vocal tone, solo piano or guitar',
  'Defiant': 'heavy-hitting transient attack, aggressive driving rhythm, bold harmonic friction, confrontational vocal stance',
  'Frustrated': 'restless syncopated rhythms, harmonic tension without resolution, clipped staccato phrasing, tense vocal delivery',
  'Intense': 'compressed dense arrangement, forward-pushing high-saturation dynamics, focused driving rhythm, present powerful vocal',
  'Gentle': 'soft acoustic texture, open reverberant ambience, finger-picked or bowed sustained notes, breathy calm vocal',
  'Wistful': 'slightly detuned analog warmth, bittersweet major-minor chord shifts, mid-tempo sway, daydreaming vocal tone',
  'Desperate': 'accelerating tempo feel, fragmented rhythms, urgent harmonic motion, strained raw vocal delivery',
  'Serene': 'very slow tempo, long sustained tones, tonal consonance, silence as part of the arrangement, minimal movement',
};

// Per-genre lyric conventions: rhyme scheme, line length, vocabulary register,
// total length target, structure conventions. The lyric system prompt picks the
// matching block by genre; subgenre overrides primary genre.

// Quality tier sets the bar the lyric is held to. The tier maps to a paragraph
// of guidance injected into the lyric system prompt — what "good" looks like
// for this genre's audience. Rock / metal / indie / folk / jazz / conscious
// hip-hop fans read lyrics; pop fans want a hook; trap fans want flow; dance
// fans want a chant. The bar is shaped to match.
export type LyricQualityTier =
  | 'literary'      // audience reads lyrics — every line must earn its place
  | 'narrative'     // story-driven, concrete specifics, plain-spoken
  | 'hook-craft'    // the chorus IS the song; verses serve the hook
  | 'flow'          // cadence + rhyme density carry it; substance still required
  | 'minimal'       // sparse repeated phrases as melodic motifs
  | 'cinematic';    // vocal as instrument, vowel-driven, invocational

export interface LyricConvention {
  /** Short comma-separated rhyme/meter cues (e.g. "AABB couplets, 8-syllable lines"). */
  rhyme: string;
  /** Vocabulary register, point of view, narrative shape. */
  voice: string;
  /** Genre-typical structure (mirror what the music will support). */
  structure: string;
  /** Density guidance — describes how packed each section should feel, not a word quota. */
  lengthHint: string;
  /** Quality bar for this genre's audience. Drives the craft paragraph in the lyric prompt. */
  quality: LyricQualityTier;
}

const SUBGENRE_LYRIC_HINTS: Record<string, LyricConvention> = {
  // Hip Hop
  'Trap': {
    rhyme: 'multi-syllable internal rhymes, AAAA bars, triplet flow accents',
    voice: 'first-person swagger, modern slang, brand/lifestyle imagery, present tense',
    structure: 'Intro → 16-bar Verse → Hook → 16-bar Verse → Hook → Bridge → Hook',
    lengthHint: 'two 16-bar verses with hook returns; bars are short and breath-paced — let flow drive density',
    quality: 'flow',
  },
  'Boom Bap': {
    rhyme: 'dense end-rhymes with internal multis, 4-bar punchlines',
    voice: 'first-person storyteller, street-poetic vocabulary, vivid concrete imagery',
    structure: 'Intro → 16-bar Verse → 8-bar Hook → 16-bar Verse → 8-bar Hook → Verse → Hook',
    lengthHint: 'three full verses with dense rhyme — this is a bar-quotable subgenre, every bar should land an image, threat, or wordplay',
    quality: 'literary',
  },
  'Drill': {
    rhyme: 'aggressive end-rhymes, sliding cadence on the last word, repeated tag refrains',
    voice: 'first-person hard-edged, blunt declarative imagery, present-tense menace',
    structure: 'Tag → 16-bar Verse → Hook → 16-bar Verse → Hook',
    lengthHint: 'two tight 16-bar verses; menace and concrete street detail over decoration',
    quality: 'flow',
  },
  'Conscious': {
    rhyme: 'literary multi-syllable rhymes, layered metaphors, complex word-flips',
    voice: 'first-person reflective, social/political imagery, allegory and metaphor',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Verse → Hook',
    lengthHint: 'long-form, three or four verses — listeners come for the argument and the imagery, give them weight',
    quality: 'literary',
  },
  'Cloud Rap': {
    rhyme: 'loose half-rhymes, repeated words for hypnotic effect, melodic phrasing',
    voice: 'first-person dreamy, abstract imagery, present-tense languid',
    structure: 'Intro → Verse → Hook → Verse → Hook → Outro',
    lengthHint: 'sparse, atmospheric — repeated phrases as motifs, fewer but stranger images',
    quality: 'flow',
  },
  'Lo-Fi Hip Hop': {
    rhyme: 'soft end-rhymes, conversational phrasing, repeated mantra hooks',
    voice: 'first-person introspective, study/late-night imagery, calm present tense',
    structure: 'Verse → Hook → Verse → Hook (often instrumental-heavy with sparse vocals)',
    lengthHint: 'sparse — vocals come and go; one strong scenic detail per verse beats a packed bar',
    quality: 'narrative',
  },
  // R&B
  'Neo-Soul': {
    rhyme: 'flowing end-rhymes with vocal runs, conversational meter',
    voice: 'first-person sensual, organic body imagery, expressive vulnerability',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'full song body — verses and bridge carry weight; vulnerability is specific, not generic',
    quality: 'literary',
  },
  'Alternative R&B': {
    rhyme: 'sparse rhyme, melodic repetition over rhyme density, atmospheric phrasing',
    voice: 'first-person introspective, modern romantic ambiguity, dreamlike imagery',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Outro',
    lengthHint: 'atmospheric — fewer lines that linger over many that wander',
    quality: 'literary',
  },
  // Pop
  'Synth-Pop': {
    rhyme: 'simple AABB or ABAB end-rhymes, hook-forward chorus',
    voice: 'first or second person, bright modern imagery, repeated chant-able chorus',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'standard pop body — most of the writing budget belongs to the chorus hook',
    quality: 'hook-craft',
  },
  'Dance Pop': {
    rhyme: 'simple ABAB rhymes, chant-along chorus with title-as-hook',
    voice: 'first or second person, body/club imagery, present-tense urgency',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Drop/Final Chorus',
    lengthHint: 'tight verses, anthemic chorus repeated verbatim — the chorus IS the song',
    quality: 'hook-craft',
  },
  'K-Pop': {
    rhyme: 'mixed-language ABAB rhymes, chant hook, repeated catchphrase ad-libs',
    voice: 'group POV, aspirational imagery, dynamic shifts in tone across sections',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge (rap or dance break) → Final Chorus',
    lengthHint: 'multi-section showcase — each section has a distinct energy, hook is highly repeated',
    quality: 'hook-craft',
  },
  'Hyperpop': {
    rhyme: 'rapid-fire end-rhymes, repeated short phrases, chant-style hook',
    voice: 'first-person hyper-emotional, internet/digital imagery, exaggerated affect',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus (often sub-2 min)',
    lengthHint: 'short, sub-2-min energy — every line is hooky, no breathing room',
    quality: 'hook-craft',
  },
  'Bedroom Pop': {
    rhyme: 'soft slant-rhymes, conversational meter, quiet hook',
    voice: 'first-person intimate, diary-room imagery, vulnerable present tense',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Outro',
    lengthHint: 'intimate diary length — concrete domestic detail beats poetic abstraction',
    quality: 'literary',
  },
  // Rock
  'Indie Rock': {
    rhyme: 'loose ABAB, conversational meter, hook line in chorus',
    voice: 'first-person observational, slice-of-life imagery, ironic distance',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'verses carry observation and image — this audience reads lyrics, do not phone the verses in',
    quality: 'literary',
  },
  'Punk Rock': {
    rhyme: 'simple AABB, short blunt lines, shouted chorus',
    voice: 'first-person defiant, anti-establishment imagery, present-tense confrontation',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus (often <2:30)',
    lengthHint: 'short, fast, declarative — every line is a fist, no decorative imagery, no padding',
    quality: 'narrative',
  },
  'Alternative': {
    rhyme: 'AABA or ABCB, dynamic chorus contrast, vivid imagery',
    voice: 'first-person introspective with anthemic chorus turn, layered emotion',
    structure: 'Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'verses build emotional weight; chorus is anthemic — substance in BOTH halves',
    quality: 'literary',
  },
  'Metalcore': {
    rhyme: 'screamed verses with sung chorus contrast, anthemic AABB chorus',
    voice: 'first-person catharsis, anguished imagery, declarative chorus statement',
    structure: 'Intro → Verse (scream) → Pre-Chorus → Chorus (sung) → Verse (scream) → Chorus → Breakdown → Bridge → Final Chorus',
    lengthHint: 'verses are catharsis, chorus is the resolution statement — both demand intent',
    quality: 'literary',
  },
  // Folk
  'Indie Folk': {
    rhyme: 'AABB or ABAB, narrative imagery, refrain instead of pop chorus',
    voice: 'first-person reflective, nature/place imagery, past-tense storytelling',
    structure: 'Verse → Refrain → Verse → Refrain → Bridge → Refrain (often strophic)',
    lengthHint: 'long-form storytelling — multiple verses advancing a story, refrain is the emotional anchor',
    quality: 'literary',
  },
  'Singer-Songwriter': {
    rhyme: 'AABB or ABAB, conversational meter, narrative arc',
    voice: 'first-person confessional, autobiographical imagery, vulnerable specificity',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'long verses, full narrative arc — this audience pays attention to every line',
    quality: 'literary',
  },
  'Americana': {
    rhyme: 'AABB end-rhymes, narrative ballad meter, regional vocabulary',
    voice: 'first-person plain-spoken, working-class imagery, place names and concrete details',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'long-form ballad — name the place, the truck, the diner, the river; specifics are the whole craft',
    quality: 'narrative',
  },
  'Bluegrass': {
    rhyme: 'AABB tight end-rhymes, fast-meter narrative',
    voice: 'first-person folk-tale storyteller, rural imagery, past-tense narrative',
    structure: 'Verse → Chorus → Verse → Chorus → Instrumental break → Verse → Chorus',
    lengthHint: 'fast narrative — story moves quickly, every verse advances the tale',
    quality: 'narrative',
  },
  // Country
  'Outlaw Country': {
    rhyme: 'AABB couplets, shuffle meter, twangy turn-of-phrase',
    voice: 'first-person rebel, working-class imagery, hard-living specificity',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'narrative-rich verses — concrete hard-living detail, not generic rebellion',
    quality: 'narrative',
  },
  'Country Pop': {
    rhyme: 'AABB simple rhymes, hook-forward chorus, country twang vocabulary',
    voice: 'first-person heartfelt, small-town/rural imagery, big chorus payoff',
    structure: 'Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'pop body with country imagery — chorus is the payoff, verses set up specifics that lead there',
    quality: 'hook-craft',
  },
  // Electronic
  'House': {
    rhyme: 'minimal lyric content, repeated short phrases, chant-style hook',
    voice: 'second-person dance-floor invitation, sensory body imagery',
    structure: 'Intro → Verse → Build → Drop/Hook → Breakdown → Build → Drop/Hook → Outro',
    lengthHint: 'sparse — a four-line refrain on loop is enough; pick words that ride the groove',
    quality: 'minimal',
  },
  'Future Bass': {
    rhyme: 'simple ABAB, chopped vocal phrases, repeated chant pre-drop',
    voice: 'first-person uplifting, big-feeling imagery, festival-anthem direct address',
    structure: 'Intro → Verse → Pre-Drop → Drop/Hook → Verse → Pre-Drop → Drop/Hook → Outro',
    lengthHint: 'short verse, repeating drop hook — chant-able phrases that survive a chopped vocal edit',
    quality: 'minimal',
  },
  'Trance': {
    rhyme: 'sparse repeated phrases, chant-style hook',
    voice: 'second-person ecstatic, transcendent imagery, present-tense surrender',
    structure: 'Intro → Verse → Pre-Drop/Build → Drop → Breakdown → Build → Drop → Outro',
    lengthHint: 'minimal lyric — a single repeated invocation often carries the whole vocal',
    quality: 'minimal',
  },
  // Soul / Funk / Reggae
  'Gospel': {
    rhyme: 'AABB or ABAB, refrain-heavy, call-and-response',
    voice: 'first-person or congregational, spiritual/uplifting imagery, declarative testimony',
    structure: 'Verse → Chorus/Refrain → Verse → Chorus → Bridge → Final Chorus (often with vamp)',
    lengthHint: 'testimony-length — verses build the witness, refrain is the communal answer',
    quality: 'narrative',
  },
  'Motown': {
    rhyme: 'AABB simple rhymes, snappy hook, call-and-response with backing vocals',
    voice: 'first-person heartfelt, romantic imagery, classic mid-century vocabulary',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'tight pop body — the hook lands fast and stays',
    quality: 'hook-craft',
  },
  'Roots Reggae': {
    rhyme: 'simple AABB, conscious refrain, repeated mantra hook',
    voice: 'first-person spiritual/political, communal imagery, repeated declarative refrain',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus',
    lengthHint: 'verses make the case, refrain is the communal answer — meaning over decoration',
    quality: 'narrative',
  },
  'Reggaeton': {
    rhyme: 'Spanish AABB or ABAB, hook-forward chorus, ad-libs woven through',
    voice: 'first-person sensual or party, club imagery, direct address',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'club-pop body — chorus and ad-libs do the heavy lifting',
    quality: 'hook-craft',
  },
  // Rock — extended
  'Emo': {
    rhyme: 'AABB or ABAB, earnest meter, internal rhymes without studied cleverness',
    voice: 'first-person raw confessional, hyper-specific personal imagery, teenage-to-young-adult emotional landscape',
    structure: 'Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'verses are specific and confessional — real place, actual thing, specific shame or hope; chorus is the cathartic release that earns every setup line',
    quality: 'literary',
  },
  'Post-Hardcore': {
    rhyme: 'loose screamed-verse rhymes, clean sung chorus with emotional AABB payoff',
    voice: 'first-person cathartic, alternating raw confrontation and vulnerable surrender, anguish-and-redemption imagery',
    structure: 'Intro → Verse (scream) → Pre-Chorus → Chorus (clean) → Verse (scream) → Chorus → Breakdown → Bridge → Final Chorus',
    lengthHint: 'screamed verses are catharsis, chorus is the resolution — both must mean something specific, not placeholder pain',
    quality: 'literary',
  },
  'Nu-Metal': {
    rhyme: 'AABB in verses, aggressive repeated chorus hook, rapped bridge or verse',
    voice: 'first-person alienation and anger, suburban angst, explicit frustration, rap-rock vocabulary',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge (rap) → Breakdown → Final Chorus',
    lengthHint: 'direct and punching — the catharsis is in the aggression, the specificity of the anger makes it land',
    quality: 'narrative',
  },
  'Grunge': {
    rhyme: 'loose slant rhymes, indifferent or sardonic meter, hard-hitting chorus hook',
    voice: 'first-person alienated, sardonic anti-establishment imagery, apathetic-to-cathartic emotional arc',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'the indifferent verse is setup for the explosive chorus — laid-back verse word-choice IS the aesthetic, but the chorus must land',
    quality: 'literary',
  },
  'Post-Punk': {
    rhyme: 'minimal or absent rhyme, angular declarative statements, literary prose-poem delivery',
    voice: 'first-person or observational, socially critical or alienated imagery, dry detached vocabulary',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Outro',
    lengthHint: 'austere and purposeful — every line is a statement, no filler, literary without being showy',
    quality: 'literary',
  },
  'New Wave': {
    rhyme: 'ABAB or AABB with quirky off-kilter imagery, upbeat bouncy meter',
    voice: 'first or second person, playful or ironic modern imagery, dance-pop vocabulary with character edge',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'pop body with edge — hook is central but verses have more personality than generic pop filler',
    quality: 'hook-craft',
  },
  'Darkwave': {
    rhyme: 'sparse rhyme, literary prose-poetry, slow deliberate meter',
    voice: 'first-person brooding introspection, existential or romantic-gothic imagery, cold detached-to-yearning delivery',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Outro',
    lengthHint: 'few lines, all weight — dark imagery is specific not generic; atmosphere over quantity',
    quality: 'literary',
  },
  'Shoegaze': {
    rhyme: 'soft near-inaudible half-rhymes, dreamlike meter, lyric as texture not content',
    voice: 'first-person distant dreamy, abstract sensory impressionism, vocal buried in the mix as an instrument',
    structure: 'Verse → Chorus → Verse → Chorus → Outro (often no bridge — the wall of sound IS the bridge)',
    lengthHint: 'minimal, impressionistic — the words need to survive being drowned in reverb; consonants and texture over meaning',
    quality: 'minimal',
  },
  'Garage Rock': {
    rhyme: 'AABB raw loose rhymes, gritty primal imagery, unfussy direct vocabulary',
    voice: 'first-person raw, street-grit or heartbreak, short declarative lines',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'raw and direct — power is in the delivery not the poetry; short tight verses, hard-hitting chorus',
    quality: 'narrative',
  },
  'Hard Rock': {
    rhyme: 'AABB or ABAB, anthemic chorus, power and freedom imagery',
    voice: 'first-person defiant, blue-collar or rebellious vocabulary, victorious or confrontational stance',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Solo Section → Final Chorus',
    lengthHint: 'anthemic and punching — both verses and chorus deliver weight; the solo speaks when words run out',
    quality: 'literary',
  },
  'Prog Rock': {
    rhyme: 'complex literary rhymes, conceptual ABCB or through-composed, multi-syllabic',
    voice: 'conceptual narrator or first-person epic, mythic/cosmic/political imagery, literary vocabulary',
    structure: 'Multi-movement through-composed: Intro → Theme A → Development → Theme B → Climax → Resolution → Coda',
    lengthHint: 'epic length — multiple movements, conceptual arc; listeners come for the full journey, give them one',
    quality: 'literary',
  },
  'Surf Rock': {
    rhyme: 'AABB simple bright rhymes, beach/ocean imagery, fun carefree vocabulary',
    voice: 'first or second person, summer/beach/road energy, simple joyful direct address',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Guitar Break → Final Chorus',
    lengthHint: 'short fun verses, singalong chorus — this music is all energy and sun',
    quality: 'narrative',
  },

  // Hip Hop — extended
  'Melodic Rap': {
    rhyme: 'melodic end-rhymes with auto-tune phrasing, AABB or AAAA bars with sung hook',
    voice: 'first-person emotional vulnerability, modern trap imagery blended with romantic or heartbreak themes',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Hook',
    lengthHint: 'hook is the song — melodic and repeated; verse sets up the emotional context for the hook to pay off',
    quality: 'hook-craft',
  },
  'Emo Rap': {
    rhyme: 'soft end-rhymes, melodic trap flow, confessional imagery over sung delivery',
    voice: 'first-person raw confessional, mixing hip-hop bravado with emotional vulnerability, late-night isolation imagery',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Outro',
    lengthHint: 'specific confessional detail matters most — the more specific the shame or longing, the more universal it feels; avoid abstract pain',
    quality: 'literary',
  },
  'Phonk': {
    rhyme: 'slow menacing AAAA bar rhymes, Memphis-style cadence, dark declarative hooks',
    voice: 'first-person menacing, dark late-night Memphis street imagery, slow swagger, horror imagery',
    structure: 'Intro → Verse → Hook → Verse → Hook → Outro',
    lengthHint: 'sparse and menacing — slow delivery with dark imagery; repetition is intentional, let it breathe',
    quality: 'flow',
  },
  'UK Drill': {
    rhyme: 'sliding cadence end-rhymes, UK slang and road vocabulary, repetitive tag refrains',
    voice: 'first-person hard street imagery, UK vernacular, present-tense menace, postcode rivalry',
    structure: 'Intro → Verse → Hook → Verse → Hook',
    lengthHint: 'tight and compressed — UK slang specificity is the whole identity; every bar should feel like a reference only insiders catch',
    quality: 'flow',
  },
  'Grime': {
    rhyme: 'rapid-fire multisyllabic rhymes, skipbeat-locked cadence, aggressive UK wordplay',
    voice: 'first-person MC swagger, UK street vocabulary, quick-fire wit and menace',
    structure: 'Intro → Verse → Hook → Verse → Hook → Outro',
    lengthHint: 'fast and dense — every bar is a punchline or an image, no placeholder filler',
    quality: 'flow',
  },
  'Gospel Hip Hop': {
    rhyme: 'AABB with testimony structure, call-and-response chorus, uplifting declarative hooks',
    voice: 'first-person spiritual testimony, community and faith imagery, grateful or determined stance',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge (spoken testimony or choir) → Final Hook',
    lengthHint: 'testimony-length verses with communal hook returns; specific spiritual experience beats generic faith declarations',
    quality: 'narrative',
  },

  // Electronic — extended
  'Trip-Hop': {
    rhyme: 'sparse free verse or soft half-rhymes, introspective cool meter',
    voice: 'first-person detached observational, noir-cinematic imagery, cool distance with underlying ache',
    structure: 'Verse → Hook → Verse → Hook → Outro (often heavily instrumental)',
    lengthHint: 'sparse — fewer denser lines; one haunting image per verse beats ten generic ones',
    quality: 'literary',
  },
  'Chiptune': {
    rhyme: 'simple AABB upbeat rhymes, video-game/digital/retro imagery',
    voice: 'second-person direct or playful first-person, adventure/quest vocabulary, bright optimistic energy',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'short energetic verses, hooky chorus — this is celebratory and fun',
    quality: 'hook-craft',
  },

  // Jazz — extended
  'Smooth Jazz': {
    rhyme: 'soft AABA or free verse, sophisticated understated meter',
    voice: 'first-person romantic, sophisticated adult imagery, sensual intimacy without explicitness',
    structure: 'AABA standard or Intro → Verse → Chorus → Verse → Chorus → Instrumental → Outro',
    lengthHint: 'short elegant lyric — refinement over density; adult-contemporary poise',
    quality: 'literary',
  },
  'Bebop': {
    rhyme: 'scat-influenced or literary AABA, sophisticated jazz vocabulary, complex melodic wordplay',
    voice: 'first-person jazz-cat delivery, sophisticated metaphors, blues-era phrasing, inside jazz vocabulary',
    structure: 'Head (AABA 32-bar) → Solos → Head',
    lengthHint: 'short, refined, sophisticated — the instrument is the star; the lyric frames it elegantly',
    quality: 'literary',
  },
  'Jazz Fusion': {
    rhyme: 'sparse or instrumental; if vocal: free-form jazz phrasing, sophisticated melodic delivery',
    voice: 'first-person sophisticated or wordless/scat, voice as instrument more than narrator',
    structure: 'Through-composed or Head → Solos → Closing Head',
    lengthHint: 'mostly instrumental; when vocal the voice is an instrument — fewer words, more phrasing and color',
    quality: 'cinematic',
  },
  'Big Band': {
    rhyme: 'AABA standard rhyme, upbeat swing vocabulary, romantic or dance-floor imagery',
    voice: 'first-person romantic or celebratory, mid-century swing vocabulary, charismatic delivery',
    structure: 'Intro → Verse (AABA) → Chorus → Instrumental break → Verse → Outro',
    lengthHint: 'short classic standard form — charm and swing over length',
    quality: 'literary',
  },
  'Lounge Jazz': {
    rhyme: 'AABA or AABB, sophisticated soft delivery, intimate romantic vocabulary',
    voice: 'first-person intimate romantic, dinner-party sophistication, understated yearning',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Solo Section → Outro',
    lengthHint: 'soft and intimate — restraint is the craft; less is more',
    quality: 'literary',
  },

  // Soul / Funk — extended
  'Disco-Funk': {
    rhyme: 'AABB or simple repeated phrases, dance-floor chant hook',
    voice: 'second-person direct address, celebratory body and dance imagery, 70s groove vocabulary',
    structure: 'Intro → Verse → Hook → Verse → Hook → Breakdown → Hook → Outro',
    lengthHint: 'the groove IS the song — short verses serve the repeated hook; chant-able and physical',
    quality: 'hook-craft',
  },
  'Afrobeats': {
    rhyme: 'mixed-language ABAB, catch-phrase hook with ad-libs, pidgin welcome',
    voice: 'first-person celebratory, body and dance imagery, West African energy, communal confidence',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Hook',
    lengthHint: 'hook-led with ad-libs woven through — chorus is repeated, energetic, chant-able with cultural flavor',
    quality: 'hook-craft',
  },
  'Northern Soul': {
    rhyme: 'AABB or ABAB, heartfelt hook, dance-driving emotional vocabulary',
    voice: 'first-person heartfelt, love-lost-and-found imagery, 60s Northern soul vocabulary',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'full pop-soul body — every chorus return should feel like a payoff',
    quality: 'hook-craft',
  },

  // Reggae — extended
  'Dancehall': {
    rhyme: 'Jamaican patois AABB, energetic chat flow, riddim-locked cadence',
    voice: 'first-person confidence, dance-floor and street imagery, Jamaican cultural vocabulary',
    structure: 'Intro → Verse → Hook → Verse → Hook → Verse → Hook',
    lengthHint: 'riddim-locked phrasing — vocal melody and cadence carry the song, cultural specificity adds authenticity',
    quality: 'flow',
  },
  'Ska': {
    rhyme: 'AABB upbeat bouncy rhymes, cheerful social commentary or fun imagery',
    voice: 'first-person community energy, danceable fun, horn-driven vocabulary',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Instrumental break → Final Chorus',
    lengthHint: 'short fun verses, singalong chorus — this music wants to make people move and sing together',
    quality: 'narrative',
  },
  'Dub': {
    rhyme: 'sparse mantra-like phrases, echo-heavy repeating motifs, chant delivery',
    voice: 'roots reggae spiritual vocabulary, echo and repetition as hypnotic device',
    structure: 'mostly instrumental with sparse vocal phrases dropped in and echoed',
    lengthHint: 'minimal — a single repeated phrase or invocation is enough; the echo and reverb ARE the lyrics',
    quality: 'minimal',
  },

  // World — extended
  'Afropop': {
    rhyme: 'ABAB mix of English and local language, catchy pop hook, repeated chorus phrase',
    voice: 'first-person celebratory, modern African urban energy, multilingual vocabulary',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'pop structure with local flavor — hook is catchy and simple, language mixing adds cultural texture',
    quality: 'hook-craft',
  },

  // World
  'Bossa Nova': {
    rhyme: 'subtle slant rhymes, soft conversational meter',
    voice: 'first-person quiet romantic, warm tropical imagery, breathy intimacy',
    structure: 'Verse → Chorus → Verse → Chorus → Instrumental → Final Chorus',
    lengthHint: 'short, breathy — quiet specificity, no shouting; a quiet song earned in a few perfect lines',
    quality: 'literary',
  },
  // Cinematic — usually instrumental, but if vocal:
  'Choral': {
    rhyme: 'simple AABB or sacred-text style, repeated invocational refrain',
    voice: 'collective POV, sacred or epic imagery, vowel-driven phrasing for choir',
    structure: 'Verse → Refrain → Verse → Refrain → Final Refrain (or through-composed)',
    lengthHint: 'invocational — vowel-rich, sacred or epic phrasing; few words, all weight',
    quality: 'cinematic',
  },
};

const PRIMARY_GENRE_LYRIC_HINTS: Record<string, LyricConvention> = {
  'Pop': {
    rhyme: 'simple AABB or ABAB end-rhymes, chant-able chorus repeated verbatim',
    voice: 'first or second person, hook-driven, modern relatable imagery',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'standard pop body — most of the writing budget belongs to the chorus hook',
    quality: 'hook-craft',
  },
  'Hip Hop': {
    rhyme: 'multi-syllable internal rhymes, dense end-rhymes, 16-bar verses',
    voice: 'first-person, vivid concrete imagery, present-tense delivery',
    structure: 'Intro → 16-bar Verse → 8-bar Hook → 16-bar Verse → 8-bar Hook → Bridge → Hook',
    lengthHint: 'two or three 16-bar verses with hook returns; bars carry the weight',
    quality: 'flow',
  },
  'Rock': {
    rhyme: 'AABB or ABAB, anthemic chorus, vivid hook line',
    voice: 'first-person emotive, declarative imagery, dynamic vocal delivery',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'verses carry observation and emotion; chorus is anthemic — both halves demand intent',
    quality: 'literary',
  },
  'R&B': {
    rhyme: 'flowing end-rhymes with melodic runs, conversational meter',
    voice: 'first-person, romantic/sensual imagery, vulnerable expressive delivery',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'full song body — verses and bridge carry weight; vulnerability is specific, not generic',
    quality: 'literary',
  },
  'Electronic': {
    rhyme: 'sparse repeated phrases, chant-style hook',
    voice: 'second-person direct address, body/dance/sky imagery, simple repeated phrasing',
    structure: 'Intro → Verse → Build/Pre-Drop → Drop/Hook → Verse → Build → Drop → Outro',
    lengthHint: 'sparse — a short repeated refrain over a drop is plenty',
    quality: 'minimal',
  },
  'Indie': {
    rhyme: 'loose ABAB or slant rhymes, conversational meter',
    voice: 'first-person observational, slice-of-life imagery, ironic warmth',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'verses are observational and image-rich — this audience reads lyrics',
    quality: 'literary',
  },
  'Folk': {
    rhyme: 'AABB or ABAB end-rhymes, narrative ballad meter',
    voice: 'first-person reflective, nature/place/people imagery, past-tense storytelling',
    structure: 'Verse → Refrain → Verse → Refrain → Bridge → Refrain (often strophic, no big chorus)',
    lengthHint: 'long-form ballad — multiple verses advancing a story, refrain is the emotional anchor',
    quality: 'literary',
  },
  'Jazz': {
    rhyme: 'AABA standard form, sophisticated vocabulary, slant rhymes welcome',
    voice: 'first-person reflective, sophisticated romantic imagery, conversational delivery',
    structure: 'AABA standard form (32-bar) or Verse → Chorus → Bridge → Chorus',
    lengthHint: 'short standard-form lyric — every line is a refined turn of phrase',
    quality: 'literary',
  },
  'Lo-Fi': {
    rhyme: 'soft end-rhymes, repeated mantras, conversational meter',
    voice: 'first-person introspective, late-night/study imagery, calm present tense',
    structure: 'Verse → Hook → Verse → Hook (often very sparse vocals)',
    lengthHint: 'sparse — vocals come and go; one strong scenic detail per verse',
    quality: 'narrative',
  },
  'Metal': {
    rhyme: 'AABB or AABA, anthemic chorus, declarative dark imagery',
    voice: 'first-person catharsis, mythic/dark/political imagery, declarative vocal stance',
    structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Pre-Chorus → Chorus → Bridge → Final Chorus',
    lengthHint: 'verses are catharsis with weight; chorus is the resolution statement — this audience reads lyrics, lean into mythic specificity',
    quality: 'literary',
  },
  'Country': {
    rhyme: 'AABB couplets, narrative shuffle meter, plain-spoken vocabulary',
    voice: 'first-person plain-spoken, working-class/rural imagery, concrete specifics',
    structure: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'long-form narrative — name the place, the truck, the diner; specifics are the whole craft',
    quality: 'narrative',
  },
  'Soul': {
    rhyme: 'flowing end-rhymes with vocal runs, AABB or ABAB',
    voice: 'first-person heartfelt, romantic or spiritual imagery, expressive vulnerability',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'full song body — verses build the testimony, chorus is the resolution',
    quality: 'literary',
  },
  'Funk': {
    rhyme: 'AABB or repeated short phrases, chant-style hook',
    voice: 'first or second person, body/groove imagery, playful direct address',
    structure: 'Intro → Verse → Hook → Verse → Hook → Bridge → Hook',
    lengthHint: 'groove-driven — short snappy verses, repeated hook',
    quality: 'hook-craft',
  },
  'Reggae': {
    rhyme: 'simple AABB, conscious refrain, repeated mantra hook',
    voice: 'first-person spiritual or political, communal imagery, declarative refrain',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus',
    lengthHint: 'verses make the case, refrain is the communal answer',
    quality: 'narrative',
  },
  'World': {
    rhyme: 'genre-authentic rhyme scheme; native-language phrasing where applicable',
    voice: 'first-person celebratory or romantic, regional cultural imagery',
    structure: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
    lengthHint: 'genre-authentic body — regional specificity in imagery and vocabulary',
    quality: 'narrative',
  },
  'Cinematic': {
    rhyme: 'sparse if vocal — usually instrumental; if vocal, vowel-driven choral phrasing',
    voice: 'collective or narrator POV, mythic/epic imagery, vowel-forward delivery',
    structure: 'Through-composed build-and-release; if structured, Refrain → Verse → Refrain',
    lengthHint: 'invocational — most cinematic music is instrumental; when vocal, few words and all weight',
    quality: 'cinematic',
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

// Per-tier craft paragraph injected into the lyric system prompt. The tier
// describes WHAT good looks like for this genre's audience — a Boom Bap head
// quotes bars, a pop fan sings a chorus, a trance fan rides a chant. The bar
// the lyric is held to should match.
const QUALITY_TIER_GUIDANCE: Record<LyricQualityTier, string> = {
  literary:
    `This genre's audience are music lovers who read lyrics, quote favorite lines, and dismiss songs whose words feel hollow. Treat the lyric as a poem set to music. Bring concrete sensory detail (sight, body, weather, place, object), narrative arc, and at least one striking turn — an unexpected image, a contradiction, a question that lands. Layered metaphor and unusual vocabulary are welcome where they are earned. Greeting-card sentiment ("our love is fire", "we light up the sky") fails this audience instantly. If you cannot say something true and specific about the idea, reduce the line count instead of padding with abstractions.`,
  narrative:
    `Tell a real story with a real narrator. Anchor the song in physical detail — place names, body language, weather, objects, dialogue, time of day. Verse 1 sets the scene; verse 2 advances or complicates it; the chorus is the emotional fulcrum, not just a tagline. Plain-spoken language beats clever phrasing here. Specificity is the whole craft: a song about "missing someone" is generic; "her car still parked outside her mother's place on Tuesdays" is yours. Avoid filler conjunctions ("and I, and I", "oh well, oh well") that pad bars without advancing the story.`,
  'hook-craft':
    `The chorus IS the song. Spend most of the craft budget on a memorable, sing-able hook that lands inside the first three words and is repeated verbatim. Verses are setup — short, emotionally clear, never overwriting; their job is to make the chorus hit harder. Repetition of a strong line is a strength here, not a weakness. Avoid clever phrasing that obscures the hook or asks the listener to decode meaning during the chorus. The chorus should be quotable after one listen.`,
  flow:
    `Cadence, rhyme density, and pocket carry the song. Multi-syllable rhymes, internal rhymes, unexpected stress placement, and breath control matter more than narrative arc. But filler kills flow as fast as it kills literature: empty placeholder phrases ("yeah, yeah", "check it", random ad-libs replacing actual content) are the giveaway of weak writing. Each bar should land a punchline, image, observation, swagger, threat, or wit. Bring substance to the rhythm — the bar count is your meter, but the bars themselves still need weight.`,
  minimal:
    `Dance and electronic music is mostly instrumental. A short repeated refrain (4-8 lines) under a drop, paired with a sparse verse or none at all, is plenty. With so few words, each one must carry weight: pick strong, vowel-rich, sing-able phrases that work as melodic motifs. Direct address ("you", "we") and physical/sensory imagery beat abstract sentiment. Resist the urge to write more lyrics than the genre wants — fewer words landed are better than many words ignored.`,
  cinematic:
    `Vocals function as another instrument. Use vowel-rich, open-syllable phrasing. Register is invocation, ceremony, or atmosphere — not pop confession. Often non-narrative: a single repeated phrase or sacred-text-style refrain works. Latin or any vowel-forward language is welcome where appropriate. Few words, all weight.`,
};

export function lookupQualityTierGuidance(
  tier: LyricQualityTier | null | undefined
): string | null {
  if (!tier) return null;
  return QUALITY_TIER_GUIDANCE[tier] ?? null;
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
