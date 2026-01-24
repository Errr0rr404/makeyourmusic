import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import os from 'os';

/**
 * Health check endpoint with comprehensive system status
 * GET /api/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  // Database connectivity check
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = {
      status: 'connected',
      responseTime: `${Date.now() - startTime}ms`,
    };
  } catch (error: any) {
    health.status = 'degraded';
    health.database = {
      status: 'disconnected',
      error: error.message,
    };
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  health.memory = {
    used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    percentage: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
  };

  // System info
  health.system = {
    platform: os.platform(),
    cpus: os.cpus().length,
    freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
    totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
    loadAverage: os.loadavg(),
  };

  // Response time
  health.responseTime = `${Date.now() - startTime}ms`;

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
};

/**
 * Readiness probe - check if application is ready to serve traffic
 * GET /api/ready
 */
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check if essential environment variables are set
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Missing environment variables',
        missing: missingEnvVars,
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Liveness probe - check if application is alive
 * GET /api/live
 */
export const livenessCheck = (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};
