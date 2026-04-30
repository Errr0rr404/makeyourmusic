import axios from 'axios';
import { config } from 'dotenv';
config();

const API_BASE = 'https://makeyourmusic.up.railway.app/api';
const EMAIL = 'demo@gmail.com';
const PASSWORD = 'Demo123';

const GENRES = [
  { genre: 'Pop', subGenre: 'Bedroom Pop', mood: 'Nostalgic', energy: 'Chill' },
  { genre: 'Hip Hop', subGenre: 'Lo-Fi Hip Hop', mood: 'Calm', energy: 'Mellow' },
  { genre: 'Rock', subGenre: 'Surf Rock', mood: 'Playful', energy: 'Upbeat' },
  { genre: 'R&B', subGenre: 'PBR&B', mood: 'Sensual', energy: 'Mellow' },
  { genre: 'Electronic', subGenre: 'Deep House', mood: 'Dreamy', energy: 'Chill' },
  { genre: 'Indie', subGenre: 'Folktronica', mood: 'Bittersweet', energy: 'Mid' },
  { genre: 'Folk', subGenre: 'Celtic Folk', mood: 'Nostalgic', energy: 'Chill' },
  { genre: 'Jazz', subGenre: 'Bossa Nova', mood: 'Romantic', energy: 'Mellow' },
  { genre: 'Classical', subGenre: 'Baroque', mood: 'Reflective', energy: 'Chill' },
  { genre: 'Lo-Fi', subGenre: 'Bedroom Lo-Fi', mood: 'Peaceful', energy: 'Chill' },
  { genre: 'Metal', subGenre: 'Death Metal', mood: 'Aggressive', energy: 'Hype' },
  { genre: 'Country', subGenre: 'Honky-Tonk', mood: 'Playful', energy: 'Upbeat' },
  { genre: 'Soul', subGenre: 'Southern Soul', mood: 'Heartbroken', energy: 'Mellow' },
  { genre: 'Funk', subGenre: 'Modern Funk', mood: 'Confident', energy: 'Energetic' },
  { genre: 'Reggae', subGenre: 'Dancehall', mood: 'Happy', energy: 'Upbeat' },
  { genre: 'World', subGenre: 'K-Pop', mood: 'Euphoric', energy: 'Hype' },
  { genre: 'Cinematic', subGenre: 'Sci-Fi Score', mood: 'Mysterious', energy: 'Mid' },
  { genre: 'Pop', subGenre: 'Power Pop', mood: 'Triumphant', energy: 'Energetic' },
  { genre: 'Hip Hop', subGenre: 'Cloud Rap', mood: 'Dreamy', energy: 'Chill' },
  { genre: 'Rock', subGenre: 'Post-Rock', mood: 'Epic', energy: 'Mid' },
  { genre: 'R&B', subGenre: 'Quiet Storm', mood: 'Romantic', energy: 'Chill' },
  { genre: 'Electronic', subGenre: 'Future Bass', mood: 'Euphoric', energy: 'Energetic' },
  { genre: 'Indie', subGenre: 'Indie Pop', mood: 'Hopeful', energy: 'Upbeat' },
  { genre: 'Folk', subGenre: 'Sea Shanty', mood: 'Adventurous', energy: 'Mid' },
  { genre: 'Jazz', subGenre: 'Jazz Fusion', mood: 'Complex', energy: 'Energetic' },
  { genre: 'Classical', subGenre: 'Modern Classical', mood: 'Melancholic', energy: 'Mellow' },
  { genre: 'Lo-Fi', subGenre: 'Lo-Fi Jazz', mood: 'Relaxed', energy: 'Chill' },
  { genre: 'Metal', subGenre: 'Black Metal', mood: 'Dark', energy: 'Hype' },
  { genre: 'Country', subGenre: 'Alt-Country', mood: 'Melancholic', energy: 'Mid' },
  { genre: 'Soul', subGenre: 'Psychedelic Soul', mood: 'Trippy', energy: 'Mid' },
  { genre: 'Funk', subGenre: 'Afrobeat', mood: 'Uplifting', energy: 'Energetic' },
  { genre: 'Reggae', subGenre: 'Rocksteady', mood: 'Chill', energy: 'Mellow' },
  { genre: 'World', subGenre: 'Bossa Nova', mood: 'Romantic', energy: 'Chill' },
  { genre: 'Cinematic', subGenre: 'Western Score', mood: 'Epic', energy: 'Mid' },
  { genre: 'Pop', subGenre: 'Art Pop', mood: 'Avant-garde', energy: 'Mid' },
  { genre: 'Hip Hop', subGenre: 'Jersey Club', mood: 'Hype', energy: 'Hype' },
  { genre: 'Rock', subGenre: 'Math Rock', mood: 'Complex', energy: 'Energetic' },
  { genre: 'R&B', subGenre: 'Funk-R&B', mood: 'Groovy', energy: 'Upbeat' },
  { genre: 'Electronic', subGenre: 'Drum & Bass', mood: 'Aggressive', energy: 'Hype' },
  { genre: 'Indie', subGenre: 'Chamber Pop', mood: 'Elegant', energy: 'Mellow' },
  { genre: 'Folk', subGenre: 'Indie Folk', mood: 'Intimate', energy: 'Chill' },
  { genre: 'Jazz', subGenre: 'Acid Jazz', mood: 'Groovy', energy: 'Energetic' },
  { genre: 'Classical', subGenre: 'Neoclassical', mood: 'Dreamy', energy: 'Mellow' },
  { genre: 'Lo-Fi', subGenre: 'Lo-Fi House', mood: 'Chill', energy: 'Chill' },
  { genre: 'Metal', subGenre: 'Power Metal', mood: 'Triumphant', energy: 'Energetic' },
  { genre: 'Country', subGenre: 'Country Pop', mood: 'Happy', energy: 'Upbeat' },
  { genre: 'Soul', subGenre: 'Northern Soul', mood: 'Uplifting', energy: 'Energetic' },
  { genre: 'Funk', subGenre: 'Disco-Funk', mood: 'Euphoric', energy: 'Upbeat' },
  { genre: 'Reggae', subGenre: 'Ska', mood: 'Playful', energy: 'Energetic' },
  { genre: 'World', subGenre: 'Flamenco', mood: 'Passionate', energy: 'Energetic' },
];

const PROMPTS = [
  'A soulful track about finding yourself',
  'An anthem about living in the moment',
  'A bittersweet melody about letting go',
  'An energetic banger about chasing dreams',
  'A chill tune for rainy day contemplation',
  'A powerful ballad about second chances',
  'A dreamy soundscape for midnight drives',
  'A high-energy track for morning workouts',
  'A romantic song about forbidden love',
  'A nostalgic track about summer friendships',
  'A mellow groove for coffee shop vibes',
  'An epic track for heroic moments',
  'A melancholic tune about lost time',
  'A feel-good song about new beginnings',
  'A mysterious track for late night adventures',
];

async function login(): Promise<string> {
  console.log('🔐 Logging in...');
  const res = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
  return res.data.accessToken;
}

async function generateMusic(token: string, params: any, index: number): Promise<string | null> {
  console.log(`🎵 [${index + 1}/50] Generating: ${params.genre} - ${params.subGenre} (${params.mood})`);

  try {
    const res = await axios.post(`${API_BASE}/ai/music`, params, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.generation.id;
  } catch (err: any) {
    if (err.response?.status === 429) {
      console.log(`  ⚠️ Rate limited! Waiting 5 minutes...`);
      await new Promise(r => setTimeout(r, 300000));
      const res = await axios.post(`${API_BASE}/ai/music`, params, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.generation.id;
    }
    throw err;
  }
}

async function waitForGeneration(token: string, generationId: string, index: number): Promise<boolean> {
  const maxWait = 180; // 3 minutes
  const interval = 5000; // 5 seconds

  for (let i = 0; i < maxWait / (interval / 1000); i++) {
    await new Promise(r => setTimeout(r, interval));
    const res = await axios.get(`${API_BASE}/ai/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const status = res.data.status;
    console.log(`  ⏳ [${index + 1}/50] Status: ${status}`);

    if (status === 'COMPLETED') {
      console.log(`  ✅ [${index + 1}/50] Done! Audio: ${res.data.audioUrl?.substring(0, 60)}...`);
      return true;
    }
    if (status === 'FAILED') {
      console.log(`  ❌ [${index + 1}/50] Failed: ${res.data.errorMessage}`);
      return false;
    }
  }
  console.log(`  ⏰ [${index + 1}/50] Timeout waiting for completion`);
  return false;
}

async function main() {
  console.log('🚀 Starting 50 Song Generation...\n');

  const token = await login();
  console.log('✅ Logged in successfully\n');

  const results: { index: number; genre: string; subGenre: string; status: string }[] = [];

  for (let i = 0; i < 50; i++) {
    const { genre, subGenre, mood, energy } = GENRES[i];
    const prompt = PROMPTS[i % PROMPTS.length];

    try {
      const generationId = await generateMusic(token, {
        title: `Song ${i + 1}: ${genre} ${subGenre}`,
        prompt,
        genre,
        subGenre,
        mood,
        energy,
        era: 'Modern',
        vocalStyle: i % 3 === 0 ? 'Male lead' : i % 3 === 1 ? 'Female lead' : 'Mixed/duet',
        durationSec: 120,
      }, i);

      const success = await waitForGeneration(token, generationId, i);
      results.push({ index: i + 1, genre, subGenre, status: success ? 'SUCCESS' : 'TIMEOUT/FAILED' });

    } catch (err: any) {
      console.log(`  ❌ [${i + 1}/50] Error: ${err.message}`);
      results.push({ index: i + 1, genre, subGenre, status: 'ERROR' });
    }

    // Delay between generations to avoid rate limiting
    if (i < 49) {
      console.log(`  ⏳ Waiting 15s before next generation...`);
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  console.log('\n📊 SUMMARY:');
  results.forEach(r => {
    const icon = r.status === 'SUCCESS' ? '✅' : r.status === 'TIMEOUT/FAILED' ? '⏰' : '❌';
    console.log(`  ${icon} Song ${r.index}: ${r.genre} - ${r.subGenre} [${r.status}]`);
  });

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`\n🎉 Completed: ${successCount}/50 songs generated successfully`);
}

main().catch(console.error);