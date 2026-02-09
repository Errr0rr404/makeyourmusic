import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { securityHeaders, requestId } from './middleware/security';
import { sanitizeBody } from './middleware/validation';
import { performanceMonitor } from './middleware/performance';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';

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
import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/agentRoutes';
import trackRoutes from './routes/trackRoutes';
import socialRoutes from './routes/socialRoutes';
import adminRoutes from './routes/adminRoutes';
import genreRoutes from './routes/genreRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import uploadRoutes from './routes/uploadRoutes';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security middleware
app.use(securityHeaders);
app.use(requestId);

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(sanitizeBody);
app.use(cookieParser());
app.use(performanceMonitor);

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'morlo-api', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(errorHandler);

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('Morlo.ai API started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });
  });

  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
