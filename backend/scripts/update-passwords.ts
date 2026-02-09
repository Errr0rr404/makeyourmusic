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
const dbPath = path.resolve(__dirname, '../src/utils/db');
const { prisma } = require(dbPath);

interface UserPassword {
  email: string;
  password: string;
  role?: string;
}

const users: UserPassword[] = [
  {
    email: 'customer@demo.com',
    password: 'Customer123!!',
    role: 'CUSTOMER',
  },
  {
    email: 'mastermind@demo.com',
    password: 'Mastermind123!!',
    role: 'MASTERMIND',
  },
  {
    email: 'admin@demo.com',
    password: 'Admin123!!',
    role: 'ADMIN',
  },
  {
    email: 'manager@demo.com',
    password: 'Manager123!!',
    role: 'MANAGER',
  },
];

async function updatePasswords() {
  try {
    console.log('🔐 Updating user passwords...\n');

    for (const user of users) {
      try {
        // Hash the password
        const passwordHash = await argon2.hash(user.password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

        // Update or create the user
        const updatedUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            passwordHash,
            ...(user.role && { role: user.role as any }),
          },
          create: {
            email: user.email,
            passwordHash,
            role: (user.role || 'CUSTOMER') as any,
            name: user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) + ' User',
          },
        });

        console.log(`✅ Updated password for ${user.email} (${updatedUser.role})`);
      } catch (error: any) {
        console.error(`❌ Error updating ${user.email}:`, error.message);
      }
    }

    console.log('\n✨ Password update completed!');
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updatePasswords();
