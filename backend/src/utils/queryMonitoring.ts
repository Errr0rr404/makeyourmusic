import logger from './logger';

/**
 * Query performance monitoring utility
 * Logs slow queries and provides performance metrics
 */

const SLOW_QUERY_THRESHOLD = 100; // milliseconds

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
}

// Store recent slow queries (last 100)
const slowQueries: QueryMetrics[] = [];

/**
 * Middleware for monitoring Prisma queries
 * Note: Prisma v7 removed $use middleware. For production query monitoring,
 * consider using Prisma's built-in logging or external APM tools like:
 * - New Relic
 * - Datadog
 * - Prisma Accelerate
 */
export const setupQueryMonitoring = () => {
  // Prisma v7 removed the $use middleware API
  // Instead, we rely on Prisma's built-in query logging
  // which is configured in db.ts with the 'log' option

  logger.info('Query monitoring enabled via Prisma logging');

  // For advanced monitoring in production, integrate with:
  // - OpenTelemetry
  // - Prisma Accelerate
  // - Custom logging extensions (when available in Prisma v7+)
};

/**
 * Get slow query metrics
 */
export const getSlowQueries = () => {
  return slowQueries;
};

/**
 * Clear slow query history
 */
export const clearSlowQueries = () => {
  slowQueries.length = 0;
};

/**
 * Get query performance statistics
 */
export const getQueryStats = () => {
  if (slowQueries.length === 0) {
    return {
      count: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
    };
  }

  const durations = slowQueries.map(q => q.duration);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    count: slowQueries.length,
    averageDuration: Math.round(sum / durations.length),
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    threshold: SLOW_QUERY_THRESHOLD,
  };
};

/**
 * Utility to measure custom query performance
 */
export const measureQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const before = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - before;

    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow custom query', {
        name: queryName,
        duration: `${duration}ms`,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - before;
    logger.error('Query failed', {
      name: queryName,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};
