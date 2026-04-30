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

export function lookupSubgenreHint(name: string | null | undefined): string | null {
  if (!name) return null;
  return SUBGENRE_HINTS[name] ?? null;
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
