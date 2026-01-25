// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { securityHeaders, validateEnv, requestId } from './middleware/security';
import { sanitizeBody } from './middleware/validation';
import { performanceMonitor } from './middleware/performance';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';
import { initSocketServer } from './socket';

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});


// Routes
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import erpRoutes from './routes/erpRoutes';
import payrollRoutes from './routes/payrollRoutes';
import reportsRoutes from './routes/reportsRoutes';
import adminRoutes from './routes/adminRoutes';
import searchRoutes from './routes/searchRoutes';


// Validate environment variables on startup
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
  } catch (error) {
    logger.error('Environment validation failed', { error: (error as Error).message });
    process.exit(1);
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security middleware (must be first)
app.use(securityHeaders);
app.use(requestId);

// Request logging (after security but before routes)
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : ['http://localhost:3000'];

// Log allowed origins for debugging
logger.info('CORS configuration', { 
  allowedOrigins,
  frontendUrl: process.env.FRONTEND_URL 
});

// CORS middleware - must be before body parsing and rate limiting
app.use(
  cors({
    origin: (origin, callback) => {
      try {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
        if (!origin) {
          return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // Log blocked origin for debugging
          logger.warn('CORS blocked origin', { 
            origin, 
            allowedOrigins,
            frontendUrl: process.env.FRONTEND_URL 
          });
          // Return false instead of throwing error to avoid 500
          callback(null, false);
        }
      } catch (error) {
        // Catch any errors in CORS callback to prevent 500
        logger.error('CORS callback error', { error: error instanceof Error ? error.message : String(error) });
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Cache preflight requests for 24 hours
    preflightContinue: false, // Let CORS handle preflight
  })
);

// Body parsing and sanitization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody); // Sanitize user inputs (skips OPTIONS internally)

// Cookie parser
app.use(cookieParser());

// Performance monitoring
app.use(performanceMonitor);

// Rate limiting
app.use('/api', apiLimiter);

// Health check routes (before rate limiting)
app.use('/api', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);


// Error handling middleware (must be last)
app.use(errorHandler);

// Export app for testing
export { app };

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = initSocketServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err.message });
        process.exit(1);
      }
      logger.info('Server closed. Exiting process.');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
