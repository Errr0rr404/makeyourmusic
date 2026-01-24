import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  method: string;
  url: string;
  statusCode?: number;
}

// Extend Request type to include performance metrics
declare global {
  namespace Express {
    interface Request {
      performance?: PerformanceMetrics;
    }
  }
}

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  req.performance = {
    startTime,
    method: req.method,
    url: req.url,
  };

  // Log when response finishes
  res.on('finish', () => {
    if (req.performance) {
      req.performance.endTime = Date.now();
      req.performance.duration = req.performance.endTime - req.performance.startTime;
      req.performance.statusCode = res.statusCode;

      const { method, url, duration, statusCode } = req.performance;

      // Log slow requests (> 1 second)
      if (duration && duration > 1000) {
        logger.warn('Slow request detected', {
          method,
          url,
          duration: `${duration}ms`,
          statusCode,
        });
      }

      // Log very slow requests (> 3 seconds)
      if (duration && duration > 3000) {
        logger.error('Very slow request detected', {
          method,
          url,
          duration: `${duration}ms`,
          statusCode,
        });
      }

      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development' && duration) {
        logger.debug('Request performance', {
          method,
          url,
          duration: `${duration}ms`,
          statusCode,
        });
      }
    }
  });

  next();
};
