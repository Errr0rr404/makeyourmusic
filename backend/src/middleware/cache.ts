import { Request, Response, NextFunction } from 'express';

// Simple in-memory cache for API responses
// For production, consider using Redis or similar
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds (default: 5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Cache middleware for GET requests
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns Express middleware
 */
export const cacheMiddleware = (ttl: number = DEFAULT_TTL) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Don't cache authenticated requests (may have user-specific data)
    if (req.headers.authorization) {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    // Check if cached entry exists and is still valid
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = function (body: any) {
      // Cache successful responses (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data: body,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });

        // Clean up old cache entries periodically
        if (cache.size > 1000) {
          cleanupCache();
        }
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

/**
 * Clear cache entries older than their TTL
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiresAt) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache entries
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * Clear cache for specific route pattern
 */
export const clearCachePattern = (pattern: string) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Periodic cache cleanup (every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 10 * 60 * 1000);
}
