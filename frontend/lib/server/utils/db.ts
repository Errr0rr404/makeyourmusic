import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
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

// Get DATABASE_URL - Next.js automatically loads .env.local
// Netlify provides NETLIFY_DATABASE_URL, so check that first, then fall back to DATABASE_URL
const getDatabaseUrl = (): string => {
  // Netlify provides NETLIFY_DATABASE_URL when using Neon integration
  let databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL or NETLIFY_DATABASE_URL environment variable is not set. Please check your environment variables.'
    );
  }

  // Normalize SSL mode to silence deprecation warnings
  databaseUrl = normalizeDatabaseUrl(databaseUrl);

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error(
      `Invalid DATABASE_URL format. Expected postgresql:// or postgres:// protocol, but got: ${databaseUrl.substring(0, 20)}...`
    );
  }

  return databaseUrl;
};

// Initialize Prisma Client with Prisma 7 adapter pattern
let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;

const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  
  if (prismaInstance) {
    return prismaInstance;
  }

  try {
    const connectionString = getDatabaseUrl();

    // Create a Pool instance for PostgreSQL connection
    if (!poolInstance) {
      poolInstance = new Pool({ connectionString });

      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.pool = poolInstance;
      }
    }

    // Prisma 7 requires using an adapter with a Pool instance
    const adapter = new PrismaPg(poolInstance);

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance;
    }

    return prismaInstance;
  } catch (error: any) {
    throw new Error(
      `Prisma client initialization failed: ${error.message || 'Unknown error'}. ` +
      'Please check your DATABASE_URL environment variable.'
    );
  }
};

// Export prisma with lazy initialization using Proxy
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Export getDb as an alias for prisma (for compatibility with existing code)
export const getDb = async () => prisma;
