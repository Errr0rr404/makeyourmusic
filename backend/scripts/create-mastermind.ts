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

// Import Prisma client using the backend's db utility (handles adapter correctly)
// This ensures we use the same database connection as the frontend
const dbPath = path.resolve(__dirname, '../src/utils/db');
const { prisma } = require(dbPath);

async function createMastermind() {
  try {
    console.log('Creating mastermind user...');

    const email = 'mastermind@mastermind.com';
    const password = 'Mastermind123!!';
    const name = 'Mastermind User';
    const role = 'MASTERMIND'; // Mastermind is a separate role from admin

    // Hash password with 12 rounds (same as auth controller)
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

    // Create or update mastermind user
    const mastermind = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        name,
        role: role as any,
      },
      create: {
        email,
        passwordHash,
        name,
        role: role as any,
      },
    });

    console.log('✅ Mastermind user created successfully!');
    console.log('📧 Email:', mastermind.email);
    console.log('👤 Name:', mastermind.name);
    console.log('🔐 Role:', mastermind.role);
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: mastermind@mastermind.com');
    console.log('   Password: Mastermind123!!');
    console.log('\n⚠️  Please keep these credentials secure!');
  } catch (error) {
    console.error('❌ Error creating mastermind user:', error);
    process.exit(1);
  } finally {
    // Disconnect Prisma client if it's a standalone instance
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors (might be shared instance)
    }
  }
}

createMastermind();
