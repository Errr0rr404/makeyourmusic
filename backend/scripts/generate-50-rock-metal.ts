// Generate 50 diverse rock + heavy-metal songs end-to-end against the live API.
//
// Coverage: every subgenre from shared/musicCatalog.ts under the Rock and Metal
// genre families.
//   Rock (28): Indie Rock×3, Alternative×3, Punk Rock×3, Garage Rock×2,
//              Post-Rock×3, Math Rock×2, Shoegaze×3, Hard Rock×4, Prog Rock×2,
//              Grunge×2, Surf Rock×1
//   Metal (22): Heavy Metal×4, Death Metal×3, Black Metal×3, Doom Metal×2,
//               Metalcore×3, Djent×2, Power Metal×3, Progressive Metal×1,
//               Folk Metal×1
//
// What this exercises (per song):
//   1. POST /api/ai/music     → server-side orchestration: lyric generation
//      from the rich structured fields below + music prompt build + async
//      MiniMax generation
//   2. Poll /api/ai/generations/:id until status === COMPLETED
//   3. POST /api/ai/cover-art → MiniMax image-01 with genre-aware visual
//      conventions (palette / composition / motifs / texture / lighting)
//   4. POST /api/ai/generations/:id/publish → Track row with cover art and
//      genre, plus (when AUTO_PREVIEW_VIDEO=1 on the server) a preview video
//
// Usage:
//   cd backend && npx ts-node --transpile-only scripts/generate-50-rock-metal.ts
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
const POLL_INTERVAL_MS = 25_000;
const POLL_MAX_MS = 8 * 60_000;
const INTER_REQUEST_DELAY_MS = 8_000;

interface Seed {
  title: string;
  idea: string;
  genre: string;
  subGenre?: string | null;
  mood: string;
  energy: string;
  era?: string;
  vocalStyle?: string | null;
  isInstrumental?: boolean;
  vibeReference?: string;
  bpm?: number;
  key?: string;
  style?: string;
  coverVibe?: string;
}

const SEEDS: Seed[] = [
  // ── 1-3: Indie Rock ──────────────────────────────────────────────────────
  {
    title: 'Crosswalk Static',
    idea: 'Two college roommates breaking up the band on a slow autumn afternoon, sitting on the curb outside their old practice space, laughing more than crying.',
    genre: 'Rock', subGenre: 'Indie Rock', mood: 'Bittersweet', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Male lead', vibeReference: 'The Strokes, Pavement', bpm: 124, key: 'A major',
    coverVibe: 'grainy 35mm photo of two amps on a curb at golden hour, autumn leaves',
  },
  {
    title: 'Northbound Motel Light',
    idea: 'A road-worn indie cut about a touring band stopping at a flickering roadside motel where every door opens to a memory of a previous tour.',
    genre: 'Rock', subGenre: 'Indie Rock', mood: 'Nostalgic', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Male lead', vibeReference: 'The War on Drugs, Kurt Vile', bpm: 108, key: 'D major',
    coverVibe: 'flickering green motel sign at dusk, single guitar case in foreground, painterly',
  },
  {
    title: 'Half-Empty Theatre',
    idea: 'A jangly indie anthem from the perspective of an opening act playing to a half-empty theatre and finally realizing she loves this more than anyone watching.',
    genre: 'Rock', subGenre: 'Indie Rock', mood: 'Triumphant', energy: 'Energetic', era: 'Modern',
    vocalStyle: 'Female lead', vibeReference: 'Snail Mail, Soccer Mommy', bpm: 138, key: 'E major',
    coverVibe: 'view from a small stage of a half-empty theatre with warm spotlights',
  },

  // ── 4-6: Alternative ─────────────────────────────────────────────────────
  {
    title: 'Hollow Decade',
    idea: 'An anthemic alt-rock song about a 30-year-old realizing the version of himself he was sold at 16 was a marketing campaign.',
    genre: 'Rock', subGenre: 'Alternative', mood: 'Reflective', energy: 'Energetic', era: '90s',
    vocalStyle: 'Male lead', vibeReference: 'Foo Fighters, Third Eye Blind', bpm: 142, key: 'G major',
    coverVibe: 'overexposed 90s polaroid of a teenager holding a guitar, faded edges',
  },
  {
    title: 'Cathedral of Strangers',
    idea: 'A loud-quiet-loud alt anthem about a packed subway car at rush hour as a kind of accidental cathedral.',
    genre: 'Rock', subGenre: 'Alternative', mood: 'Epic', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Pixies, Yeah Yeah Yeahs', bpm: 150, key: 'F# minor',
    coverVibe: 'long-exposure photo of a crowded subway platform, motion-blurred faces',
  },
  {
    title: 'Salt the Receiver',
    idea: 'A brooding alt-rock cut about deleting every voicemail your ex ever left, then immediately regretting the silence.',
    genre: 'Rock', subGenre: 'Alternative', mood: 'Heartbroken', energy: 'Mid', era: '2000s',
    vocalStyle: 'Male lead', vibeReference: 'Interpol, Editors', bpm: 118, key: 'B minor',
  },

  // ── 7-9: Punk Rock ───────────────────────────────────────────────────────
  {
    title: 'Bus Stop Manifesto',
    idea: 'A 90-second punk burner about waiting twenty minutes for a bus that never comes and deciding you\'re going to walk to the city council meeting instead.',
    genre: 'Rock', subGenre: 'Punk Rock', mood: 'Rebellious', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'IDLES, The Linda Lindas', bpm: 188, key: 'E minor',
    coverVibe: 'photocopied zine page, all-caps headline screaming over a bus-stop bench',
  },
  {
    title: 'Three Chords for the Custodian',
    idea: 'A punk dedication to a high-school custodian who quietly let bands practice in the band room after hours for forty years.',
    genre: 'Rock', subGenre: 'Punk Rock', mood: 'Triumphant', energy: 'Hype', era: '90s',
    vocalStyle: 'Belted', vibeReference: 'Green Day, Descendents', bpm: 174, key: 'G major',
  },
  {
    title: 'Civic Decay Waltz',
    idea: 'A snarling punk song about a neighborhood watching its own crosswalk paint fade for two years while the city ignores the petitions.',
    genre: 'Rock', subGenre: 'Punk Rock', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Bad Religion, Rise Against', bpm: 196, key: 'A minor',
  },

  // ── 10-11: Garage Rock ───────────────────────────────────────────────────
  {
    title: 'Basement Coronation',
    idea: 'A fuzzed-out garage anthem about a teenage drummer crowning herself queen of the basement on a Tuesday after school.',
    genre: 'Rock', subGenre: 'Garage Rock', mood: 'Rebellious', energy: 'Hype', era: '60s',
    vocalStyle: 'Belted', vibeReference: 'The Sonics, The Hives', bpm: 162, key: 'E major',
    coverVibe: 'low-angle 16mm shot of a snare drum lit by a single bare bulb',
  },
  {
    title: 'Battery Acid Bouquet',
    idea: 'A scrappy garage-rock love song about meeting someone in the corner of a sweaty all-ages show and stealing their lighter.',
    genre: 'Rock', subGenre: 'Garage Rock', mood: 'Playful', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Ty Segall, Thee Oh Sees', bpm: 172, key: 'A major',
  },

  // ── 12-14: Post-Rock ─────────────────────────────────────────────────────
  {
    title: 'Container Yard at Dawn',
    idea: 'A 9-minute instrumental crescendo from the perspective of a port worker watching the first crane swing of the morning shift.',
    genre: 'Rock', subGenre: 'Post-Rock', mood: 'Epic', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Explosions in the Sky, Mogwai', bpm: 86,
    coverVibe: 'wide shipping yard at dawn with a single crane silhouette, pastel sky',
  },
  {
    title: 'Letters We Buried',
    idea: 'A slow-building post-rock piece structured like opening a box of letters from someone who can no longer read them back to you.',
    genre: 'Rock', subGenre: 'Post-Rock', mood: 'Melancholic', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'God Is An Astronaut, This Will Destroy You', bpm: 92,
  },
  {
    title: 'Telescope, Empty Field',
    idea: 'A 7-minute post-rock instrumental about an amateur astronomer driving two hours past the city\'s light pollution to find a single quiet field.',
    genre: 'Rock', subGenre: 'Post-Rock', mood: 'Dreamy', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Sigur Rós, Caspian', bpm: 78,
    coverVibe: 'long-exposure star trails over a tiny figure with a telescope in a field',
  },

  // ── 15-16: Math Rock ─────────────────────────────────────────────────────
  {
    title: 'Calculus of Tuesday',
    idea: 'A nervy math-rock instrumental shaped like the inner life of a barista juggling an espresso queue, a milk steamer, and a panic attack — odd-meter chaos resolving into an unexpected smile.',
    genre: 'Rock', subGenre: 'Math Rock', mood: 'Anxious', energy: 'Energetic', era: 'Modern',
    isInstrumental: true, vibeReference: 'TTNG, American Football', bpm: 154, key: 'F# major',
  },
  {
    title: 'Origami in 7/8',
    idea: 'A delicate, finger-tapped math-rock piece about the way a paper-folding hobby teaches you to be patient with people who fold less neatly than you.',
    genre: 'Rock', subGenre: 'Math Rock', mood: 'Playful', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'CHON, Toe', bpm: 132,
  },

  // ── 17-19: Shoegaze ──────────────────────────────────────────────────────
  {
    title: 'Velvet Static',
    idea: 'A wall-of-fuzz love song shouted into a pillow — the joy of being someone\'s favorite mistake.',
    genre: 'Rock', subGenre: 'Shoegaze', mood: 'Dreamy', energy: 'Mid', era: '90s',
    vocalStyle: 'Soft/gentle', vibeReference: 'My Bloody Valentine, Slowdive', bpm: 118, key: 'D major',
    coverVibe: 'extreme close-up of a shimmering CRT static field, soft pastel haze',
  },
  {
    title: 'Cassette Bloom',
    idea: 'A shoegaze ballad about finding a 30-year-old mixtape in your mother\'s glove box and crying into your steering wheel.',
    genre: 'Rock', subGenre: 'Shoegaze', mood: 'Melancholic', energy: 'Mellow', era: '90s',
    vocalStyle: 'Soft/gentle', vibeReference: 'Slowdive, Cocteau Twins', bpm: 88, key: 'C# minor',
  },
  {
    title: 'Underwater Reverb',
    idea: 'A submerged shoegaze tune about a late-summer pool party — every voice arriving five seconds late through the water.',
    genre: 'Rock', subGenre: 'Shoegaze', mood: 'Dreamy', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Female lead', vibeReference: 'DIIV, Beach House', bpm: 104,
    coverVibe: 'underwater camera shot of swimmers from below, sunlight refracted through water',
  },

  // ── 20-23: Hard Rock ─────────────────────────────────────────────────────
  {
    title: 'Highway 41 Howl',
    idea: 'A hard-rock anthem about driving a 1972 Camaro down a stretch of pre-interstate two-lane highway, refusing to look in the rearview.',
    genre: 'Rock', subGenre: 'Hard Rock', mood: 'Confident', energy: 'Hype', era: '70s',
    vocalStyle: 'Belted', vibeReference: 'Thin Lizzy, Lynyrd Skynyrd', bpm: 132, key: 'A major',
    coverVibe: 'sun-bleached vintage tour poster of a muscle car on a desert highway',
  },
  {
    title: 'Glass and Whiskey',
    idea: 'A swaggering hard-rock cut about a bartender who has watched the same regulars rebuild themselves three times each.',
    genre: 'Rock', subGenre: 'Hard Rock', mood: 'Confident', energy: 'Energetic', era: '80s',
    vocalStyle: 'Belted', vibeReference: 'Guns N\' Roses, Aerosmith', bpm: 124, key: 'E major',
  },
  {
    title: 'Steel Town Lullaby',
    idea: 'A heavy, bluesy hard-rock ballad sung by a third-generation steel worker on the night before the mill shuts forever.',
    genre: 'Rock', subGenre: 'Hard Rock', mood: 'Heartbroken', energy: 'Mid', era: '70s',
    vocalStyle: 'Male lead', vibeReference: 'Led Zeppelin, Bad Company', bpm: 96, key: 'B minor',
    coverVibe: 'silhouetted steel mill smokestacks at sunset, deep amber and slate gray',
  },
  {
    title: 'Black Mirror Cadillac',
    idea: 'A strutting modern hard-rock anthem about a tour manager who has driven the same van across 38 states and trusts it more than most people.',
    genre: 'Rock', subGenre: 'Hard Rock', mood: 'Confident', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Royal Blood, Rival Sons', bpm: 138, key: 'D minor',
  },

  // ── 24-25: Prog Rock ─────────────────────────────────────────────────────
  {
    title: 'The Cartographer\'s Suite',
    idea: 'A 12-minute prog-rock suite in three movements — a 19th-century mapmaker discovers a coastline that\'s never been recorded, draws it once, and never publishes the map.',
    genre: 'Rock', subGenre: 'Prog Rock', mood: 'Mysterious', energy: 'Mid', era: '70s',
    isInstrumental: true, vibeReference: 'Yes, Genesis', bpm: 104,
    coverVibe: 'antique nautical chart with mysterious uncharted coastline, sepia parchment',
  },
  {
    title: 'Astral Telephone',
    idea: 'A virtuosic prog-rock concept piece about a switchboard operator at the end of the universe who keeps misrouting calls between alternate selves.',
    genre: 'Rock', subGenre: 'Prog Rock', mood: 'Epic', energy: 'Energetic', era: '70s',
    vocalStyle: 'Belted', vibeReference: 'Rush, King Crimson', bpm: 142, key: 'F# minor',
  },

  // ── 26-27: Grunge ────────────────────────────────────────────────────────
  {
    title: 'Nine-Volt Sermon',
    idea: 'A grunge ballad about an ex-roadie who keeps every old setlist taped to his fridge, narrated like he\'s explaining them to a stranger.',
    genre: 'Rock', subGenre: 'Grunge', mood: 'Heartbroken', energy: 'Mid', era: '90s',
    vocalStyle: 'Male lead', vibeReference: 'Pearl Jam, Mark Lanegan, Alice In Chains', bpm: 84, key: 'A minor',
    coverVibe: 'fridge covered in faded handwritten setlists, kitchen light buzzing',
  },
  {
    title: 'Drainpipe Anthem',
    idea: 'A loud-quiet-loud grunge song about a rainy Pacific Northwest morning and a kid who has decided not to go to school today.',
    genre: 'Rock', subGenre: 'Grunge', mood: 'Reflective', energy: 'Mid', era: '90s',
    vocalStyle: 'Male lead', vibeReference: 'Nirvana, Soundgarden', bpm: 116, key: 'D minor',
  },

  // ── 28: Surf Rock ────────────────────────────────────────────────────────
  {
    title: 'Saltwater Surf King',
    idea: 'A reverb-soaked surf-rock instrumental about a 70-year-old longboarder who still paddles out before sunrise every Tuesday.',
    genre: 'Rock', subGenre: 'Surf Rock', mood: 'Playful', energy: 'Upbeat', era: '60s',
    isInstrumental: true, vibeReference: 'Dick Dale, The Ventures', bpm: 144, key: 'E major',
    coverVibe: 'silver halftone vintage surf poster, single longboard silhouette against the sun',
  },

  // ── 29-32: Heavy Metal ───────────────────────────────────────────────────
  {
    title: 'Hammer of the Inheritance',
    idea: 'An anthemic heavy-metal cut about a daughter forging her dead father\'s sword into a plowshare — and discovering the metal sings differently when struck for peace.',
    genre: 'Metal', subGenre: 'Heavy Metal', mood: 'Triumphant', energy: 'Hype', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Iron Maiden, Judas Priest', bpm: 162, key: 'E minor',
    coverVibe: 'painterly heavy-metal album cover of an anvil with sparks, dramatic skies',
  },
  {
    title: 'Lighthouse of the Last Storm',
    idea: 'A heavy-metal epic from the perspective of the last lighthouse keeper before the automation, defying a storm that has eaten three boats this week.',
    genre: 'Metal', subGenre: 'Heavy Metal', mood: 'Epic', energy: 'Hype', era: '80s',
    vocalStyle: 'Belted', vibeReference: 'Iron Maiden, Dio', bpm: 156, key: 'D minor',
    coverVibe: 'classic 80s metal album painting of a lighthouse battered by enormous waves',
  },
  {
    title: 'Anvil and Aurora',
    idea: 'A galloping heavy-metal anthem about a Norwegian blacksmith who only forges under the northern lights — a sacred contract she made at sixteen.',
    genre: 'Metal', subGenre: 'Heavy Metal', mood: 'Triumphant', energy: 'Hype', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Manowar, Sabaton', bpm: 168, key: 'A minor',
  },
  {
    title: 'Iron Crown of the Long Patrol',
    idea: 'A heavy-metal saga about a grizzled veteran who refuses to retire because the king keeps sending boys to do his work.',
    genre: 'Metal', subGenre: 'Heavy Metal', mood: 'Aggressive', energy: 'Hype', era: '80s',
    vocalStyle: 'Belted', vibeReference: 'Judas Priest, Saxon', bpm: 148, key: 'F# minor',
  },

  // ── 33-35: Death Metal ───────────────────────────────────────────────────
  {
    title: 'Crematorium Cartography',
    idea: 'A death-metal piece about a forensic anthropologist who maps mass graves so that families can finally bury their dead.',
    genre: 'Metal', subGenre: 'Death Metal', mood: 'Dark', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Cannibal Corpse, Bloodbath', bpm: 196, key: 'D minor',
    coverVibe: 'black-and-white woodcut of an old map covered in dark fingerprints',
  },
  {
    title: 'The Surgeon\'s Liturgy',
    idea: 'A brutal-yet-articulate death-metal track from the perspective of an emergency surgeon during a 36-hour shift — visceral, exhausted, defiant.',
    genre: 'Metal', subGenre: 'Death Metal', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Death, Carcass', bpm: 208, key: 'C minor',
  },
  {
    title: 'Bonewhite Engine',
    idea: 'A technical death-metal cut about a deep-sea drilling rig that is slowly being eaten by the ocean it was built to extract from.',
    genre: 'Metal', subGenre: 'Death Metal', mood: 'Dark', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Gojira, Obscura', bpm: 184, key: 'F minor',
  },

  // ── 36-38: Black Metal ───────────────────────────────────────────────────
  {
    title: 'Hymn for the Dying Forest',
    idea: 'A black-metal hymn for an old-growth forest being clear-cut — first-person grief from the perspective of the trees.',
    genre: 'Metal', subGenre: 'Black Metal', mood: 'Dark', energy: 'Hype', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Wolves in the Throne Room, Ulver', bpm: 188, key: 'C# minor',
    coverVibe: 'pure black-and-white woodcut of a snowy forest, single bare tree center',
  },
  {
    title: 'Throne of Gleaming Ice',
    idea: 'An atmospheric black-metal track about a glaciologist standing on a calving glacier, watching the past collapse into the sea.',
    genre: 'Metal', subGenre: 'Black Metal', mood: 'Epic', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Emperor, Mgła', bpm: 174, key: 'B minor',
  },
  {
    title: 'Wraithfield',
    idea: 'A second-wave-style black-metal cut about an abandoned wheat field at midnight, scarecrows lit only by lightning that hasn\'t arrived yet.',
    genre: 'Metal', subGenre: 'Black Metal', mood: 'Dark', energy: 'Hype', era: '90s',
    vocalStyle: 'Belted', vibeReference: 'Mayhem, Burzum', bpm: 200, key: 'E minor',
    coverVibe: 'high-contrast monochrome photo of scarecrows in a wheat field at night',
  },

  // ── 39-40: Doom Metal ────────────────────────────────────────────────────
  {
    title: 'Salt of the Slow Tide',
    idea: 'A 10-minute doom-metal piece about a coastal town slowly losing its main street to the rising sea, and the residents who refuse to leave.',
    genre: 'Metal', subGenre: 'Doom Metal', mood: 'Melancholic', energy: 'Mid', era: 'Modern',
    vocalStyle: 'Male lead', vibeReference: 'Bell Witch, Pallbearer', bpm: 60, key: 'F# minor',
    coverVibe: 'half-submerged coastal main street at dusk, oil-painting style',
  },
  {
    title: 'Cathedral Buried Beneath',
    idea: 'A massive, glacial doom-metal track about an underground archaeologist who finds a complete cathedral preserved beneath a shopping mall.',
    genre: 'Metal', subGenre: 'Doom Metal', mood: 'Dark', energy: 'Mid', era: 'Modern',
    isInstrumental: true, vibeReference: 'Sleep, Electric Wizard', bpm: 56,
  },

  // ── 41-43: Metalcore ─────────────────────────────────────────────────────
  {
    title: 'Static in My Lungs',
    idea: 'A metalcore breakdown anthem about a 24-year-old finally telling his family that the corporate job they\'re proud of is killing him.',
    genre: 'Metal', subGenre: 'Metalcore', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Architects, Bring Me The Horizon', bpm: 168, key: 'D minor',
  },
  {
    title: 'Fault Line Choir',
    idea: 'A melodic metalcore track about three friends who survived a school shooting and are still figuring out how to talk to each other ten years later.',
    genre: 'Metal', subGenre: 'Metalcore', mood: 'Heartbroken', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Killswitch Engage, August Burns Red', bpm: 156, key: 'C# minor',
    coverVibe: 'three silhouettes against a cracked gymnasium floor, dramatic lighting',
  },
  {
    title: 'Concrete Halo',
    idea: 'A heavy modern metalcore cut about a paramedic who has seen the same intersection take six lives and refuses to pass the hat for a stoplight petition again.',
    genre: 'Metal', subGenre: 'Metalcore', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Parkway Drive, Trivium', bpm: 172, key: 'E minor',
  },

  // ── 44-45: Djent ─────────────────────────────────────────────────────────
  {
    title: 'Glass Forest Subroutine',
    idea: 'A djent track about a programmer realizing the autonomous system he built is making the same mistakes he was hired to fix — polyrhythmic anxiety meets cold technical clarity.',
    genre: 'Metal', subGenre: 'Djent', mood: 'Aggressive', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Periphery, TesseracT', bpm: 152, key: 'F# minor',
    coverVibe: 'fractal forest of glass shards reflecting circuitry, cyan and obsidian',
  },
  {
    title: 'Prime Number Heartbeat',
    idea: 'An instrumental djent piece structured around a 13/8 motif that mutates at every prime-numbered bar — the inner rhythm of an arrhythmia patient learning to live with her heart.',
    genre: 'Metal', subGenre: 'Djent', mood: 'Anxious', energy: 'Energetic', era: 'Modern',
    isInstrumental: true, vibeReference: 'Meshuggah, Animals as Leaders', bpm: 146,
  },

  // ── 46-48: Power Metal ───────────────────────────────────────────────────
  {
    title: 'Banner of the Last Library',
    idea: 'A galloping power-metal anthem about a librarian-turned-revolutionary defending the last printed archive of her city against a regime that wants to erase its history.',
    genre: 'Metal', subGenre: 'Power Metal', mood: 'Triumphant', energy: 'Hype', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Blind Guardian, DragonForce', bpm: 180, key: 'D major',
    coverVibe: 'epic fantasy painting of a woman raising a torch in a vast library at night',
  },
  {
    title: 'Dragonsmith\'s Daughter',
    idea: 'A soaring power-metal saga about the daughter of a legendary dragonsmith who finally chooses to befriend the dragons her family was hired to destroy.',
    genre: 'Metal', subGenre: 'Power Metal', mood: 'Epic', energy: 'Hype', era: 'Timeless',
    vocalStyle: 'Belted', vibeReference: 'Stratovarius, Helloween', bpm: 172, key: 'E minor',
  },
  {
    title: 'Starsteel Crusade',
    idea: 'A symphonic power-metal cut about an interstellar order of paladins escorting a single fragile data crystal across an empire that is rapidly forgetting its own laws.',
    genre: 'Metal', subGenre: 'Power Metal', mood: 'Triumphant', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Rhapsody of Fire, Powerwolf', bpm: 184, key: 'F# minor',
    coverVibe: 'epic space-fantasy painting of armored knights on a starship bridge, glowing crystal',
  },

  // ── 49: Progressive Metal ────────────────────────────────────────────────
  {
    title: 'Observatory Ascendant',
    idea: 'A virtuosic 11-minute progressive-metal suite from the perspective of a radio-astronomer chasing a signal that may or may not be alien — three movements: doubt, confirmation, restraint.',
    genre: 'Metal', subGenre: 'Progressive Metal', mood: 'Mysterious', energy: 'Energetic', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Dream Theater, Opeth', bpm: 138, key: 'B minor',
    coverVibe: 'massive radio telescope dish at night, green digital signal lines overlay',
  },

  // ── 50: Folk Metal ───────────────────────────────────────────────────────
  {
    title: 'Smokestack Hymn',
    idea: 'A folk-metal anthem about a closed steel town that quietly built a music scene out of the broken machines they used to work — fiddles howl alongside detuned guitars in the final chorus.',
    genre: 'Metal', subGenre: 'Folk Metal', mood: 'Triumphant', energy: 'Hype', era: 'Modern',
    vocalStyle: 'Belted', vibeReference: 'Ensiferum, Eluveitie, Wardruna', bpm: 142, key: 'D minor',
    coverVibe: 'crumbling steel mill at dusk with a bonfire and fiddlers in the foreground',
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

class TokenManager {
  private token: string | null = null;
  private issuedAt = 0;
  private static MAX_AGE_MS = 12 * 60_000;

  async get(force = false): Promise<string> {
    const stale = force || !this.token || Date.now() - this.issuedAt > TokenManager.MAX_AGE_MS;
    if (stale) {
      const res = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
      this.token = res.data.accessToken as string;
      this.issuedAt = Date.now();
    }
    return this.token!;
  }
}

const tokens = new TokenManager();

async function login(): Promise<string> {
  return tokens.get(true);
}

async function callWithAuth<T>(label: string, fn: (token: string) => Promise<T>): Promise<T> {
  const token = await tokens.get();
  try {
    return await fn(token);
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    if (e.response?.status !== 401) throw err;
    console.warn(`    ${label} got 401 — refreshing token`);
    const fresh = await tokens.get(true);
    return await fn(fresh);
  }
}

function classify429(message: string | undefined): 'burst' | 'daily' | 'unknown' {
  if (!message) return 'unknown';
  if (/Too many AI requests/i.test(message)) return 'burst';
  if (/Daily.*limit reached|Daily free-tier limit/i.test(message)) return 'daily';
  return 'unknown';
}

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
      if (kind === 'daily') throw err;
      const wait = 65_000;
      console.warn(`    ${label} hit burst 429 (attempt ${attempt}/${maxAttempts}); waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function fetchAgents(): Promise<AgentLite[]> {
  const res = await callWithAuth('GET /agents/mine', (t) =>
    axios.get(`${API_BASE}/agents/mine`, { headers: { Authorization: `Bearer ${t}` } })
  );
  return (res.data.agents || []) as AgentLite[];
}

async function fetchGenres(): Promise<GenreLite[]> {
  const res = await axios.get(`${API_BASE}/genres`);
  return (res.data.genres || []) as GenreLite[];
}

function pickGenreId(genres: GenreLite[], seed: Seed): string | null {
  const wanted = seed.genre.toLowerCase();
  const exact = genres.find((g) => g.name.toLowerCase() === wanted);
  if (exact) return exact.id;
  // Metal often lives as "Heavy Metal" platform-side
  const fallbackMap: Record<string, string[]> = {
    'metal': ['Heavy Metal', 'Metal', 'Rock'],
    'rock': ['Rock', 'Hard Rock', 'Indie Rock'],
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
  const wanted = seed.genre.toLowerCase();
  // Bias toward rock/metal-flavored agent slugs first; round-robin otherwise
  // so 50 tracks distribute across all available agents instead of piling on
  // one slug.
  const slugFamily: Record<string, string[]> = {
    'rock': ['velvet-static', 'iron-reverie', 'civic-riot', 'hollow-crown', 'iron-strings', 'echo-chamber'],
    'metal': ['hollow-crown', 'iron-reverie', 'iron-strings'],
  };
  const wantedSlugs = slugFamily[wanted] || [];
  // Prefer agents whose slugs/names contain rock/metal-ish keywords if available
  const rockMetalKeywords = ['rock', 'metal', 'iron', 'hollow', 'crown', 'static', 'riot', 'forge', 'amp', 'fuzz'];
  const themed = agents.filter((a) =>
    rockMetalKeywords.some((k) => a.slug.toLowerCase().includes(k) || a.name.toLowerCase().includes(k))
  );
  for (const s of wantedSlugs) {
    const m = agents.find((a) => a.slug === s);
    if (m) return m;
  }
  if (themed.length > 0) return themed[index % themed.length] || null;
  return agents[index % agents.length] || null;
}

async function startMusicGeneration(seed: Seed, agentId?: string): Promise<{ id: string }> {
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
    callWithAuth('POST /ai/music', (t) =>
      axios.post(`${API_BASE}/ai/music`, body, { headers: { Authorization: `Bearer ${t}` } })
    )
  );
  return { id: res.data.generation.id as string };
}

async function pollGeneration(
  generationId: string,
  label: string
): Promise<{ status: 'COMPLETED' | 'FAILED' | 'TIMEOUT'; audioUrl?: string; durationSec?: number; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < POLL_MAX_MS) {
    await sleep(POLL_INTERVAL_MS);
    const res = await callWithBurstRetry(`GET ${label} status`, () =>
      callWithAuth(`GET ${label} status`, (t) =>
        axios.get(`${API_BASE}/ai/generations/${generationId}`, {
          headers: { Authorization: `Bearer ${t}` },
        })
      )
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

async function generateCoverArt(seed: Seed): Promise<string | null> {
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
      callWithAuth('POST /ai/cover-art', (t) =>
        axios.post(`${API_BASE}/ai/cover-art`, body, {
          headers: { Authorization: `Bearer ${t}` },
        })
      )
    );
    return (res.data.coverArt as string) || null;
  } catch (err) {
    const e = err as AxiosError<{ error?: string }>;
    console.warn(`    cover-art failed: ${e.response?.data?.error || e.message}`);
    return null;
  }
}

async function publishGeneration(
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
      callWithAuth('POST /publish', (t) =>
        axios.post(`${API_BASE}/ai/generations/${generationId}/publish`, body, {
          headers: { Authorization: `Bearer ${t}` },
        })
      )
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
  const reportPath = path.join(__dirname, `generate-50-rock-metal.report.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
}

async function main() {
  console.log(`▶️  Target: ${API_BASE}`);
  console.log(`▶️  Login as: ${EMAIL}`);

  await login();
  console.log('✓ logged in');

  const [agents, genres] = await Promise.all([fetchAgents(), fetchGenres()]);
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
      const { id: generationId } = await startMusicGeneration(seed, agent?.id);
      entry.generationId = generationId;
      console.log(`  ▶ kicked off generation ${generationId}`);

      const poll = await pollGeneration(generationId, tag);
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
        coverArt = await generateCoverArt(seed);
        if (coverArt) {
          entry.coverArt = coverArt;
          console.log(`  ✓ cover art ready`);
        }
      }

      if (DO_PUBLISH && agent) {
        const track = await publishGeneration(generationId, seed, agent.id, genreId, coverArt);
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
      if (status === 429 && classify429(detail) === 'daily') {
        console.warn(`  ⚠ daily quota exhausted — aborting batch. Resume with START_AT=${idx}.`);
        await appendReport(report);
        return;
      }
    }

    await appendReport(report);
    await sleep(INTER_REQUEST_DELAY_MS);
  }

  const ok = report.filter((r) => r.status === 'OK').length;
  const failed = report.filter((r) => r.status === 'FAILED').length;
  console.log('\n──────────────────────────────────────────');
  console.log(`Done. ${ok} succeeded, ${failed} failed (of ${report.length}).`);
  console.log(`Report: ${path.join(__dirname, 'generate-50-rock-metal.report.json')}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
