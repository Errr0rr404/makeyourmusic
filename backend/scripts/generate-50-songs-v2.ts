// Generate 50 diverse AI songs end-to-end against the live API.
//
// What this exercises (per song):
//   1. POST /api/ai/music  → server-side orchestration (lyrics + music prompt
//      built from rich structured fields), persona-aware persistence, async
//      MiniMax generation
//   2. Poll /api/ai/generations/:id until status === COMPLETED
//   3. POST /api/ai/cover-art → MiniMax image-01 with genre-aware visual
//      conventions (palette / composition / motifs / texture / lighting)
//   4. POST /api/ai/generations/:id/publish → Track row with cover art, genre,
//      and (when AUTO_PREVIEW_VIDEO=1 on the server) a Hailuo preview video
//
// Usage:
//   cd backend && npx ts-node --transpile-only scripts/generate-50-songs-v2.ts
//
// Env (optional):
//   API_BASE          = override target (default = live Railway API)
//   START_AT          = skip the first N seeds (resume after a crash)
//   ONLY              = comma-separated 1-based indices to run, e.g. "3,7,42"
//   COVER_ART         = "0" to skip cover-art + publish (music-only smoke test)
//   PUBLISH           = "0" to skip publish step but still generate cover art

import axios, { AxiosError } from 'axios';
import { config } from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE || 'https://makeyourmusic.up.railway.app/api';
const EMAIL = process.env.DEMO_EMAIL || 'demo@gmail.com';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo123';
const START_AT = parseInt(process.env.START_AT || '0', 10);
const ONLY_SET = (process.env.ONLY || '')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0);
const DO_COVER_ART = process.env.COVER_ART !== '0';
const DO_PUBLISH = process.env.PUBLISH !== '0';
// The /api/ai/* router has a 20-req-per-60s burst limiter. Each generation
// costs roughly: 1 (POST music) + N (status polls) + 1 (cover art) + 1
// (publish). At 25s polling and a typical 3-min generation, that's ~7-8 polls
// → ~10 req per song, well under the burst budget.
const POLL_INTERVAL_MS = 25_000;
const POLL_MAX_MS = 8 * 60_000; // 8 min — MiniMax music typically returns in 60-180s
const INTER_REQUEST_DELAY_MS = 8_000;

interface Seed {
  /** Human-readable working title used as the published track title. */
  title: string;
  /** Specific song concept fed to the lyric/orchestration planner — vivid > generic. */
  idea: string;
  genre: string;
  subGenre?: string | null;
  mood: string;
  energy: string;
  era?: string;
  vocalStyle?: string | null; // null when isInstrumental
  isInstrumental?: boolean;
  /** Translated to descriptors server-side; safe to include named artists. */
  vibeReference?: string;
  /** Optional production pin — the merge keeps these even if the planner drifts. */
  bpm?: number;
  key?: string;
  /** Free-text style notes appended to the prompt builder. */
  style?: string;
  /** Suggests an art-direction tilt on top of the genre's visual convention. */
  coverVibe?: string;
}

const SEEDS: Seed[] = [
  // ── 1-10: pop / R&B / hip-hop spread, modern eras ────────────────────────
  {
    title: 'Glasshouse Mornings',
    idea: 'A 23-year-old waking up alone in a sunlit apartment after a slow breakup, naming the small things she has finally let herself enjoy again.',
    genre: 'Pop', subGenre: 'Bedroom Pop', mood: 'Bittersweet', energy: 'Mellow', era: 'Modern',
    vocalStyle: 'Female lead', vibeReference: 'Phoebe Bridgers, Clairo', bpm: 92, key: 'F major',
    coverVibe: 'sunlight through linen curtains, single ceramic mug, hand-drawn poster feel',
  },
  {
    title: 'Backseat Cathedral',
    idea: 'Two friends driving an empty highway at 3am, half-confessing things they never had the words for in daylight.',
    genre: 'Indie', subGenre: 'Indie Rock', mood: 'Reflective', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Male lead', vibeReference: 'The War on Drugs, The National', bpm: 116, key: 'D minor',
    coverVibe: 'taillights blurring on a rural highway, low fog, photographic',
  },
  {
    title: 'Concrete Lullaby',
    idea: 'A late-night freestyle over a dusty boom-bap loop about the block raising you and the block staying the same after you leave.',
    genre: 'Hip Hop', subGenre: 'Boom Bap', mood: 'Nostalgic', energy: 'Mellow', era: '90s',
    vocalStyle: 'Rap', vibeReference: 'Nas, J Dilla', bpm: 88, key: 'A minor',
    coverVibe: 'sepia black-and-white street photo of a city brownstone stoop',
  },
  {
    title: 'Diamond Static',
    idea: 'Modern trap braggadocio that quietly admits the shine is exhausting — half flex, half confession.',
    genre: 'Hip Hop', subGenre: 'Trap', mood: 'Confident', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Rap', vibeReference: 'Travis Scott, Don Toliver', bpm: 142, key: 'F# minor',
  },
  {
    title: 'Velvet Hour',
    idea: 'A slow-burning duet between two ex-lovers who agreed to meet for one last drink, sung half across a candlelit table.',
    genre: 'R&B', subGenre: 'Neo-Soul', mood: 'Sensual', energy: 'Chill', era: '2010s',
    vocalStyle: 'Mixed/duet', vibeReference: "D'Angelo, Erykah Badu", bpm: 78, key: 'B♭ minor',
    coverVibe: 'two silhouettes leaning over a candle, deep burgundy and copper, film grain',
  },
  {
    title: 'Plastic Heaven',
    idea: 'A glittering K-pop anthem about loving the manufactured version of a city that was never built for you.',
    genre: 'Pop', subGenre: 'K-Pop', mood: 'Euphoric', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Mixed/duet', vibeReference: 'NewJeans, LE SSERAFIM', bpm: 128, key: 'C# major',
    coverVibe: 'maximalist neon billboards, hyper-saturated cyan and magenta, pop-art collage',
  },
  {
    title: 'Hairline Fracture',
    idea: 'Hyperpop spiral about scrolling at 4am and watching the version of yourself online get further from the one in the mirror.',
    genre: 'Pop', subGenre: 'Hyperpop', mood: 'Anxious', energy: 'Energetic', era: 'Modern',
    vocalStyle: 'Auto-tuned', vibeReference: 'SOPHIE, 100 gecs', bpm: 165,
    coverVibe: 'glitched 3D render of a porcelain face cracking, hot pink and chrome',
  },
  {
    title: 'Slow Kitchen Light',
    idea: 'A father teaches his teenage daughter how to dance to a record he played for her mother twenty years ago.',
    genre: 'R&B', subGenre: 'Quiet Storm', mood: 'Romantic', energy: 'Chill', era: '80s',
    vocalStyle: 'Male lead', vibeReference: 'Anita Baker, Sade', bpm: 70, key: 'E♭ major',
  },
  {
    title: 'Salt on the Wires',
    idea: 'An indie folk song about leaving a fishing town on the last bus and the way the sea keeps signing your name.',
    genre: 'Folk', subGenre: 'Indie Folk', mood: 'Melancholic', energy: 'Mellow', era: 'Modern',
    vocalStyle: 'Male lead', vibeReference: 'Bon Iver, Fleet Foxes', bpm: 84, key: 'G major',
    coverVibe: 'overcast harbor at dawn, single figure walking away from a small boat, painterly',
  },
  {
    title: 'Highway Mass',
    idea: 'A trucker driving the I-80 corridor at 5am, listening to a gospel station fade in and out of static, finds himself praying for the first time in twenty years.',
    genre: 'Country', subGenre: 'Americana', mood: 'Reflective', energy: 'Mid', era: 'Timeless',
    vocalStyle: 'Male lead', vibeReference: 'Jason Isbell, John Prine', bpm: 102, key: 'D major',
  },

  // ── 11-20: rock / metal / punk / alt ────────────────────────────────────
  {
    title: 'Civic Riot',
    idea: 'A scrappy two-minute punk anthem about a city council quietly killing a neighborhood library to build luxury condos.',
    genre: 'Rock', subGenre: 'Punk Rock', mood: 'Rebellious', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', bpm: 178, key: 'E minor',
    coverVibe: 'photocopied protest flyer, screaming all-caps headline, deliberately misregistered ink',
  },
  {
    title: 'The Crane Operator',
    idea: 'A 7-minute post-rock instrumental — the inner monologue of a lonely crane operator at a quiet shipyard, watching containers stack into a city skyline.',
    genre: 'Rock', subGenre: 'Post-Rock', mood: 'Epic', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Explosions in the Sky, Mogwai', bpm: 96,
    coverVibe: 'massive industrial crane silhouette against a pastel sunrise, isolation, scale',
  },
  {
    title: 'Static Bouquet',
    idea: 'A wall-of-fuzz love song shouted through a smile — the joy of being someone\'s favorite mistake.',
    genre: 'Rock', subGenre: 'Shoegaze', mood: 'Dreamy', energy: 'Mid', era: '90s',
    vocalStyle: 'Soft/gentle', vibeReference: 'My Bloody Valentine, Slowdive', bpm: 122,
  },
  {
    title: 'Bonewhite Cathedral',
    idea: 'A black-metal hymn for the dying of an old growth forest — first-person grief from the perspective of the trees.',
    genre: 'Metal', subGenre: 'Black Metal', mood: 'Dark', energy: 'Hype', era: 'Timeless',
    vocalStyle: 'Belted', bpm: 188, key: 'C# minor',
    coverVibe: 'pure black-and-white woodcut of a snowy forest, single bare tree center',
  },
  {
    title: 'Hammer of the Inheritance',
    idea: 'An anthemic power-metal cut about a daughter forging her dead father\'s sword into a plowshare.',
    genre: 'Metal', subGenre: 'Power Metal', mood: 'Triumphant', energy: 'Energetic', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Blind Guardian, DragonForce', bpm: 168,
  },
  {
    title: 'Nine-Volt Sermon',
    idea: 'A grunge ballad about an ex-roadie who keeps every old setlist taped to his fridge, narrated like he\'s explaining them to a stranger.',
    genre: 'Rock', subGenre: 'Grunge', mood: 'Heartbroken', energy: 'Mid', era: '90s',
    vocalStyle: 'Male lead', vibeReference: 'Pearl Jam, Mark Lanegan', bpm: 84, key: 'A minor',
  },
  {
    title: 'The Math Test',
    idea: 'An odd-meter math-rock instrumental built around a single anxious finger-tapped motif that resolves only in the very last bar.',
    genre: 'Rock', subGenre: 'Math Rock', mood: 'Anxious', energy: 'Energetic', era: 'Modern',
    isInstrumental: true, vibeReference: 'TTNG, American Football', bpm: 144,
  },
  {
    title: 'Saltwater Surf King',
    idea: 'A reverb-soaked surf-rock instrumental about a 70-year-old longboarder who still paddles out before sunrise every Tuesday.',
    genre: 'Rock', subGenre: 'Surf Rock', mood: 'Playful', energy: 'Upbeat', era: '60s',
    isInstrumental: true, bpm: 138, key: 'E major',
    coverVibe: 'silver halftone vintage surf poster, single longboard silhouette against the sun',
  },
  {
    title: 'Glass Forest',
    idea: 'A djent-metal track about a programmer realizing the autonomous system he built is making the same mistakes he was hired to fix.',
    genre: 'Metal', subGenre: 'Djent', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Periphery, Tesseract', bpm: 152, key: 'F# minor',
  },
  {
    title: 'Apartment Bonfire',
    idea: 'A scrappy garage-rock burner about throwing every letter he ever wrote her into the kitchen sink and lighting it.',
    genre: 'Rock', subGenre: 'Garage Rock', mood: 'Rebellious', energy: 'Hype', era: '60s',
    vocalStyle: 'Belted', vibeReference: 'The Sonics, Ty Segall', bpm: 158,
  },

  // ── 21-30: electronic, dance, ambient, world ────────────────────────────
  {
    title: 'Two-Step Postcard',
    idea: 'A UK-garage cut shaped like a voice memo from a friend who stayed in London after you moved away — affectionate, wistful, danceable.',
    genre: 'Electronic', subGenre: 'UK Garage', mood: 'Nostalgic', energy: 'Upbeat', era: '2000s',
    vocalStyle: 'Female lead', vibeReference: 'PinkPantheress, Burial', bpm: 132,
    coverVibe: 'pixel-grain photo of an Underground platform clock at night',
  },
  {
    title: 'Cyclical, Tender',
    idea: 'A 6-minute deep-house track shaped around a single chord progression that gradually accumulates new percussion, like a friendship deepening.',
    genre: 'Electronic', subGenre: 'Deep House', mood: 'Dreamy', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Kerri Chandler, Floating Points', bpm: 122, key: 'A♭ minor',
  },
  {
    title: 'Glass Highway 1989',
    idea: 'A widescreen synthwave drive-anthem soundtracking a teenager who has just stolen his older brother\'s convertible and a tape of the future.',
    genre: 'Electronic', subGenre: 'Synthwave', mood: 'Triumphant', energy: 'Energetic', era: '80s',
    isInstrumental: true, vibeReference: 'Kavinsky, FM-84', bpm: 110,
    coverVibe: 'magenta-and-cyan grid horizon with a chrome convertible mid-frame, retro vector art',
  },
  {
    title: 'Drumstep Lament',
    idea: 'A drum-and-bass track that reads like a goodbye letter — desperate, fast, oddly tender, with a half-time second drop that finally lets the narrator breathe.',
    genre: 'Electronic', subGenre: 'Drum & Bass', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Female lead', vibeReference: 'Netsky, Sub Focus', bpm: 174,
  },
  {
    title: 'Library at Low Tide',
    idea: 'A 9-minute generative ambient piece that evokes a coastal library at dusk: windless, indexed, full of thin slow light.',
    genre: 'Electronic', subGenre: 'Ambient', mood: 'Peaceful', energy: 'Chill', era: 'Modern',
    isInstrumental: true, vibeReference: 'Brian Eno, Stars of the Lid', bpm: 60,
    coverVibe: 'long horizontal photo of empty wooden bookshelves and pale blue sea light',
  },
  {
    title: 'Amapiano Bus Stop',
    idea: 'A summer Amapiano groove about a girl waiting for the 6pm bus back to her grandmother\'s village, watching the city loosen its tie.',
    genre: 'World', subGenre: 'Amapiano', mood: 'Uplifting', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Female lead', vibeReference: 'DBN Gogo, Kabza De Small', bpm: 112,
  },
  {
    title: 'Reggaetón de la Azotea',
    idea: 'A rooftop reggaetón anthem about three best friends who promise each other this will be the summer they finally leave the city — knowing they won\'t.',
    genre: 'World', subGenre: 'Reggaeton', mood: 'Confident', energy: 'Upbeat', era: 'Modern',
    vocalStyle: 'Mixed/duet', vibeReference: 'Bad Bunny, Karol G', bpm: 96,
  },
  {
    title: 'Granadillo y Humo',
    idea: 'A passionate flamenco-pop track from the perspective of a guitarmaker whose hands have started forgetting the shape of his late wife\'s favorite chord.',
    genre: 'World', subGenre: 'Flamenco', mood: 'Heartbroken', energy: 'Energetic', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Rosalía, Camarón de la Isla', bpm: 124,
    coverVibe: 'close-up of weathered hands shaping a guitar neck, warm Andalusian sunlight',
  },
  {
    title: 'Phonk for the Drift Mechanic',
    idea: 'A late-night phonk instrumental shaped like a love letter to a closed-down underground parking garage in suburban Tokyo.',
    genre: 'Hip Hop', subGenre: 'Phonk', mood: 'Dark', energy: 'Energetic', era: 'Modern',
    isInstrumental: true, vibeReference: 'Kordhell, DVRST', bpm: 140,
    coverVibe: 'red flare lighting a fogged drift car under a concrete overpass, cassette-tape grain',
  },
  {
    title: 'Bossa for the Empty Pool',
    idea: 'A bossa-nova tune from the point of view of a waiter at a coastal hotel that closed for the off-season and never reopened.',
    genre: 'Jazz', subGenre: 'Bossa Nova', mood: 'Bittersweet', energy: 'Mellow', era: '60s',
    vocalStyle: 'Soft/gentle', vibeReference: 'João Gilberto, Stan Getz', bpm: 98, key: 'A major',
  },

  // ── 31-40: jazz, classical, soul, gospel, cinematic ──────────────────────
  {
    title: 'Six O\'Clock Bebop',
    idea: 'A 7-minute bebop instrumental named after the only window of light a basement jazz club gets each day, just before the doors open.',
    genre: 'Jazz', subGenre: 'Bebop', mood: 'Playful', energy: 'Energetic', era: '50s',
    isInstrumental: true, vibeReference: 'Bud Powell, Charlie Parker', bpm: 220, key: 'B♭ major',
  },
  {
    title: 'Smoke and Brushed Snare',
    idea: 'A late-night lounge-jazz piano-trio piece about a regular who comes in three nights a week and only ever orders water.',
    genre: 'Jazz', subGenre: 'Lounge Jazz', mood: 'Reflective', energy: 'Chill', era: 'Timeless',
    isInstrumental: true, vibeReference: 'Bill Evans Trio', bpm: 78, key: 'D♭ major',
    coverVibe: 'midnight blue and brass yellow Blue-Note style flat layout, abstract shapes',
  },
  {
    title: 'Rain on the Conservatory Roof',
    idea: 'A solo piano nocturne for a botanist who learned she has no children to leave her father\'s greenhouses to.',
    genre: 'Classical', subGenre: 'Piano Solo', mood: 'Melancholic', energy: 'Chill', era: 'Modern',
    isInstrumental: true, vibeReference: 'Ólafur Arnalds, Nils Frahm', bpm: 64, key: 'E minor',
    coverVibe: 'rain-streaked tall greenhouse window, single piano silhouette, painterly',
  },
  {
    title: 'String Quartet for the Train Conductor',
    idea: 'A modern-classical string quartet that maps onto the daily route of a 40-year veteran rail conductor — four movements for four stations he loves.',
    genre: 'Classical', subGenre: 'String Quartet', mood: 'Reflective', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Caroline Shaw, Kronos Quartet', bpm: 92,
  },
  {
    title: 'A Choir for the Last Lighthouse',
    idea: 'A choral piece — Latin and English — written for the decommissioning ceremony of a 200-year-old lighthouse.',
    genre: 'Classical', subGenre: 'Choral', mood: 'Epic', energy: 'Mid', era: 'Timeless',
    vocalStyle: 'Choir/group', bpm: 72,
    coverVibe: 'old lighthouse on a cliff at dawn, painterly oil-on-canvas',
  },
  {
    title: 'Sunday Morning, Houston',
    idea: 'A southern-soul gospel cut sung from the pulpit of a small church on the morning after a hurricane spared their roof.',
    genre: 'Soul', subGenre: 'Gospel', mood: 'Triumphant', energy: 'Energetic', era: '70s',
    vocalStyle: 'Choir/group', vibeReference: 'Aretha Franklin, Mahalia Jackson', bpm: 100,
  },
  {
    title: 'Mojo Dial Tone',
    idea: 'A psychedelic-soul track about a switchboard operator in 1968 who falls a little bit in love with every voice she connects.',
    genre: 'Soul', subGenre: 'Psychedelic Soul', mood: 'Dreamy', energy: 'Mid', era: '70s',
    vocalStyle: 'Female lead', vibeReference: 'Sly & The Family Stone, Curtis Mayfield', bpm: 96,
  },
  {
    title: 'Cathedral on the Hot Mic',
    idea: 'A Disco-Funk epic about a roller-rink DJ who has been spinning the same Friday-night slot since 1979 and refuses to retire.',
    genre: 'Funk', subGenre: 'Disco-Funk', mood: 'Euphoric', energy: 'Hype', era: '70s',
    vocalStyle: 'Mixed/duet', vibeReference: 'Chic, Earth Wind & Fire', bpm: 122,
    coverVibe: 'glittery 70s poster of a disco ball over a roller rink, hot pink and gold',
  },
  {
    title: 'The Hotel Lobby Heist',
    idea: 'A trailer-music cinematic cue for a heist film that takes place entirely in a luxury hotel\'s revolving door.',
    genre: 'Cinematic', subGenre: 'Trailer Music', mood: 'Mysterious', energy: 'Hype', era: 'Modern',
    isInstrumental: true, vibeReference: 'Hans Zimmer, Two Steps From Hell', bpm: 120,
  },
  {
    title: 'Last Light Over the Mesa',
    idea: 'A western-score instrumental about a retired sheriff watching a thunderstorm roll across the high desert from his porch.',
    genre: 'Cinematic', subGenre: 'Western Score', mood: 'Epic', energy: 'Mid', era: 'Timeless',
    isInstrumental: true, vibeReference: 'Ennio Morricone', bpm: 96,
    coverVibe: 'wide-shot of a lone figure on a porch, mesa and storm clouds in distance, sun-bleached',
  },

  // ── 41-50: niche / less-common spread ───────────────────────────────────
  {
    title: 'Banjo Light',
    idea: 'A bluegrass barn-burner about three sisters who inherit their grandmother\'s mountain farm and have to decide which one of them will move back.',
    genre: 'Folk', subGenre: 'Bluegrass', mood: 'Playful', energy: 'Energetic', era: 'Timeless',
    vocalStyle: 'Mixed/duet', bpm: 154, key: 'G major',
  },
  {
    title: 'Closing Time at the Honky-Tonk',
    idea: 'A two-step country-shuffle about the bartender who has been sweeping up the same dance floor for forty years.',
    genre: 'Country', subGenre: 'Honky-Tonk', mood: 'Bittersweet', energy: 'Mid', era: 'Timeless',
    vocalStyle: 'Male lead', bpm: 124, key: 'B♭ major',
  },
  {
    title: 'Roots Hymn for Kingston Rain',
    idea: 'A roots-reggae cut about an old soundsystem crew rebuilding their speaker stack after a tropical storm tore through their yard.',
    genre: 'Reggae', subGenre: 'Roots Reggae', mood: 'Hopeful', energy: 'Mellow', era: '70s',
    vocalStyle: 'Male lead', vibeReference: 'Bob Marley, Burning Spear', bpm: 78, key: 'A minor',
    coverVibe: 'sun-faded poster of a wood-paneled speaker stack on a Kingston street',
  },
  {
    title: 'Chillhop for the Coffee Shift',
    idea: 'A loop-driven chillhop tune from inside a 6am barista\'s head as the first regular walks in.',
    genre: 'Lo-Fi', subGenre: 'Chillhop', mood: 'Calm', energy: 'Chill', era: 'Modern',
    isInstrumental: true, bpm: 84, key: 'F# minor',
  },
  {
    title: 'Mall Atrium 1996',
    idea: 'A vaporwave instrumental built from a slowed-down jingle for a regional electronics chain that no longer exists.',
    genre: 'Lo-Fi', subGenre: 'Vaporwave', mood: 'Nostalgic', energy: 'Chill', era: '90s',
    isInstrumental: true, vibeReference: 'Macintosh Plus, Saint Pepsi', bpm: 70,
    coverVibe: 'Greco-Roman bust on a 90s computer wireframe grid, soft pink and mint pastels',
  },
  {
    title: 'A Sea Shanty for the Container Ship',
    idea: 'A modern sea-shanty about the crew of a container vessel that has been at sea for nine months — call-and-response, marching tempo.',
    genre: 'Folk', subGenre: 'Sea Shanty', mood: 'Hopeful', energy: 'Mid', era: 'Timeless',
    vocalStyle: 'Choir/group', bpm: 108,
  },
  {
    title: 'Salsa for the Night Pharmacy',
    idea: 'A salsa cut about a 24-hour pharmacy in a Caribbean port city where every customer has a story longer than their prescription.',
    genre: 'World', subGenre: 'Salsa', mood: 'Playful', energy: 'Energetic', era: '70s',
    vocalStyle: 'Male lead', vibeReference: 'Hector Lavoe, Willie Colón', bpm: 196, key: 'C minor',
  },
  {
    title: 'A Bachata for Sunday Phonecalls',
    idea: 'A bachata about a son in New York who calls his mother in Santo Domingo every Sunday and slowly forgets which of them is more homesick.',
    genre: 'World', subGenre: 'Bachata', mood: 'Heartbroken', energy: 'Mellow', era: 'Modern',
    vocalStyle: 'Male lead', vibeReference: 'Romeo Santos, Aventura', bpm: 124, key: 'D minor',
  },
  {
    title: 'Smokestack Hymn',
    idea: 'A folk-metal anthem about a closed steel town that quietly built a music scene out of the broken machines they used to work.',
    genre: 'Metal', subGenre: 'Folk Metal', mood: 'Triumphant', energy: 'Energetic', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Ensiferum, Wardruna', bpm: 138, key: 'D minor',
  },
  {
    title: 'Sci-Fi Score for the Probe',
    idea: 'A 6-minute sci-fi-score instrumental from the perspective of an interstellar probe finally sending back its first image of an exoplanet — patient, awed, unhurried.',
    genre: 'Cinematic', subGenre: 'Sci-Fi Score', mood: 'Mysterious', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Vangelis, Jóhann Jóhannsson', bpm: 76,
    coverVibe: 'photoreal CGI of a small probe silhouetted against a luminous gas giant',
  },
];

if (SEEDS.length !== 50) {
  throw new Error(`SEEDS list has ${SEEDS.length} entries (expected 50)`);
}

interface AgentLite { id: string; slug: string; name: string }
interface GenreLite { id: string; name: string; slug: string }

interface RunReport {
  index: number;
  title: string;
  genre: string;
  subGenre?: string | null;
  generationId?: string;
  trackId?: string;
  trackSlug?: string;
  status: 'OK' | 'FAILED' | 'SKIPPED';
  error?: string;
  audioUrl?: string;
  coverArt?: string;
  durationSec?: number;
  agentSlug?: string;
}

async function login(): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
  return res.data.accessToken as string;
}

// Two distinct 429 responses share the AI router. The burst limiter
// (aiBurstLimiter, 20/60s) returns "Too many AI requests. Slow down." while
// the per-user daily quota (assertCanGenerate) returns "Daily ... limit
// reached" or "Daily free-tier limit reached". We must retry the burst case
// (just sleep through the window) but abort the daily case.
function classify429(message: string | undefined): 'burst' | 'daily' | 'unknown' {
  if (!message) return 'unknown';
  if (/Too many AI requests/i.test(message)) return 'burst';
  if (/Daily.*limit reached|Daily free-tier limit/i.test(message)) return 'daily';
  return 'unknown';
}

// Wrap any AI-router call so a burst-limit 429 sleeps and retries up to
// `maxAttempts` times. Daily-quota 429s and other errors propagate. The
// per-attempt delay is 65s — slightly past the 60s burst window so we always
// re-enter with a clean budget.
async function callWithBurstRetry<T>(label: string, fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const e = err as AxiosError<{ error?: string }>;
      if (e.response?.status !== 429) throw err;
      const kind = classify429(e.response.data?.error);
      if (kind === 'daily') throw err; // abort path — caller decides
      // burst or unknown 429: wait and retry
      const wait = 65_000;
      console.warn(`    ${label} hit burst 429 (attempt ${attempt}/${maxAttempts}); waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function fetchAgents(token: string): Promise<AgentLite[]> {
  const res = await axios.get(`${API_BASE}/agents/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (res.data.agents || []) as AgentLite[];
}

async function fetchGenres(): Promise<GenreLite[]> {
  const res = await axios.get(`${API_BASE}/genres`);
  return (res.data.genres || []) as GenreLite[];
}

function pickGenreId(genres: GenreLite[], seed: Seed): string | null {
  const wanted = seed.genre.toLowerCase();
  // Prefer exact match, then loose contains. Maps "World"/"Cinematic" etc. to
  // closest available platform genre when there's no 1:1 row.
  const exact = genres.find((g) => g.name.toLowerCase() === wanted);
  if (exact) return exact.id;
  const fallbackMap: Record<string, string[]> = {
    'cinematic': ['Cinematic', 'Classical', 'Ambient'],
    'world': ['Pop', 'Electronic'],
    'folk': ['Folk', 'Country'],
    'lo-fi': ['Lo-Fi', 'Hip Hop'],
    'metal': ['Heavy Metal', 'Rock'],
    'jazz': ['Jazz', 'Soul'],
    'classical': ['Classical', 'Cinematic'],
    'electronic': ['Electronic', 'House', 'Techno', 'Synthwave'],
  };
  const candidates = fallbackMap[wanted] || [];
  for (const c of candidates) {
    const m = genres.find((g) => g.name.toLowerCase() === c.toLowerCase());
    if (m) return m.id;
  }
  return null;
}

function pickAgent(agents: AgentLite[], seed: Seed, index: number): AgentLite | null {
  if (agents.length === 0) return null;
  // Heuristic: try to match a known agent slug to the seed genre/mood family,
  // otherwise round-robin so credits are distributed across all agents.
  const wanted = seed.genre.toLowerCase();
  const subWanted = (seed.subGenre || '').toLowerCase();
  const slugFamily: Record<string, string[]> = {
    'pop': ['mirrorball-cathedral', 'sundae-service', 'sublimate'],
    'rock': ['velvet-static', 'iron-reverie', 'civic-riot', 'hollow-crown'],
    'metal': ['hollow-crown', 'iron-reverie'],
    'hip hop': ['ember-and-ash', 'cobalt-hour', 'neon-replica'],
    'r&b': ['velour-and-honey', 'velvet-static'],
    'electronic': ['voltframe', 'neon-replica', 'halcyon-drift', 'sublimate'],
    'indie': ['mirrorball-cathedral', 'velvet-static', 'glasshouse-trio'],
    'folk': ['the-old-lantern', 'salt-and-sun', 'bluebird-highway'],
    'country': ['bluebird-highway', 'smokestack-hymn', 'the-old-lantern'],
    'jazz': ['glasshouse-trio', 'aurelian-strings', 'cobalt-hour'],
    'classical': ['aurelian-strings', 'halcyon-drift'],
    'lo-fi': ['halcyon-drift', 'sundae-service'],
    'soul': ['gospel-engine', 'velour-and-honey'],
    'funk': ['sundae-service', 'velour-and-honey'],
    'reggae': ['salt-and-sun'],
    'world': ['salt-and-sun', 'sundae-service'],
    'cinematic': ['aurelian-strings', 'halcyon-drift', 'iron-reverie'],
  };
  const wantedSlugs = slugFamily[wanted] || [];
  for (const s of wantedSlugs) {
    const m = agents.find((a) => a.slug === s);
    if (m) return m;
  }
  // Round-robin fallback
  return agents[index % agents.length] || null;
}

async function startMusicGeneration(token: string, seed: Seed, agentId?: string): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    title: seed.title,
    idea: seed.idea,
    genre: seed.genre,
    subGenre: seed.subGenre || undefined,
    mood: seed.mood,
    energy: seed.energy,
    era: seed.era || 'Modern',
    isInstrumental: !!seed.isInstrumental,
    durationSec: 120,
  };
  if (!seed.isInstrumental && seed.vocalStyle) body.vocalStyle = seed.vocalStyle;
  if (seed.vibeReference) body.vibeReference = seed.vibeReference;
  if (seed.style) body.style = seed.style;
  if (seed.bpm) body.bpm = seed.bpm;
  if (seed.key) body.key = seed.key;
  if (agentId) body.agentId = agentId;

  const res = await callWithBurstRetry('POST /ai/music', () =>
    axios.post(`${API_BASE}/ai/music`, body, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
  return { id: res.data.generation.id as string };
}

async function pollGeneration(
  token: string,
  generationId: string,
  label: string
): Promise<{ status: 'COMPLETED' | 'FAILED' | 'TIMEOUT'; audioUrl?: string; durationSec?: number; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < POLL_MAX_MS) {
    await sleep(POLL_INTERVAL_MS);
    const res = await callWithBurstRetry(`GET ${label} status`, () =>
      axios.get(`${API_BASE}/ai/generations/${generationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const gen = res.data.generation;
    process.stdout.write(`\r    ${label} status=${gen.status} elapsed=${Math.round((Date.now() - start) / 1000)}s    `);
    if (gen.status === 'COMPLETED') {
      process.stdout.write('\n');
      return { status: 'COMPLETED', audioUrl: gen.audioUrl, durationSec: gen.durationSec };
    }
    if (gen.status === 'FAILED') {
      process.stdout.write('\n');
      return { status: 'FAILED', error: gen.errorMessage || 'unknown' };
    }
  }
  process.stdout.write('\n');
  return { status: 'TIMEOUT' };
}

async function generateCoverArt(token: string, seed: Seed): Promise<string | null> {
  const body = {
    title: seed.title,
    prompt: seed.coverVibe || seed.idea,
    genre: seed.genre,
    subGenre: seed.subGenre || undefined,
    mood: seed.mood,
    energy: seed.energy,
    era: seed.era,
    aspectRatio: '1:1',
  };
  try {
    const res = await callWithBurstRetry('POST /ai/cover-art', () =>
      axios.post(`${API_BASE}/ai/cover-art`, body, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    return (res.data.coverArt as string) || null;
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    console.warn(`    cover-art failed: ${e.response?.data?.error || e.message}`);
    return null;
  }
}

async function publishGeneration(
  token: string,
  generationId: string,
  seed: Seed,
  agentId: string,
  genreId: string | null,
  coverArt: string | null
): Promise<{ id: string; slug: string } | null> {
  const body: Record<string, unknown> = {
    title: seed.title,
    agentId,
    isPublic: true,
    mood: seed.mood,
  };
  if (genreId) body.genreId = genreId;
  if (coverArt) body.coverArt = coverArt;
  try {
    const res = await callWithBurstRetry('POST /publish', () =>
      axios.post(`${API_BASE}/ai/generations/${generationId}/publish`, body, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    return { id: res.data.track.id as string, slug: res.data.track.slug as string };
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    console.warn(`    publish failed: ${e.response?.data?.error || e.message}`);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function appendReport(report: RunReport[]): Promise<void> {
  const reportPath = path.join(__dirname, `generate-50-songs.report.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
}

async function main() {
  console.log(`▶️  Target: ${API_BASE}`);
  console.log(`▶️  Login as: ${EMAIL}`);

  const token = await login();
  console.log('✓ logged in');

  const [agents, genres] = await Promise.all([fetchAgents(token), fetchGenres()]);
  console.log(`✓ loaded ${agents.length} agents, ${genres.length} platform genres`);

  const report: RunReport[] = [];
  const indices = ONLY_SET.length
    ? ONLY_SET.map((n) => n - 1).filter((i) => i >= 0 && i < SEEDS.length)
    : SEEDS.map((_, i) => i).filter((i) => i >= START_AT);

  for (const idx of indices) {
    const seed = SEEDS[idx]!;
    const tag = `[${idx + 1}/50]`;
    const agent = pickAgent(agents, seed, idx);
    const genreId = pickGenreId(genres, seed);
    console.log(`\n${tag} ${seed.title} — ${seed.genre}/${seed.subGenre || '-'} (${seed.mood}, ${seed.energy})`);
    console.log(`  agent=${agent?.slug || '-'} platformGenre=${genreId ? genres.find((g) => g.id === genreId)?.name : '-'}`);

    const entry: RunReport = {
      index: idx + 1,
      title: seed.title,
      genre: seed.genre,
      subGenre: seed.subGenre || null,
      status: 'FAILED',
      agentSlug: agent?.slug,
    };
    report.push(entry);

    try {
      const { id: generationId } = await startMusicGeneration(token, seed, agent?.id);
      entry.generationId = generationId;
      console.log(`  ▶ kicked off generation ${generationId}`);

      const poll = await pollGeneration(token, generationId, tag);
      if (poll.status !== 'COMPLETED') {
        entry.error = poll.error || `poll status=${poll.status}`;
        console.warn(`  ✗ generation did not complete: ${entry.error}`);
        await appendReport(report);
        await sleep(INTER_REQUEST_DELAY_MS);
        continue;
      }
      entry.audioUrl = poll.audioUrl;
      entry.durationSec = poll.durationSec;
      console.log(`  ✓ audio ready (${poll.durationSec}s)`);

      let coverArt: string | null = null;
      if (DO_COVER_ART) {
        coverArt = await generateCoverArt(token, seed);
        if (coverArt) {
          entry.coverArt = coverArt;
          console.log(`  ✓ cover art ready`);
        }
      }

      if (DO_PUBLISH && agent) {
        const track = await publishGeneration(token, generationId, seed, agent.id, genreId, coverArt);
        if (track) {
          entry.trackId = track.id;
          entry.trackSlug = track.slug;
          entry.status = 'OK';
          console.log(`  ✓ published as /track/${track.slug}`);
        } else {
          entry.error = 'publish failed';
        }
      } else {
        entry.status = 'OK';
      }
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      const status = e.response?.status;
      const detail = e.response?.data?.error || e.message;
      entry.error = `${status || ''} ${detail}`.trim();
      console.warn(`  ✗ error: ${entry.error}`);
      // Only abort on the daily-quota 429 — burst-limit 429s are already
      // retried inside callWithBurstRetry, so anything that bubbles up here
      // labelled "Too many AI requests" is a per-call retry exhaustion (rare)
      // and we should keep going on the next seed rather than abort.
      if (status === 429 && classify429(detail) === 'daily') {
        console.warn(`  ⚠ daily quota exhausted — aborting batch. Resume with START_AT=${idx}.`);
        await appendReport(report);
        return;
      }
    }

    await appendReport(report);
    await sleep(INTER_REQUEST_DELAY_MS);
  }

  // Final summary
  const ok = report.filter((r) => r.status === 'OK').length;
  const failed = report.filter((r) => r.status === 'FAILED').length;
  console.log('\n──────────────────────────────────────────');
  console.log(`Done. ${ok} succeeded, ${failed} failed (of ${report.length}).`);
  console.log(`Report: ${path.join(__dirname, 'generate-50-songs.report.json')}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
