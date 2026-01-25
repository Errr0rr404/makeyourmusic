import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Request logging middleware
 * Logs all incoming requests with details for debugging and monitoring
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req as any).id || 'unknown';

  // Log the incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
  });

  // Override res.end to capture response time and status
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;

    // Log the response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    // Call the original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};
