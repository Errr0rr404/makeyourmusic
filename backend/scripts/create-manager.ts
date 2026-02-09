import * as path from 'path';
import argon2 from 'argon2';
import dotenv from 'dotenv';

// Load environment variables from backend/.env or frontend/.env.local
const backendEnv = path.join(__dirname, '../.env');
const frontendEnv = path.join(__dirname, '../../frontend/.env.local');
if (require('fs').existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else if (require('fs').existsSync(frontendEnv)) {
  dotenv.config({ path: frontendEnv });
} else {
  dotenv.config(); // Fallback to default .env
}

// Import Prisma client - Prisma 7 with custom output requires importing from generated location
// The backend uses @prisma/client, but for scripts we need to use the generated path
// OR we can use the backend's db utility which already handles this
const dbPath = path.resolve(__dirname, '../src/utils/db');
const { prisma } = require(dbPath);

async function createManager() {
  try {
    console.log('Creating manager user...');

    const email = 'manager@gmail.com';
    const password = 'Manager123!!';
    const name = 'Manager User';

    // Hash password with 12 rounds (same as auth controller)
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

    // Create or update manager user
    const manager = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        name,
        role: 'MANAGER',
      },
      create: {
        email,
        passwordHash,
        name,
        role: 'MANAGER',
      },
    });

    console.log('✅ Manager user created successfully!');
    console.log('📧 Email:', manager.email);
    console.log('👤 Name:', manager.name);
    console.log('🔐 Role:', manager.role);
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: manager@gmail.com');
    console.log('   Password: Manager123!!');
    console.log('\n⚠️  Please keep these credentials secure!');
  } catch (error) {
    console.error('❌ Error creating manager user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createManager();
