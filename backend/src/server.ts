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
import { initFirebaseAdmin } from './utils/firebaseAdmin';

// Initialize Firebase Admin SDK once on startup. Safe no-op if credentials are absent.
initFirebaseAdmin();

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Don't crash the server on unhandled promise rejections — log and continue
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
import notificationRoutes from './routes/notificationRoutes';
import aiRoutes from './routes/aiRoutes';
import creatorRoutes from './routes/creatorRoutes';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Railway and most production hosts terminate TLS/proxy before Express.
// Trust exactly one proxy hop so req.ip and express-rate-limit use the real
// client IP from X-Forwarded-For without accepting an arbitrary proxy chain.
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.set('trust proxy', 1);
}

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
      // Allow requests with no origin (mobile apps, server-to-server, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Stripe webhook needs raw body for signature verification — mount BEFORE json parsing
import { handleWebhook } from './controllers/subscriptionController';
app.post('/api/subscription/webhook', express.raw({ type: 'application/json' }), handleWebhook as any);

// Body parsing — keep modest since file uploads go through multer (50MB) and
// don't need this codepath. 1MB is plenty for JSON metadata and form fields.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeBody);
app.use(cookieParser());
app.use(performanceMonitor);

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'makeyourmusic-api', timestamp: new Date().toISOString() });
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/creator', creatorRoutes);

// Error handling
app.use(errorHandler);

export { app };

if (process.env.NODE_ENV !== 'test') {
  // Validate critical environment variables on startup
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('MakeYourMusic API started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      cors: allowedOrigins,
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
    } else {
      logger.error('Server startup error', { error: error.message, code: error.code });
    }
    process.exit(1);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      try {
        const { prisma } = await import('./utils/db');
        await prisma.$disconnect();
        logger.info('Database connection closed');
      } catch (e) {
        logger.error('Error disconnecting database', { error: (e as Error).message });
      }
      process.exit(0);
    });
    // Force shutdown after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
