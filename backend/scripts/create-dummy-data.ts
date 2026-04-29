import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
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

// ─── Free, publicly hosted audio samples ─────────────────
// SoundHelix provides royalty-free sample songs
const AUDIO_BASE = 'https://www.soundhelix.com/examples/mp3';

// Unsplash cover art (music/abstract/gradient themed)
const COVERS = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop', // DJ booth
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop', // guitar
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', // concert
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop', // vinyl
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop', // concert lights
  'https://images.unsplash.com/photo-1571974599782-87624638275e?w=400&h=400&fit=crop', // headphones
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop', // abstract
  'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop', // gradient
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop', // abstract art
  'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400&h=400&fit=crop', // gradient orb
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop', // neon
  'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop', // city night
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=400&fit=crop', // dance
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', // portrait
  'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=400&h=400&fit=crop', // headphones
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop', // concert crowd
];

const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=200&h=200&fit=crop',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedDummyData() {
  try {
    console.log('🎵 Seeding MakeYourMusic with dummy music data...\n');

    // ─── 1. Genres ───────────────────────────────────────
    console.log('🎨 Seeding genres...');
    const genreData = [
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
    ];

    const genres: Record<string, any> = {};
    for (const g of genreData) {
      genres[g.slug] = await prisma.genre.upsert({
        where: { slug: g.slug },
        create: g,
        update: {},
      });
    }
    console.log(`   ✅ ${Object.keys(genres).length} genres ready\n`);

    // ─── 2. Demo User ────────────────────────────────────
    console.log('👤 Creating demo user...');
    const passwordHash = await argon2.hash('Demo123', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@gmail.com' },
      update: {},
      create: {
        email: 'demo@gmail.com',
        username: 'morlo-demo',
        displayName: 'Morlo Demo',
        passwordHash,
        role: 'AGENT_OWNER',
        avatar: AVATARS[0],
      },
    });
    console.log(`   ✅ User: demo@gmail.com / Demo123\n`);

    // ─── 3. AI Agents ────────────────────────────────────
    console.log('🤖 Creating AI agents...');
    const agentData = [
      {
        name: 'SynthWave AI',
        slug: 'synthwave-ai',
        bio: 'Retro-futuristic soundscapes blending 80s synth nostalgia with modern electronic production. Born from neon dreams and analog circuits.',
        avatar: AVATARS[1],
        coverImage: COVERS[0],
        aiModel: 'MusicGen v2',
      },
      {
        name: 'LoFi Dreamer',
        slug: 'lofi-dreamer',
        bio: 'Chill beats for studying, relaxing, and vibing. Warm vinyl crackle meets jazzy piano loops in a lo-fi paradise.',
        avatar: AVATARS[2],
        coverImage: COVERS[3],
        aiModel: 'AudioCraft',
      },
      {
        name: 'Neural Jazz',
        slug: 'neural-jazz',
        bio: 'AI-composed jazz explorations. From smooth cocktail grooves to experimental free jazz. Every note computed, every swing felt.',
        avatar: AVATARS[3],
        coverImage: COVERS[6],
        aiModel: 'Jukebox v3',
      },
      {
        name: 'Ambient Machine',
        slug: 'ambient-machine',
        bio: 'Ethereal soundscapes for deep focus, meditation, and sleep. Generative textures that evolve like living organisms.',
        avatar: AVATARS[4],
        coverImage: COVERS[7],
        aiModel: 'MusicGen v2',
      },
      {
        name: 'Beat Laboratory',
        slug: 'beat-laboratory',
        bio: 'Hard-hitting beats and bass-heavy productions. From trap bangers to experimental hip-hop instrumentals.',
        avatar: AVATARS[0],
        coverImage: COVERS[4],
        aiModel: 'Stable Audio',
      },
    ];

    const agents: Record<string, any> = {};
    for (const a of agentData) {
      agents[a.slug] = await prisma.aiAgent.upsert({
        where: { slug: a.slug },
        update: {},
        create: {
          ...a,
          ownerId: demoUser.id,
          status: 'ACTIVE',
          followerCount: Math.floor(Math.random() * 5000) + 200,
          totalPlays: Math.floor(Math.random() * 50000) + 1000,
          totalLikes: Math.floor(Math.random() * 10000) + 500,
        },
      });
    }
    console.log(`   ✅ ${Object.keys(agents).length} AI agents created\n`);

    // ─── 4. Albums ───────────────────────────────────────
    console.log('💿 Creating albums...');
    const albumData = [
      {
        title: 'Neon Horizons',
        slug: 'neon-horizons',
        description: 'A journey through retro-futuristic soundscapes',
        coverArt: COVERS[0],
        agentSlug: 'synthwave-ai',
      },
      {
        title: 'Rainy Day Tapes',
        slug: 'rainy-day-tapes',
        description: 'Lo-fi beats for cozy afternoons',
        coverArt: COVERS[3],
        agentSlug: 'lofi-dreamer',
      },
      {
        title: 'Deep Focus',
        slug: 'deep-focus',
        description: 'Ambient textures for concentration and flow',
        coverArt: COVERS[7],
        agentSlug: 'ambient-machine',
      },
    ];

    const albums: Record<string, any> = {};
    for (const a of albumData) {
      const { agentSlug, ...data } = a;
      albums[a.slug] = await prisma.album.upsert({
        where: { slug: a.slug },
        update: {},
        create: {
          ...data,
          agentId: agents[agentSlug].id,
          releaseDate: new Date(),
        },
      });
    }
    console.log(`   ✅ ${Object.keys(albums).length} albums created\n`);

    // ─── 5. Tracks ───────────────────────────────────────
    console.log('🎶 Creating tracks with playable audio...');
    const trackData = [
      // SynthWave AI tracks
      {
        title: 'Midnight Drive',
        mood: 'energetic',
        tags: ['synthwave', 'retro', '80s', 'driving'],
        bpm: 120,
        key: 'A minor',
        duration: 362,
        agentSlug: 'synthwave-ai',
        genreSlug: 'synthwave',
        albumSlug: 'neon-horizons',
        audioIndex: 1,
        coverIndex: 0,
        aiPrompt: 'Create an 80s synthwave track with driving bass, arpeggiated synths, and a nostalgic feel',
      },
      {
        title: 'Chrome Sunset',
        mood: 'uplifting',
        tags: ['synthwave', 'sunset', 'melodic'],
        bpm: 128,
        key: 'C major',
        duration: 415,
        agentSlug: 'synthwave-ai',
        genreSlug: 'electronic',
        albumSlug: 'neon-horizons',
        audioIndex: 2,
        coverIndex: 4,
        aiPrompt: 'Melodic synthwave with warm pads and uplifting chord progressions',
      },
      {
        title: 'Digital Rain',
        mood: 'dark',
        tags: ['synthwave', 'cyberpunk', 'dark'],
        bpm: 110,
        key: 'D minor',
        duration: 298,
        agentSlug: 'synthwave-ai',
        genreSlug: 'synthwave',
        audioIndex: 3,
        coverIndex: 11,
        aiPrompt: 'Dark cyberpunk synthwave with glitchy textures and heavy bass',
      },

      // LoFi Dreamer tracks
      {
        title: 'Sunday Morning Coffee',
        mood: 'chill',
        tags: ['lofi', 'chill', 'morning', 'coffee'],
        bpm: 85,
        key: 'G major',
        duration: 245,
        agentSlug: 'lofi-dreamer',
        genreSlug: 'lo-fi',
        albumSlug: 'rainy-day-tapes',
        audioIndex: 4,
        coverIndex: 1,
        aiPrompt: 'Warm lo-fi hip hop beat with jazzy piano and vinyl crackle',
      },
      {
        title: 'Rainy Window',
        mood: 'melancholic',
        tags: ['lofi', 'rain', 'study', 'peaceful'],
        bpm: 78,
        key: 'E minor',
        duration: 312,
        agentSlug: 'lofi-dreamer',
        genreSlug: 'lo-fi',
        albumSlug: 'rainy-day-tapes',
        audioIndex: 5,
        coverIndex: 14,
        aiPrompt: 'Melancholic lo-fi beat with rain sounds and gentle guitar',
      },
      {
        title: 'Late Night Study',
        mood: 'focused',
        tags: ['lofi', 'study', 'late-night', 'focus'],
        bpm: 90,
        key: 'B♭ major',
        duration: 278,
        agentSlug: 'lofi-dreamer',
        genreSlug: 'lo-fi',
        audioIndex: 6,
        coverIndex: 10,
        aiPrompt: 'Mellow lo-fi beat for late night studying with soft keys',
      },
      {
        title: 'Paper Planes',
        mood: 'happy',
        tags: ['lofi', 'happy', 'upbeat', 'summer'],
        bpm: 95,
        key: 'F major',
        duration: 195,
        agentSlug: 'lofi-dreamer',
        genreSlug: 'lo-fi',
        audioIndex: 7,
        coverIndex: 9,
        aiPrompt: 'Happy upbeat lo-fi with light percussion and playful melody',
      },

      // Neural Jazz tracks
      {
        title: 'Blue Velvet Lounge',
        mood: 'smooth',
        tags: ['jazz', 'smooth', 'lounge', 'piano'],
        bpm: 100,
        key: 'E♭ major',
        duration: 348,
        agentSlug: 'neural-jazz',
        genreSlug: 'jazz',
        audioIndex: 8,
        coverIndex: 6,
        aiPrompt: 'Smooth jazz piano trio with walking bass and brushed drums',
      },
      {
        title: 'Neon Bop',
        mood: 'energetic',
        tags: ['jazz', 'bebop', 'saxophone', 'fast'],
        bpm: 160,
        key: 'F major',
        duration: 267,
        agentSlug: 'neural-jazz',
        genreSlug: 'jazz',
        audioIndex: 9,
        coverIndex: 5,
        aiPrompt: 'Fast bebop jazz with virtuosic saxophone and piano solos',
      },
      {
        title: 'Autumn Leaves (AI Reinterpretation)',
        mood: 'melancholic',
        tags: ['jazz', 'classic', 'reinterpretation', 'autumn'],
        bpm: 115,
        key: 'G minor',
        duration: 396,
        agentSlug: 'neural-jazz',
        genreSlug: 'jazz',
        audioIndex: 10,
        coverIndex: 2,
        aiPrompt: 'Modern AI reinterpretation of classic jazz standard with electronic elements',
      },

      // Ambient Machine tracks
      {
        title: 'Floating in Space',
        mood: 'dreamy',
        tags: ['ambient', 'space', 'ethereal', 'meditation'],
        bpm: 60,
        key: 'C major',
        duration: 480,
        agentSlug: 'ambient-machine',
        genreSlug: 'ambient',
        albumSlug: 'deep-focus',
        audioIndex: 11,
        coverIndex: 7,
        aiPrompt: 'Ethereal ambient with evolving pad textures and cosmic sounds',
      },
      {
        title: 'Forest Canopy',
        mood: 'peaceful',
        tags: ['ambient', 'nature', 'forest', 'peaceful'],
        bpm: 70,
        key: 'D major',
        duration: 520,
        agentSlug: 'ambient-machine',
        genreSlug: 'ambient',
        albumSlug: 'deep-focus',
        audioIndex: 12,
        coverIndex: 8,
        aiPrompt: 'Nature-inspired ambient with bird sounds and gentle wind textures',
      },
      {
        title: 'Deep Ocean',
        mood: 'calm',
        tags: ['ambient', 'ocean', 'deep', 'sleep'],
        bpm: 55,
        key: 'A♭ major',
        duration: 600,
        agentSlug: 'ambient-machine',
        genreSlug: 'ambient',
        audioIndex: 13,
        coverIndex: 9,
        aiPrompt: 'Deep ambient with subaquatic textures and slow evolving harmonics',
      },

      // Beat Laboratory tracks
      {
        title: 'Bass Drop Protocol',
        mood: 'aggressive',
        tags: ['trap', 'bass', 'heavy', 'drop'],
        bpm: 140,
        key: 'F minor',
        duration: 210,
        agentSlug: 'beat-laboratory',
        genreSlug: 'hip-hop',
        audioIndex: 14,
        coverIndex: 15,
        aiPrompt: 'Heavy trap beat with massive bass drops and crispy hi-hats',
      },
      {
        title: 'Cipher',
        mood: 'dark',
        tags: ['hip-hop', 'boom-bap', 'underground'],
        bpm: 92,
        key: 'D minor',
        duration: 234,
        agentSlug: 'beat-laboratory',
        genreSlug: 'hip-hop',
        audioIndex: 15,
        coverIndex: 12,
        aiPrompt: 'Gritty boom-bap beat with chopped soul samples and punchy drums',
      },
      {
        title: 'Night Market',
        mood: 'chill',
        tags: ['hip-hop', 'chill', 'asian', 'vibes'],
        bpm: 88,
        key: 'G minor',
        duration: 256,
        agentSlug: 'beat-laboratory',
        genreSlug: 'hip-hop',
        audioIndex: 16,
        coverIndex: 13,
        aiPrompt: 'Chill hip-hop beat with Asian-inspired melodies and lo-fi textures',
      },
    ];

    let createdCount = 0;
    for (const t of trackData) {
      const slug = slugify(t.title);
      const existing = await prisma.track.findUnique({ where: { slug } });
      if (existing) {
        console.log(`   ⏭️  Skipping "${t.title}" (already exists)`);
        createdCount++;
        continue;
      }

      await prisma.track.create({
        data: {
          title: t.title,
          slug,
          audioUrl: `${AUDIO_BASE}/SoundHelix-Song-${t.audioIndex}.mp3`,
          coverArt: COVERS[t.coverIndex] || COVERS[0],
          duration: t.duration,
          mood: t.mood,
          tags: t.tags,
          bpm: t.bpm,
          key: t.key,
          status: 'ACTIVE',
          aiModel: agents[t.agentSlug]?.aiModel || 'MusicGen v2',
          aiPrompt: t.aiPrompt,
          playCount: Math.floor(Math.random() * 10000) + 100,
          likeCount: Math.floor(Math.random() * 2000) + 50,
          shareCount: Math.floor(Math.random() * 500) + 10,
          agentId: agents[t.agentSlug].id,
          genreId: genres[t.genreSlug]?.id || null,
          albumId: t.albumSlug ? albums[t.albumSlug]?.id : null,
        },
      });
      createdCount++;
      console.log(`   ✅ "${t.title}" — ${t.agentSlug} (${t.genreSlug})`);
    }
    console.log(`\n   🎶 ${createdCount} tracks ready\n`);

    // ─── 6. Summary ──────────────────────────────────────
    console.log('═══════════════════════════════════════════');
    console.log('🎉 MakeYourMusic dummy data seeded successfully!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📋 What was created:');
    console.log(`   🎨 ${Object.keys(genres).length} genres`);
    console.log(`   🤖 ${Object.keys(agents).length} AI agents`);
    console.log(`   💿 ${Object.keys(albums).length} albums`);
    console.log(`   🎶 ${createdCount} playable tracks\n`);
    console.log('🔑 Login credentials:');
    console.log('   Email:    demo@gmail.com');
    console.log('   Password: Demo123\n');
    console.log('🎧 All tracks use real audio from SoundHelix.com');
    console.log('   and will play in the browser / mobile player.\n');
    console.log('💡 AI Agents:');
    for (const a of agentData) {
      console.log(`   • ${a.name} (@${a.slug})`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDummyData();
