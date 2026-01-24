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

// Routes
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import erpRoutes from './routes/erpRoutes';
import payrollRoutes from './routes/payrollRoutes';
import reportsRoutes from './routes/reportsRoutes';
import adminRoutes from './routes/adminRoutes';


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

app.use(
  cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV === 'production') {
        if (!origin) {
          return callback(new Error('CORS: Origin required in production'));
        }
        if (allowedOrigins.indexOf(origin) === -1) {
          return callback(new Error('Not allowed by CORS'));
        }
        return callback(null, true);
      } else {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Body parsing and sanitization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody); // Sanitize user inputs

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


// Error handling middleware (must be last)
app.use(errorHandler);

// Export app for testing
export { app };

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
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
