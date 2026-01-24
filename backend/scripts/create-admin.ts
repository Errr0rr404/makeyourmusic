import * as path from 'path';
import bcrypt from 'bcryptjs';
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

    const email = 'admin@gmail.com';
    const password = 'Admin123!!';
    const name = 'Admin User';

    // Hash password with 12 rounds (same as auth controller)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create or update admin user
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        name,
        role: 'ADMIN',
      },
      create: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: Admin123!!');
    console.log('\n⚠️  Please keep these credentials secure!');
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
