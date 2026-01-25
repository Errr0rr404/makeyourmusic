// Monitoring Controller for system health and metrics
import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';

// Get system health metrics
export const getSystemHealth = async (_req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'unhealthy';
    }

    return res.json(health);
  } catch (error) {
    return next(error);
  }
};

// Get system metrics
export const getSystemMetrics = async (_req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };

    return res.json(metrics);
  } catch (error) {
    return next(error);
  }
};
