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

// Pass DATABASE_URL through unchanged. Earlier versions rewrote sslmode=prefer
// (and other aliases) to verify-full, but managed-DB providers (Railway's
// internal postgres especially) lack a publicly-trusted CA — verify-full
// hard-breaks those connections. Operators who want strict TLS verification
// should set sslmode explicitly in DATABASE_URL.
function normalizeDatabaseUrl(url: string): string {
  return url;
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

  // Drop `query` logging even in dev — it echoes bind parameters which
  // include hashed API keys, password reset tokens, and email addresses.
  // Switch to LOG_LEVEL=debug + Prisma's query event manually if needed.
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  (prisma as unknown as { $on: (e: string, cb: (ev: { message?: string; target?: string }) => void) => void })
    .$on('error', (event) => {
      // Known schema-drift markers — log at warn so we still see them when
      // debugging but don't pollute error metrics. Previously these were
      // silently dropped, which masked real schema bugs.
      const isKnownDrift =
        event.message &&
        (event.message.includes('does not exist in the current database') ||
          event.message.includes('storeConfig'));
      if (process.env.NODE_ENV === 'test') return;
      if (isKnownDrift) {
        logger.warn('[Prisma Error — schema drift]', { message: event.message, target: event.target });
        return;
      }
      logger.error('[Prisma Error]', { message: event.message, target: event.target });
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
};

export const prisma = getPrismaClient();
