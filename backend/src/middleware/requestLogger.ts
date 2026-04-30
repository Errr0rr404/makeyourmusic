import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'password',
  'authorization',
  'access_token',
  'refresh_token',
  'admin_token',
  'sig',
]);

/**
 * Strip sensitive query parameters from a URL before logging. The
 * `requestLogger` and any downstream log shipper will see only the path
 * and safe query keys.
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://x');
    let mutated = false;
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, '[REDACTED]');
        mutated = true;
      }
    }
    if (!mutated) return url;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * Request logging middleware. Use res.on('finish') instead of mutating
 * res.end so we don't risk breaking streamed responses or upstream
 * chunk/encoding/callback type quirks.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req as any).id || 'unknown';
  const safeUrl = sanitizeUrl(req.originalUrl);

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: safeUrl,
    ip: req.ip,
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: safeUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
