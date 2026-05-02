import dotenv from 'dotenv';
dotenv.config();

// Sentry must be imported before everything else so its instrumentation
// hooks attach to express, http, and fetch. Init is gated on SENTRY_DSN —
// when unset, this is effectively a no-op import.
import { initSentry, captureException } from './utils/sentry';
initSentry();

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { securityHeaders, requestId, validateEnv } from './middleware/security';
import { sanitizeBody } from './middleware/validation';
import { performanceMonitor } from './middleware/performance';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';
import { initFirebaseAdmin } from './utils/firebaseAdmin';

// Validate critical environment variables before doing anything else. Catches
// shipping the literal placeholder JWT_SECRET=your-secret-key-change-in-production
// at boot rather than after a token has been minted.
validateEnv();

// Initialize Firebase Admin SDK once on startup. Safe no-op if credentials are absent.
initFirebaseAdmin();

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  captureException(error, { source: 'uncaughtException' });
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  captureException(reason, { source: 'unhandledRejection' });
  // Treat as fatal — Node's default since v15. A rejected Prisma transaction
  // or half-applied state mutation can leave the process running with stale
  // pool connections, mid-transaction locks, or torn caches; better to crash
  // and let the process supervisor restart cleanly. Match the uncaughtException
  // exit pattern (1s for log flush) so we get the same diagnostic output.
  setTimeout(() => process.exit(1), 1000);
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
import takedownRoutes from './routes/takedownRoutes';
import recommendationsRoutes from './routes/recommendationsRoutes';
import licenseRoutes from './routes/licenseRoutes';
import referralRoutes from './routes/referralRoutes';
import publicApiRoutes from './routes/publicApiRoutes';
import publicEmbedRoutes from './routes/publicEmbedRoutes';
import nicheRoutes from './routes/nicheRoutes';
import clipRoutes from './routes/clipRoutes';
import partyRoutes from './routes/partyRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import discordRoutes from './routes/discordRoutes';
import distributionRoutes from './routes/distributionRoutes';
import musicVideoRoutes from './routes/musicVideoRoutes';
import djRoutes from './routes/djRoutes';
import agentTrainingRoutes from './routes/agentTrainingRoutes';
import voiceCreateRoutes from './routes/voiceCreateRoutes';
import oauthRoutes from './routes/oauthRoutes';
import developerAppRoutes from './routes/developerAppRoutes';
import remixRoutes from './routes/remixRoutes';
import voiceCloneRoutes from './routes/voiceCloneRoutes';
import spotifyImportRoutes from './routes/spotifyImportRoutes';
import privacyRoutes from './routes/privacyRoutes';
import searchRoutes from './routes/searchRoutes';

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
const env = process.env.NODE_ENV || 'development';
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl && env === 'production') {
  throw new Error('FRONTEND_URL environment variable is required in production');
}
const allowedOrigins = frontendUrl
  ? frontendUrl.split(',').map((url) => url.trim())
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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
    // Expose request/cache/rate-limit metadata so the frontend can surface
    // them. Authorization is intentionally NOT exposed — the server should
    // never echo bearer tokens back in headers.
    exposedHeaders: [
      'Content-Type',
      'X-Request-ID',
      'X-Cache',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
    ],
    maxAge: 86400,
  })
);

// Stripe webhook needs raw body for signature verification — mount BEFORE json parsing.
// Apply a dedicated rate limiter so an attacker spamming unsigned POSTs can't
// burn CPU on constructEvent and starve legitimate traffic. Stripe production
// retries are well under this rate; raise if you see legitimate retries
// getting limited.
import { handleWebhook } from './controllers/subscriptionController';
import rateLimit from 'express-rate-limit';
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Webhook rate limit exceeded.',
});
app.post(
  '/api/subscription/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  handleWebhook as any,
);

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
app.use('/api/takedowns', takedownRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/v1', publicApiRoutes);
app.use('/embed', publicEmbedRoutes);
app.use('/api/niches', nicheRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/integrations/discord', discordRoutes);
app.use('/api/admin/distributions', distributionRoutes);
app.use('/api/ai/music-video', musicVideoRoutes);
app.use('/api/dj', djRoutes);
app.use('/api/agent-training', agentTrainingRoutes);
app.use('/api/ai/voice-create', voiceCreateRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/developers', developerAppRoutes);
app.use('/api/remixes', remixRoutes);
app.use('/api/voice-clones', voiceCloneRoutes);
app.use('/api/spotify-imports', spotifyImportRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/search', searchRoutes);

// 404 handler for unmatched routes — keep before errorHandler so
// unhandled paths return a clean JSON response instead of leaking
// Express's default HTML "Cannot GET /..." page.
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

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

  // Wrap Express in an http.Server so Socket.IO can attach to the same port.
  // Socket.IO sets its own listeners on the upgrade event; without this it
  // would need a separate port (which Railway one-port deploys can't expose).
  const server = http.createServer(app);
  // Lazy-import the realtime layer so tests / scripts that import server.ts
  // for the express app don't pay the socket.io startup cost.
  void import('./realtime').then(({ attachSocketIo }) => attachSocketIo(server)).catch((err) => {
    logger.warn('Failed to attach Socket.IO', { error: (err as Error).message });
  });
  server.listen(PORT, '0.0.0.0', () => {
    logger.info('MakeYourMusic API started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      cors: allowedOrigins,
    });
    // Lazy-import to avoid loading cron utilities in unit tests.
    void import('./utils/cronTick').then(({ startCron }) => startCron()).catch((err) => {
      logger.warn('Failed to start cron', { error: (err as Error).message });
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
    // Force shutdown after 10s if graceful shutdown hangs. .unref() so the
    // timer doesn't keep the event loop alive when the close completes early.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
