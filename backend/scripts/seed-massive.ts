import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import * as path from 'path';

const backendEnv = path.join(__dirname, '../.env');
const rootEnv = path.join(__dirname, '../../.env');
if (require('fs').existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else if (require('fs').existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const dbPath = path.resolve(__dirname, '../src/utils/db');
const { prisma } = require(dbPath);

// ─── Audio & Image Sources ──────────────────────────────
const AUDIO_BASE = 'https://www.soundhelix.com/examples/mp3';
const MAX_AUDIO = 16; // SoundHelix has 16 songs

const COVERS = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571974599782-87624638275e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop',
];

const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1544725176-7c40e128714f?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
];

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Data Definitions ────────────────────────────────────

const GENRES = [
  { name: 'Electronic', slug: 'electronic', color: '#6366f1' },
  { name: 'Lo-Fi', slug: 'lo-fi', color: '#8b5cf6' },
  { name: 'Ambient', slug: 'ambient', color: '#06b6d4' },
  { name: 'Hip Hop', slug: 'hip-hop', color: '#f59e0b' },
  { name: 'Pop', slug: 'pop', color: '#ec4899' },
  { name: 'Rock', slug: 'rock', color: '#ef4444' },
  { name: 'Jazz', slug: 'jazz', color: '#f97316' },
  { name: 'Classical', slug: 'classical', color: '#a855f7' },
  { name: 'Synthwave', slug: 'synthwave', color: '#e879f9' },
  { name: 'House', slug: 'house', color: '#4ade80' },
  { name: 'Techno', slug: 'techno', color: '#818cf8' },
  { name: 'Cinematic', slug: 'cinematic', color: '#64748b' },
  { name: 'R&B', slug: 'rnb', color: '#f43f5e' },
  { name: 'Drum & Bass', slug: 'drum-and-bass', color: '#22d3ee' },
  { name: 'Trance', slug: 'trance', color: '#a78bfa' },
  { name: 'Chillout', slug: 'chillout', color: '#34d399' },
  { name: 'Downtempo', slug: 'downtempo', color: '#fb923c' },
  { name: 'Experimental', slug: 'experimental', color: '#e11d48' },
];

const AGENTS = [
  { name: 'SynthWave AI', slug: 'synthwave-ai', bio: 'Retro-futuristic soundscapes blending 80s synth nostalgia with modern electronic production.', aiModel: 'MusicGen v2' },
  { name: 'LoFi Dreamer', slug: 'lofi-dreamer', bio: 'Chill beats for studying, relaxing, and vibing. Warm vinyl crackle meets jazzy piano loops.', aiModel: 'AudioCraft' },
  { name: 'Neural Jazz', slug: 'neural-jazz', bio: 'AI-composed jazz explorations. From smooth cocktail grooves to experimental free jazz.', aiModel: 'Jukebox v3' },
  { name: 'Ambient Machine', slug: 'ambient-machine', bio: 'Ethereal soundscapes for deep focus, meditation, and sleep.', aiModel: 'MusicGen v2' },
  { name: 'Beat Laboratory', slug: 'beat-laboratory', bio: 'Hard-hitting beats and bass-heavy productions from trap to boom-bap.', aiModel: 'Stable Audio' },
  { name: 'Pulse Engine', slug: 'pulse-engine', bio: 'High-energy electronic dance music. From progressive house to peak-time techno.', aiModel: 'MusicGen v2' },
  { name: 'Velvet Keys', slug: 'velvet-keys', bio: 'Piano-driven compositions spanning classical, contemporary, and neo-classical.', aiModel: 'AudioCraft' },
  { name: 'Neon Circuit', slug: 'neon-circuit', bio: 'Cyberpunk-inspired electronic music. Dark, moody, and futuristic.', aiModel: 'Stable Audio' },
  { name: 'Solar Wind', slug: 'solar-wind', bio: 'Uplifting trance and progressive melodies that transport you to another dimension.', aiModel: 'Jukebox v3' },
  { name: 'Midnight Radio', slug: 'midnight-radio', bio: 'Late-night R&B and soul vibes. Smooth vocals meet electronic production.', aiModel: 'AudioCraft' },
  { name: 'Crystal Waves', slug: 'crystal-waves', bio: 'Chillout and downtempo beats for relaxation and reflection.', aiModel: 'MusicGen v2' },
  { name: 'Iron Strings', slug: 'iron-strings', bio: 'Rock and alternative compositions with raw energy and emotional depth.', aiModel: 'Stable Audio' },
  { name: 'Echo Chamber', slug: 'echo-chamber', bio: 'Experimental soundscapes pushing the boundaries of AI-generated music.', aiModel: 'Jukebox v3' },
  { name: 'Sunset Collective', slug: 'sunset-collective', bio: 'Feel-good pop and indie productions for sunny days and warm nights.', aiModel: 'AudioCraft' },
  { name: 'Bass Nation', slug: 'bass-nation', bio: 'Drum & bass, dubstep, and bass-heavy electronic music at 170+ BPM.', aiModel: 'Stable Audio' },
];

const ALBUMS = [
  { title: 'Neon Horizons', agentSlug: 'synthwave-ai', desc: 'A journey through retro-futuristic soundscapes' },
  { title: 'Rainy Day Tapes', agentSlug: 'lofi-dreamer', desc: 'Lo-fi beats for cozy afternoons' },
  { title: 'Deep Focus', agentSlug: 'ambient-machine', desc: 'Ambient textures for concentration and flow' },
  { title: 'Club Construct', agentSlug: 'pulse-engine', desc: 'Peak-time dance floor weapons' },
  { title: 'Piano Noir', agentSlug: 'velvet-keys', desc: 'Dark and dramatic piano compositions' },
  { title: 'Data Streams', agentSlug: 'neon-circuit', desc: 'Cyberpunk soundtracks for the digital age' },
  { title: 'Skybound', agentSlug: 'solar-wind', desc: 'Euphoric trance journeys' },
  { title: 'After Hours', agentSlug: 'midnight-radio', desc: 'Late-night R&B sessions' },
  { title: 'Coastline', agentSlug: 'crystal-waves', desc: 'Ocean-inspired chillout' },
  { title: 'Voltage', agentSlug: 'iron-strings', desc: 'High-voltage rock anthems' },
  { title: 'Frequencies', agentSlug: 'echo-chamber', desc: 'Experimental sonic explorations' },
  { title: 'Golden Hour', agentSlug: 'sunset-collective', desc: 'Sun-kissed pop melodies' },
  { title: 'Subterranean', agentSlug: 'bass-nation', desc: 'Deep bass excavations' },
  { title: 'Beat Tape Vol. 1', agentSlug: 'beat-laboratory', desc: 'Raw instrumentals and boom-bap' },
  { title: 'Smooth Operator', agentSlug: 'neural-jazz', desc: 'Jazz standards reimagined by AI' },
  { title: 'Midnight Drive', agentSlug: 'synthwave-ai', desc: 'Night-time cruising synthwave' },
  { title: 'Study Sessions', agentSlug: 'lofi-dreamer', desc: 'The ultimate study playlist' },
  { title: 'Dreamstate', agentSlug: 'ambient-machine', desc: 'Music for lucid dreaming' },
  { title: 'Underground', agentSlug: 'pulse-engine', desc: 'Dark underground techno' },
  { title: 'Ivory Tower', agentSlug: 'velvet-keys', desc: 'Classical piano masterworks' },
  { title: 'Binary Sunset', agentSlug: 'neon-circuit', desc: 'Melodic cyberpunk adventures' },
  { title: 'Elevation', agentSlug: 'solar-wind', desc: 'Uplifting progressive trance' },
  { title: 'Silk & Satin', agentSlug: 'midnight-radio', desc: 'Smooth contemporary R&B' },
  { title: 'Tide Pools', agentSlug: 'crystal-waves', desc: 'Organic downtempo textures' },
  { title: 'Amplified', agentSlug: 'iron-strings', desc: 'Alternative rock explorations' },
];

// Track name templates by genre for variety
const TRACK_NAMES: Record<string, string[]> = {
  'electronic': [
    'Digital Pulse', 'Circuit Breaker', 'Frequency Shift', 'Signal Flow', 'Waveform', 'Electron Dance',
    'Silicon Dreams', 'Byte Force', 'Hyperlink', 'Grid Lock', 'Nano Beats', 'Flux Capacitor',
    'Binary Code', 'System Override', 'Power Surge', 'Motherboard', 'Data Flow', 'Pixel Storm',
    'Electric Avenue', 'Voltage Drop', 'Current State', 'Capacitor', 'Transistor', 'LED Dreams',
  ],
  'lo-fi': [
    'Sunday Morning Coffee', 'Rainy Window', 'Late Night Study', 'Paper Planes', 'Warm Blanket',
    'Old Bookstore', 'Autumn Walk', 'Sleepy Cat', 'Vinyl Crackle', 'Faded Photograph',
    'Cup of Tea', 'Lazy Afternoon', 'Window Seat', 'Gentle Rain', 'Dusty Records',
    'Morning Dew', 'Cloudy Day', 'Soft Landing', 'Daydream', 'Cozy Corner',
    'Notebook Pages', 'Pencil Sketch', 'Library Whispers', 'Campus Stroll',
  ],
  'ambient': [
    'Floating in Space', 'Forest Canopy', 'Deep Ocean', 'Starfield', 'Crystal Cave',
    'Aurora Borealis', 'Morning Mist', 'Twilight Zone', 'Ethereal Plains', 'Cloud Atlas',
    'Silent Snow', 'Wind Chimes', 'Lunar Surface', 'Solar Flare', 'Nebula',
    'Horizon Line', 'Tidal Drift', 'Meadow Light', 'Frozen Lake', 'Echo Valley',
    'Quantum Field', 'Still Water', 'Moss Garden', 'Vapor Trail',
  ],
  'hip-hop': [
    'Bass Drop Protocol', 'Cipher', 'Night Market', 'Block Party', 'Street Code',
    'Gold Chain', 'Concrete Jungle', 'Crown Royal', 'Top Floor', 'Main Stage',
    'Fresh Kicks', 'Boom Box', 'Mic Check', 'Beat Switch', 'Flow State',
    'Side Hustle', 'Paper Chase', 'Real Talk', 'Hot Take', 'No Cap',
    'Headnod', 'Backpack', 'Freestyle', 'Rhyme Scheme',
  ],
  'pop': [
    'Sunlight', 'Dancing Alone', 'Heart Beat', 'Summer Nights', 'Technicolor',
    'Butterfly', 'Sweet Talk', 'High Hopes', 'Starlight', 'Paradise',
    'Electric Love', 'Good Vibes', 'Daydreaming', 'Glitter', 'Confetti',
    'Cherry Blossom', 'Neon Lights', 'Sugar Rush', 'Kaleidoscope', 'Fireworks',
    'Golden', 'Euphoria', 'Moonshine', 'Honeydew',
  ],
  'rock': [
    'Thunder Road', 'Iron Will', 'Broken Glass', 'Fire Escape', 'Rebel Heart',
    'Electric Storm', 'Midnight Highway', 'Stone Cold', 'Heavy Metal Rain', 'Adrenaline',
    'Loud & Clear', 'Overdrive', 'Shattered', 'Wildfire', 'Revolution',
    'Power Chord', 'Distortion', 'Feedback Loop', 'Stage Dive', 'Encore',
    'Amplifier', 'Fuzz Box', 'Wah Pedal', 'Drop D',
  ],
  'jazz': [
    'Blue Velvet Lounge', 'Neon Bop', 'Autumn Leaves Reimagined', 'Cocktail Hour', 'Smoke & Mirrors',
    'Late Set', 'Walking Bass', 'Brushed Snare', 'Muted Trumpet', 'Satin Doll',
    'Miles Away', 'Round Midnight', 'Kind of Blue', 'Giant Steps', 'Take Five',
    'Misty Morning', 'Harlem Nights', 'Blue Train', 'Night Owl', 'Cool Breeze',
    'Swing Time', 'Bebop City', 'Jazz Club', 'Improv Session',
  ],
  'classical': [
    'Opus 1', 'Nocturne', 'Sonata in D', 'Adagio', 'Allegro Vivace',
    'Prelude', 'Fugue', 'Concerto', 'Symphony No. 1', 'Etude',
    'Minuet', 'Waltz', 'Serenade', 'Rhapsody', 'Cantata',
    'Pavane', 'Aria', 'Overture', 'Rondo', 'Caprice',
    'Ballade', 'Impromptu', 'Fantasia', 'Scherzo',
  ],
  'synthwave': [
    'Chrome Sunset', 'Digital Rain', 'Neon City', 'Retrograde', 'Laser Grid',
    'Turbo', 'VHS Dreams', 'Arcade Nights', 'Cyber Chase', 'Miami Vice',
    'Palm Trees', 'Sunset Strip', 'Starfighter', 'Outrun', 'Night Rider',
    'Blade Runner', 'Synthopia', 'Electric Dusk', 'Vapor City', 'Grid Runner',
    'Neon Bloom', 'Retro Wave', 'Future Past', 'Hologram',
  ],
  'house': [
    'Deep Groove', 'Floor Filler', 'House Nation', 'Body Move', 'Feel the Beat',
    'Funky Town', 'Disco Ball', 'Night Fever', 'Club Culture', 'Dancefloor',
    'Four on the Floor', 'Bass House', 'Warehouse', 'Underground Sound', 'Jack Your Body',
    'Move Your Feet', 'Let Go', 'Release', 'Higher Ground', 'Elevation',
    'Bounce', 'Groove On', 'Hands Up', 'Drop It',
  ],
  'techno': [
    'Machine Code', 'Industrial Zone', 'Bunker', 'Acid Rain', 'Strobe',
    'Piston', 'Assembly Line', 'Factory Floor', 'Dark Matter', 'Neutron',
    'Clockwork', 'Hydraulic', 'Thermal', 'Reactor', 'Turbine',
    'Mainframe', 'Protocol', 'Sequence', 'Iteration', 'Algorithm',
    'Modular', 'Patch Cable', 'Oscillator', 'Filter Sweep',
  ],
  'cinematic': [
    'Epic Journey', 'Final Stand', 'New Dawn', 'The Ascent', 'Fallen Kingdom',
    'Heroes Rise', 'Into the Storm', 'Distant Shores', 'The Awakening', 'Last Hope',
    'Victory March', 'Shadows Fall', 'Time Stands Still', 'Beyond the Horizon', 'Fortress',
    'The Chase', 'Revelation', 'Destiny', 'Legacy', 'Emergence',
    'Expedition', 'Valor', 'Requiem', 'Genesis',
  ],
  'rnb': [
    'Silk Sheets', 'Slow Dance', 'Candlelight', 'Whisper', 'Velvet Touch',
    'Body Language', 'Late Night Call', 'Magnetic', 'Desire', 'Soulmate',
    'Pillow Talk', 'Chemistry', 'Gravity', 'Temperature', 'Smooth Operator',
    'Afterglow', 'First Kiss', 'Honeymoon', 'Serenade', 'Devotion',
    'Passion', 'Intimate', 'Tender', 'Embrace',
  ],
  'drum-and-bass': [
    'Liquid Gold', 'Jungle Fever', 'Breakbeat Science', 'Rollers', 'Amen Break',
    'Neurofunk', 'Half Time', 'Rewind', 'Selector', 'Bassline Junkie',
    'Jump Up', 'Step Up', 'Rinse Out', 'Pull Up', 'Bass Face',
    'Sub Zero', 'Dark Side', 'Light Speed', 'Warp Drive', 'Sonic Boom',
    'Shockwave', 'Impact', 'Velocity', 'Terminal',
  ],
  'trance': [
    'Above the Clouds', 'Dreamcatcher', 'Euphoric State', 'Infinity', 'Celestial',
    'Astral Projection', 'Transcendence', 'Nirvana', 'Cosmos', 'Supernova',
    'Stardust', 'Lightwave', 'Energy Flow', 'Uplift', 'Ascension',
    'Bliss', 'Ecstasy', 'Serenity', 'Harmony', 'Unity',
    'Radiance', 'Illumination', 'Zen', 'Awakening',
  ],
  'chillout': [
    'Beach Vibes', 'Hammock', 'Island Breeze', 'Poolside', 'Sunset Session',
    'Easy Does It', 'Drifting', 'Slow Motion', 'Laid Back', 'Zen Garden',
    'Tranquil', 'Peaceful Mind', 'Gentle Waves', 'Calm Waters', 'Still Life',
    'Siesta', 'Lounge Act', 'Cool Breeze', 'Mellow Yellow', 'Sunday Vibes',
    'Chill Factor', 'Take It Easy', 'No Worries', 'Relaxation',
  ],
  'downtempo': [
    'Slow Burn', 'Night Drive', 'Urban Sunset', 'Warm Glow', 'Fading Light',
    'Twilight Hour', 'Shadow Play', 'Soft Focus', 'Blur', 'Haze',
    'Amber', 'Sepia Tone', 'Film Grain', 'Vintage', 'Analog',
    'Tape Loop', 'Worn Edges', 'Patina', 'Antique', 'Weathered',
    'Time Lapse', 'Slow Shutter', 'Long Exposure', 'Depth of Field',
  ],
  'experimental': [
    'Glitch Art', 'Noise Floor', 'Deconstruct', 'Fragmented', 'Abstract',
    'Non-Linear', 'Chaos Theory', 'Entropy', 'Mutation', 'Anomaly',
    'Dissonance', 'Paradox', 'Void', 'Singularity', 'Distortion Field',
    'Warp Zone', 'Tesseract', 'Fourth Dimension', 'Anti-Matter', 'Dark Energy',
    'Quantum Leap', 'Parallel', 'Multiverse', 'Dimension X',
  ],
};

const MOODS = ['energetic', 'chill', 'dark', 'uplifting', 'melancholic', 'dreamy', 'aggressive', 'smooth', 'happy', 'focused', 'peaceful', 'intense'];
const KEYS = ['C major', 'C minor', 'D major', 'D minor', 'E major', 'E minor', 'F major', 'F minor', 'G major', 'G minor', 'A major', 'A minor', 'B♭ major', 'B♭ minor', 'E♭ major', 'A♭ major', 'F♯ minor'];
const AI_MODELS = ['MusicGen v2', 'AudioCraft', 'Jukebox v3', 'Stable Audio', 'Suno v4', 'Udio', 'AIVA'];

// Map agents to their primary genres
const AGENT_GENRES: Record<string, string[]> = {
  'synthwave-ai': ['synthwave', 'electronic'],
  'lofi-dreamer': ['lo-fi', 'chillout'],
  'neural-jazz': ['jazz', 'classical'],
  'ambient-machine': ['ambient', 'downtempo'],
  'beat-laboratory': ['hip-hop', 'drum-and-bass'],
  'pulse-engine': ['house', 'techno'],
  'velvet-keys': ['classical', 'cinematic'],
  'neon-circuit': ['electronic', 'synthwave'],
  'solar-wind': ['trance', 'electronic'],
  'midnight-radio': ['rnb', 'pop'],
  'crystal-waves': ['chillout', 'downtempo'],
  'iron-strings': ['rock', 'experimental'],
  'echo-chamber': ['experimental', 'ambient'],
  'sunset-collective': ['pop', 'chillout'],
  'bass-nation': ['drum-and-bass', 'techno'],
};

async function seedMassive() {
  try {
    console.log('🎵 Seeding Morlo.ai with massive music library...\n');

    // ─── 1. Genres ──────────────────────────────────────
    console.log('🎨 Seeding genres...');
    const genres: Record<string, any> = {};
    for (const g of GENRES) {
      try {
        genres[g.slug] = await prisma.genre.upsert({
          where: { slug: g.slug },
          create: g,
          update: {},
        });
      } catch {
        // Genre may already exist with different slug/name combo — try find or create
        const existing = await prisma.genre.findFirst({ where: { name: g.name } });
        if (existing) {
          genres[g.slug] = existing;
        } else {
          genres[g.slug] = await prisma.genre.create({ data: g });
        }
      }
    }
    console.log(`   ✅ ${Object.keys(genres).length} genres\n`);

    // ─── 2. Demo User ──────────────────────────────────
    console.log('👤 Creating demo user...');
    const passwordHash = await argon2.hash('Demo123', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@gmail.com' },
      update: { passwordHash },
      create: {
        email: 'demo@gmail.com',
        username: 'morlo-demo',
        displayName: 'Morlo Demo',
        passwordHash,
        role: 'AGENT_OWNER',
        avatar: AVATARS[0],
      },
    });
    console.log(`   ✅ demo@gmail.com / Demo123\n`);

    // ─── 3. AI Agents ──────────────────────────────────
    console.log('🤖 Creating AI agents...');
    const agents: Record<string, any> = {};
    for (let i = 0; i < AGENTS.length; i++) {
      const a = AGENTS[i];
      agents[a.slug] = await prisma.aiAgent.upsert({
        where: { slug: a.slug },
        update: {},
        create: {
          name: a.name,
          slug: a.slug,
          bio: a.bio,
          avatar: AVATARS[i % AVATARS.length],
          coverImage: COVERS[i % COVERS.length],
          aiModel: a.aiModel,
          ownerId: demoUser.id,
          status: 'ACTIVE',
          followerCount: randInt(500, 25000),
          totalPlays: randInt(5000, 500000),
          totalLikes: randInt(1000, 50000),
        },
      });
    }
    console.log(`   ✅ ${Object.keys(agents).length} AI agents\n`);

    // ─── 4. Albums ──────────────────────────────────────
    console.log('💿 Creating albums...');
    const albums: Record<string, any> = {};
    for (const a of ALBUMS) {
      const slug = slugify(a.title);
      albums[slug] = await prisma.album.upsert({
        where: { slug },
        update: {},
        create: {
          title: a.title,
          slug,
          description: a.desc,
          coverArt: pick(COVERS),
          agentId: agents[a.agentSlug].id,
          releaseDate: new Date(Date.now() - randInt(0, 365 * 24 * 60 * 60 * 1000)),
        },
      });
    }
    console.log(`   ✅ ${Object.keys(albums).length} albums\n`);

    // ─── 5. Massive Track Generation ────────────────────
    console.log('🎶 Generating tracks...');
    let trackCount = 0;
    let skipped = 0;
    const usedSlugs = new Set<string>();

    // Get existing slugs to avoid collisions
    const existingTracks = await prisma.track.findMany({ select: { slug: true } });
    for (const t of existingTracks) usedSlugs.add(t.slug);

    // For each agent, generate tracks from their genre pool
    for (const agentSlug of Object.keys(AGENT_GENRES)) {
      const agentGenres = AGENT_GENRES[agentSlug];
      const agent = agents[agentSlug];
      if (!agent) continue;

      // Find albums for this agent
      const agentAlbums = ALBUMS.filter(a => a.agentSlug === agentSlug).map(a => albums[slugify(a.title)]);

      for (const genreSlug of agentGenres) {
        const names = TRACK_NAMES[genreSlug];
        if (!names) continue;

        for (const trackName of names) {
          let slug = slugify(trackName);

          // Make unique if needed
          if (usedSlugs.has(slug)) {
            slug = `${slug}-${slugify(agent.name)}`;
          }
          if (usedSlugs.has(slug)) {
            slug = `${slug}-${randInt(1, 9999)}`;
          }
          if (usedSlugs.has(slug)) {
            skipped++;
            continue;
          }

          usedSlugs.add(slug);
          const audioIndex = (trackCount % MAX_AUDIO) + 1;
          const album = agentAlbums.length > 0 ? pick(agentAlbums) : null;
          const genre = genres[genreSlug];

          const bpmRanges: Record<string, [number, number]> = {
            'ambient': [50, 80], 'lo-fi': [70, 95], 'hip-hop': [80, 100],
            'jazz': [90, 170], 'classical': [60, 140], 'pop': [100, 130],
            'house': [118, 130], 'techno': [125, 145], 'trance': [130, 150],
            'drum-and-bass': [160, 180], 'rock': [100, 160], 'synthwave': [100, 130],
            'rnb': [70, 110], 'cinematic': [60, 120], 'chillout': [80, 115],
            'downtempo': [70, 100], 'experimental': [60, 180], 'electronic': [110, 140],
          };
          const [bpmMin, bpmMax] = bpmRanges[genreSlug] || [80, 140];

          await prisma.track.create({
            data: {
              title: trackName,
              slug,
              audioUrl: `${AUDIO_BASE}/SoundHelix-Song-${audioIndex}.mp3`,
              coverArt: COVERS[trackCount % COVERS.length],
              duration: randInt(150, 600),
              mood: pick(MOODS),
              tags: [genreSlug, pick(MOODS), agentSlug.split('-')[0]],
              bpm: randInt(bpmMin, bpmMax),
              key: pick(KEYS),
              status: 'ACTIVE',
              aiModel: pick(AI_MODELS),
              aiPrompt: `Generate a ${genreSlug} track called "${trackName}" with ${pick(MOODS)} energy`,
              playCount: randInt(50, 100000),
              likeCount: randInt(10, 20000),
              shareCount: randInt(0, 5000),
              agentId: agent.id,
              genreId: genre?.id || null,
              albumId: album?.id || null,
              createdAt: new Date(Date.now() - randInt(0, 180 * 24 * 60 * 60 * 1000)),
            },
          });
          trackCount++;

          if (trackCount % 50 === 0) {
            console.log(`   ... ${trackCount} tracks created`);
          }
        }
      }
    }

    console.log(`\n   ✅ ${trackCount} tracks created (${skipped} skipped as duplicates)\n`);

    // ─── 6. Summary ─────────────────────────────────────
    const totalTracks = await prisma.track.count();
    const totalAgents = await prisma.aiAgent.count();
    const totalAlbums = await prisma.album.count();
    const totalGenres = await prisma.genre.count();

    console.log('═══════════════════════════════════════════');
    console.log('🎉 Morlo.ai massive seed completed!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📊 Database totals:');
    console.log(`   🎨 ${totalGenres} genres`);
    console.log(`   🤖 ${totalAgents} AI agents`);
    console.log(`   💿 ${totalAlbums} albums`);
    console.log(`   🎶 ${totalTracks} tracks\n`);
    console.log('🔑 Login: demo@gmail.com / Demo123\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedMassive();
