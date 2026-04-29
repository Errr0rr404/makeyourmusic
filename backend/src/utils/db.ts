// Ensure dotenv is loaded before PrismaClient initialization
// This is a safety measure in case db.ts is imported before dotenv.config() is called
import dotenv from 'dotenv';
import { resolve } from 'path';
import logger from './logger';

// Load from backend/.env file specifically (try both locations)
const envPath = resolve(__dirname, '../.env');
const rootEnvPath = resolve(__dirname, '../../.env');
if (require('fs').existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (require('fs').existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  // Fallback to default .env location
  dotenv.config();
}

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Normalize DATABASE_URL — silence deprecation warnings for SSL mode aliases.
// We DO NOT add an sslmode if one isn't present: managed providers (e.g.
// Railway's private postgres at *.railway.internal) negotiate SSL through
// other means and adding verify-full breaks the connection.
function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;

  let normalizedUrl = url;
  const deprecatedModes = ['prefer', 'verify-ca'];
  for (const mode of deprecatedModes) {
    const regex = new RegExp(`([?&])sslmode=${mode}(&|$)`, 'gi');
    if (regex.test(normalizedUrl)) {
      normalizedUrl = normalizedUrl.replace(regex, `$1sslmode=verify-full$2`);
    }
  }
  return normalizedUrl;
}

// Validate DATABASE_URL before creating PrismaClient
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please check your .env file.'
  );
}

// Validate that DATABASE_URL is a standard PostgreSQL connection string
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  throw new Error(
    `Invalid DATABASE_URL format. Expected postgresql:// or postgres:// protocol, but got: ${databaseUrl.substring(0, 20)}...`
  );
}

// Normalize SSL mode and write back so PrismaClient (which reads env) uses it.
process.env.DATABASE_URL = normalizeDatabaseUrl(databaseUrl);

const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  (prisma as unknown as { $on: (e: string, cb: (ev: { message?: string; target?: string }) => void) => void })
    .$on('error', (event) => {
      if (event.message && (
        event.message.includes('does not exist in the current database') ||
        event.message.includes('storeConfig')
      )) {
        return;
      }
      if (process.env.NODE_ENV !== 'test') {
        logger.error('[Prisma Error]', { message: event.message, target: event.target });
      }
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
};

export const prisma = getPrismaClient();
