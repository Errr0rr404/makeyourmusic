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

async function createAdmin() {
  try {
    console.log('Creating admin user...');

    const email = process.env.ADMIN_EMAIL || 'admin@makeyourmusic.ai';
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!!';
    const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        displayName,
        role: 'ADMIN',
        emailVerified: true,
      },
      create: {
        email,
        username,
        passwordHash,
        displayName,
        role: 'ADMIN',
        emailVerified: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:    ', admin.email);
    console.log('👤 Username: ', admin.username);
    console.log('🔐 Role:     ', admin.role);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Override defaults via ADMIN_EMAIL / ADMIN_USERNAME / ADMIN_PASSWORD env vars for production.');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
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

createAdmin();
