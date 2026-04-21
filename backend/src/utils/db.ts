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

// Normalize DATABASE_URL to use verify-full SSL mode (fixes deprecation warning)
function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  
  // Replace deprecated SSL modes with verify-full
  const deprecatedModes = ['prefer', 'require', 'verify-ca'];
  let normalizedUrl = url;
  
  for (const mode of deprecatedModes) {
    // Replace sslmode=prefer, sslmode=require, sslmode=verify-ca with sslmode=verify-full
    const regex = new RegExp(`([?&])sslmode=${mode}(&|$)`, 'gi');
    if (regex.test(normalizedUrl)) {
      normalizedUrl = normalizedUrl.replace(regex, `$1sslmode=verify-full$2`);
    }
  }
  
  // If no sslmode is specified, add verify-full for security
  if (!normalizedUrl.includes('sslmode=')) {
    const separator = normalizedUrl.includes('?') ? '&' : '?';
    normalizedUrl = `${normalizedUrl}${separator}sslmode=verify-full`;
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

// Normalize SSL mode to silence deprecation warnings
databaseUrl = normalizeDatabaseUrl(databaseUrl);

// Validate that DATABASE_URL is a standard PostgreSQL connection string
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  throw new Error(
    `Invalid DATABASE_URL format. Expected postgresql:// or postgres:// protocol, but got: ${databaseUrl.substring(0, 20)}...`
  );
}

// Prisma 7 requires using an adapter for database connections
// The adapter handles the connection string from environment
const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Note: PrismaPg adapter is available but not used in this configuration
  // const adapter = new PrismaPg({ connectionString: databaseUrl });

  const prisma = new PrismaClient({
    // @ts-ignore - adapter may not be available in all Prisma versions
    // adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }) as any;

  // Suppress Prisma error logs for known schema mismatches during development/tests
  prisma.$on('error', (event: any) => {
    if (event.message && (
      event.message.includes('does not exist in the current database') ||
      event.message.includes('storeConfig')
    )) {
      return; // Suppress known schema mismatch errors
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
