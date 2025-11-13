import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import feedRoutes from './routes/feed';
import notificationRoutes from './routes/notifications';
import politicalRoutes from './routes/political';
import messageRoutes from './routes/messages';
import verificationRoutes from './routes/verification';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';
import appealsRoutes from './routes/appeals';
import onboardingRoutes from './routes/onboarding';
import electionRoutes from './routes/elections';
import candidateRoutes from './routes/candidates';
import candidateMessagesRoutes from './routes/candidateMessages';
import candidateAdminMessagesRoutes from './routes/candidateAdminMessages';
import unifiedMessagesRoutes from './routes/unifiedMessages';
import candidatePolicyPlatformRoutes from './routes/candidatePolicyPlatform';
import topicRoutes from './routes/topics';
import topicNavigationRoutes from './routes/topicNavigation';
import googleCivicRoutes from './routes/googleCivic';
import feedbackRoutes from './routes/feedback';
import batchRoutes from './routes/batch';
import reputationRoutes from './routes/reputation';
import relationshipRoutes from './routes/relationships';
import healthRoutes from './routes/health';
import crowdsourcingRoutes from './routes/crowdsourcing';
import legislativeRoutes from './routes/legislative';
import civicRoutes from './routes/civic';
import oauthRoutes from './routes/oauth';
import trendingTopicsRoutes from './routes/trendingTopics';
import paymentsRoutes from './routes/payments';
import searchRoutes from './routes/search';
import totpRoutes from './routes/totp';
import candidateVerificationRoutes from './routes/candidateVerification';
import externalCandidatesRoutes from './routes/externalCandidates';
import motdRoutes from './routes/motd';
import badgeRoutes from './routes/badges';
import badgeClaimCodesRoutes from './routes/badgeClaimCodes';
import questRoutes from './routes/quests';
import photosRoutes from './routes/photos';
import WebSocketService from './services/WebSocketService';
import analyticsCleanupJob from './jobs/analyticsCleanup';
import { apiLimiter, burstLimiter } from './middleware/rateLimiting';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler';
import { setupSwagger } from './swagger';
import { metricsService } from './services/metricsService';
import { performanceMiddleware } from './middleware/performanceMonitor';
import { enableRequestLogging, enableApiDocs, getEnvironment } from './utils/environment';
import { verifyCsrf } from './middleware/csrf';
import { requireAuth, requireAdmin } from './middleware/auth';
import visitTrackingMiddleware from './middleware/visitTracking';
import logger from './utils/logger';
import { logger as pinoLogger } from './services/logger';
import { requestLoggingMiddleware } from './middleware/requestLogger';

dotenv.config();

const app = express();

// Configure trust proxy for Azure Container Apps (1 proxy layer)
app.set('trust proxy', 1);

const httpServer = http.createServer(app);

// Configure HTTP keep-alive timeouts to work with Azure Container Apps 30-minute timeout
// Azure Container Apps has a hard-coded 30-minute timeout for HTTP connections
// By setting keep-alive to 25 minutes, Express gracefully closes connections before Azure forcibly terminates them
// This allows frontend to refresh connections smoothly without encountering abrupt closures
httpServer.keepAliveTimeout = 25 * 60 * 1000; // 25 minutes (in milliseconds)
httpServer.headersTimeout = 25 * 60 * 1000 + 1000; // Must be > keepAliveTimeout to prevent race conditions

// Prisma singleton is now imported from lib/prisma.ts to prevent connection leaks
// Previously, 60+ files were each creating their own PrismaClient instance

const PORT = process.env.PORT || 3001;

// Initialize unified WebSocket service
const webSocketService = new WebSocketService(httpServer);

// Export webSocketService for global access (notifications, etc.)
export { webSocketService };

// Enhanced Security Middleware - Enterprise Grade
app.use(helmet({
  // ARCHITECTURE NOTE: Content Security Policy disabled in backend
  // Rationale: Frontend served by Azure Static Web Apps (separate deployment)
  // Backend CSP only applies to API responses (JSON), not user-facing HTML
  // CSP protection provided by frontend meta tag in index.html
  // See: .claude/scratchpads/SECURITY-AUDIT-TRACKING.md for details
  contentSecurityPolicy: false,

  // Keep all other security headers (these DO protect API responses)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Apply burst limiter first (shorter window, catches rapid requests)
app.use(burstLimiter);

// Then apply general API rate limiting (longer window, more permissive)
app.use(apiLimiter);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
if (enableRequestLogging()) {
  console.log('🔒 CORS - Allowed Origins:', allowedOrigins);
}

app.use(cors({
  origin: (origin, callback) => {
    if (enableRequestLogging()) {
      console.log('🔍 CORS - Request from origin:', origin);
    }

    // In development, be more permissive
    if (getEnvironment() === 'development') {
      if (enableRequestLogging()) {
        console.log('✅ CORS - Development mode, allowing all origins');
      }
      callback(null, true);
      return;
    }

    // SECURITY: Strict origin validation using regex to prevent subdomain hijacking
    // Allow: www.unitedwerise.org, dev.unitedwerise.org, admin.unitedwerise.org, etc.
    // Block: evil.unitedwerise.org.attacker.com, unitedwerise.org-phishing.com
    const isUnitedWeRiseOrigin = origin && /^https?:\/\/([a-z0-9-]+\.)?unitedwerise\.org$/.test(origin);
    const isAzureStaticApp = origin && /^https:\/\/[a-z0-9-]+\.azurestaticapps\.net$/.test(origin);

    if (!origin ||
        allowedOrigins.includes(origin) ||
        isAzureStaticApp ||
        isUnitedWeRiseOrigin) {
      if (enableRequestLogging()) {
        console.log('✅ CORS - Origin allowed');
      }
      callback(null, true);
    } else {
      // SECURITY EVENT: Always log blocked origins (potential attack/misconfiguration)
      console.log('❌ CORS - Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-TOTP-Verified', 'X-TOTP-Token', 'X-Recent-Auth', 'X-Dismissal-Token', 'X-CSRF-Token']
}));

// Basic middleware - Apply body parsing only for appropriate content types
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // CRITICAL FIX: Explicitly skip multipart/form-data to prevent stream interference
  if (contentType.includes('multipart/form-data')) {
    console.log('🔧 MULTIPART REQUEST - Skipping body parsing, letting multer handle it');
    return next();
  }

  // Only parse as JSON if content-type indicates JSON
  if (contentType.includes('application/json')) {
    return express.json({ limit: '10mb' })(req, res, next);
  }
  // Only parse URL-encoded if content-type indicates it
  else if (contentType.includes('application/x-www-form-urlencoded')) {
    return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  }
  // For other content types, proceed without body parsing
  else {
    next();
  }
});

// Cookie parsing middleware
app.use(cookieParser());

// Pino request logging middleware (environment-aware)
app.use(requestLoggingMiddleware);

// Legacy request logging (only in development)
if (enableRequestLogging()) {
  app.use(requestLogger);
}

// Metrics middleware (must be early to capture all requests)
app.use(metricsService.requestMetricsMiddleware());

// Performance monitoring middleware
app.use(performanceMiddleware);

// Visitor analytics tracking (must be early to track all pageviews)
app.use(visitTrackingMiddleware);

// CSRF Protection - Apply to all state-changing requests (POST, PUT, DELETE, PATCH)
// Must be after cookie-parser to read CSRF tokens from cookies
// Must be before routes to protect all endpoints
app.use((req, res, next) => {
  // Exempt GET and OPTIONS requests from CSRF protection
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  // Apply CSRF verification to all other methods
  return verifyCsrf(req, res, next);
});

// 🚨 DEBUGGING ROUTE: Test if our backend is being hit
app.get('/api/debug-test', (req, res) => {
  console.log('🎯🎯🎯 DEBUG TEST ENDPOINT HIT!');
  res.json({
    message: 'Debug test successful',
    timestamp: new Date().toISOString(),
    releaseSha: '2ba3d14',
    requestPath: req.path,
    logs: 'If you see this, our backend is working!'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/photos', photosRoutes); // Layer 0: Minimal photo upload
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/political', politicalRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appeals', appealsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/candidate-messages', candidateMessagesRoutes);
app.use('/api/candidate', candidateAdminMessagesRoutes);
app.use('/api/unified-messages', unifiedMessagesRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/topic-navigation', topicNavigationRoutes);
app.use('/api/google-civic', googleCivicRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/crowdsourcing', crowdsourcingRoutes);
app.use('/api/legislative', legislativeRoutes);
app.use('/api/civic', civicRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/trending', trendingTopicsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/totp', totpRoutes);
app.use('/api/candidate-policy-platform', candidatePolicyPlatformRoutes);
app.use('/api/candidate-verification', candidateVerificationRoutes);
app.use('/api/external-candidates', externalCandidatesRoutes);
app.use('/api/motd', motdRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/badges', badgeClaimCodesRoutes);
app.use('/api/quests', questRoutes);
app.use('/health', healthRoutes);

// Serve uploaded photos statically
app.use('/uploads', express.static('uploads'));

// API Documentation
if (enableApiDocs()) {
  setupSwagger(app);
}

// Monitoring endpoints
app.get('/health', async (req, res) => {
  try {
    await prisma.$connect();
    const healthMetrics = metricsService.getHealthMetrics();
    
    // Calculate deployment time from uptime
    const uptimeSeconds = process.uptime();
    const deploymentTime = new Date(Date.now() - (uptimeSeconds * 1000));
    
    res.json({
      ...healthMetrics,
      database: 'Connected',
      websocket: 'Active',
      onlineUsers: webSocketService.getOnlineUsersCount(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.2.1',
      deployedAt: deploymentTime.toISOString(),
      uptime: uptimeSeconds
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'Disconnected',
      websocket: 'Unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// Prometheus metrics endpoint (SECURITY: Admin-only access)
app.get('/metrics', requireAuth, requireAdmin, (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.end(metricsService.getPrometheusMetrics());
});

// JSON metrics endpoint for custom dashboards (SECURITY: Admin-only access)
app.get('/api/metrics', requireAuth, requireAdmin, (req, res) => {
  res.json(metricsService.getJSONMetrics());
});

// Security-focused metrics endpoint (SECURITY: Admin-only access)
app.get('/api/security-metrics', requireAuth, requireAdmin, (req, res) => {
  const metrics = metricsService.getJSONMetrics();
  
  // Extract security-relevant metrics
  const securityMetrics = {
    timestamp: metrics.timestamp,
    authentication: {
      total_attempts: metrics.counters.auth_attempts_total || 0,
      total_failures: metrics.counters.auth_failures_total || 0,
      middleware_success: metrics.counters.auth_middleware_success_total || 0,
      middleware_failures: metrics.counters.auth_middleware_failures_total || 0,
      cookie_auth_success: metrics.counters.cookie_auth_success_total || 0,
      success_rate: metrics.counters.auth_attempts_total ? 
        ((metrics.counters.auth_attempts_total - metrics.counters.auth_failures_total) / metrics.counters.auth_attempts_total * 100).toFixed(2) + '%' : 'N/A'
    },
    csrf_protection: {
      validations_success: metrics.counters.csrf_validations_total || 0,
      failures_total: metrics.counters.csrf_failures_total || 0,
      protection_rate: metrics.counters.csrf_validations_total ? 
        (metrics.counters.csrf_validations_total / (metrics.counters.csrf_validations_total + (metrics.counters.csrf_failures_total || 0)) * 100).toFixed(2) + '%' : 'N/A'
    },
    system: {
      uptime_seconds: metrics.gauges.uptime_seconds,
      active_users: metrics.gauges.active_users,
      total_users: metrics.gauges.total_users,
      suspended_users: metrics.gauges.suspended_users || 0
    },
    deployment: {
      version: process.env.npm_package_version || '1.0.0',
      environment: getEnvironment(),
      security_migration: 'httpOnly cookies + CSRF protection active'
    }
  };
  
  res.json(securityMetrics);
});

// Detailed health check with more information
app.get('/api/health/detailed', async (req, res) => {
  try {
    // Test database connection
    const dbStart = Date.now();
    await prisma.$connect();
    const dbDuration = Date.now() - dbStart;

    // Get system info
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: getEnvironment(),
      database: {
        status: 'connected',
        connectionTime: `${dbDuration}ms`
      },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      websocket: {
        status: 'active'
      },
      metrics: metricsService.getHealthMetrics()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler for proper database connection cleanup
const gracefulShutdown = async () => {
  console.log('Received shutdown signal, closing server gracefully...');

  // Stop cron jobs
  analyticsCleanupJob.stop();

  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close database connections
  try {
    await prisma.$disconnect();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }

  process.exit(0);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Validates that environment configuration is consistent
 * Prevents misconfigured deployments from starting
 * @throws {Error} If environment validation fails
 */
function validateEnvironmentConsistency(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbUrl = process.env.DATABASE_URL || '';

  logger.info('🔍 Validating environment consistency...');

  // Extract database hostname
  let dbHost = '';
  try {
    const url = new URL(dbUrl);
    dbHost = url.hostname;
  } catch (error) {
    logger.error('❌ Invalid DATABASE_URL format');
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate production environment
  if (nodeEnv === 'production') {
    if (dbHost.includes('-dev')) {
      logger.error('❌ CRITICAL: Production environment pointing to development database!');
      logger.error(`   NODE_ENV: ${nodeEnv}`);
      logger.error(`   Database: ${dbHost}`);
      throw new Error('Production NODE_ENV cannot use development database');
    }
  }

  // Validate staging environment
  if (nodeEnv === 'staging') {
    if (!dbHost.includes('-dev')) {
      logger.error('❌ CRITICAL: Staging environment pointing to production database!');
      logger.error(`   NODE_ENV: ${nodeEnv}`);
      logger.error(`   Database: ${dbHost}`);
      throw new Error('Staging NODE_ENV must use development database');
    }
  }

  logger.info('✅ Environment consistency validated');
  logger.info(`   Environment: ${nodeEnv}`);
  logger.info(`   Database: ${dbHost}`);
}

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Initializing services...');

    // Validate environment consistency BEFORE starting services
    validateEnvironmentConsistency();

    // Start cron jobs
    analyticsCleanupJob.start();

    // Start server only after all services are ready
    httpServer.listen(PORT, () => {
      pinoLogger.info(`Server running on port ${PORT}`);
      pinoLogger.info(`WebSocket server active`);
      pinoLogger.info(`Health check: http://localhost:${PORT}/health`);
      pinoLogger.info(`Database connection pool: 10 connections max, 20s timeout`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();