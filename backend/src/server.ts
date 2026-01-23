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
import riseaiRoutes from './routes/riseai';
import communityNotesRoutes from './routes/communityNotes';
import organizationsRoutes from './routes/organizations';
import discussionsRoutes from './routes/discussions';
import questionnairesRoutes from './routes/questionnaires';
import endorsementsRoutes from './routes/endorsements';
import districtsRoutes from './routes/districts';
import devicesRoutes from './routes/devices';
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
pinoLogger.info('Configured trust proxy for Azure Container Apps');

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
  // X-Frame-Options: DENY - Prevents clickjacking attacks
  frameguard: { action: 'deny' },
  // X-Content-Type-Options: nosniff - Prevents MIME type sniffing
  noSniff: true,
  // X-XSS-Protection: 1; mode=block - Legacy XSS protection (deprecated but still useful)
  xssFilter: true,
  // Referrer-Policy: strict-origin-when-cross-origin - Balances privacy with functionality
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Cross-origin policies for API responses
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // X-Permitted-Cross-Domain-Policies: none - Prevents Adobe products from loading data
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// Permissions-Policy header - Controls browser features available to the page
// NOTE: Helmet does not provide Permissions-Policy, so we add it manually
app.use((req, res, next) => {
  // Restrict potentially dangerous browser features
  // - geolocation: Allow only from same origin (users can share location if needed)
  // - microphone/camera: Disabled (not used in this application)
  // - payment: Disabled (payments handled via Stripe redirect, not Payment Request API)
  // - usb/bluetooth: Disabled (not needed)
  // - accelerometer/gyroscope: Disabled (not needed)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), microphone=(), camera=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=()'
  );
  next();
});

// Apply burst limiter first (shorter window, catches rapid requests)
app.use(burstLimiter);

// Then apply general API rate limiting (longer window, more permissive)
app.use(apiLimiter);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
if (enableRequestLogging()) {
  pinoLogger.info({ allowedOrigins }, 'CORS configuration loaded');
}

app.use(cors({
  origin: (origin, callback) => {
    if (enableRequestLogging()) {
      pinoLogger.debug({ origin }, 'CORS request received');
    }

    // In development, be more permissive
    if (getEnvironment() === 'development') {
      if (enableRequestLogging()) {
        pinoLogger.debug({ origin }, 'CORS allowing all origins in development');
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
        pinoLogger.debug({ origin }, 'CORS origin allowed');
      }
      callback(null, true);
    } else {
      // SECURITY EVENT: Always log blocked origins (potential attack/misconfiguration)
      pinoLogger.warn({ origin }, 'CORS origin blocked - potential security event');
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
    pinoLogger.debug({ contentType }, 'Skipping body parsing for multipart request');
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
  pinoLogger.info({ path: req.path, ip: req.ip }, 'Debug test endpoint accessed');
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
app.use('/api/riseai', riseaiRoutes);
app.use('/api/community-notes', communityNotesRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/discussions', discussionsRoutes);
app.use('/api/questionnaires', questionnairesRoutes);
app.use('/api/endorsements', endorsementsRoutes);
app.use('/api/districts', districtsRoutes);
app.use('/api/devices', devicesRoutes);
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
  pinoLogger.info('Received shutdown signal, closing server gracefully');

  // Stop cron jobs
  analyticsCleanupJob.stop();

  // Close HTTP server
  httpServer.close(() => {
    pinoLogger.info('HTTP server closed');
  });

  // Close database connections
  try {
    await prisma.$disconnect();
    pinoLogger.info('Database connections closed');
  } catch (error) {
    pinoLogger.error({ error }, 'Error closing database connections');
  }

  process.exit(0);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    pinoLogger.error({
        err: error,
        stack: error.stack,
        event: 'uncaught_exception'
    }, 'Uncaught exception - initiating shutdown');

    // Give time for logs to flush, then exit
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    pinoLogger.error({
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        event: 'unhandled_rejection'
    }, 'Unhandled promise rejection');

    // Check if this is a critical error that should trigger shutdown
    if (isCriticalError(reason)) {
        pinoLogger.error('Critical unhandled rejection - initiating shutdown');
        setTimeout(() => process.exit(1), 1000);
    }
});

// Helper to determine if an error is critical enough to warrant shutdown
function isCriticalError(error: any): boolean {
    if (error instanceof Error) {
        // Database connection lost
        if (error.message.includes('ECONNREFUSED') ||
            error.message.includes('Connection terminated')) {
            return true;
        }
        // Out of memory
        if (error.message.includes('ENOMEM')) {
            return true;
        }
    }
    return false;
}

// Also add warning for deprecation notices
process.on('warning', (warning: Error) => {
    pinoLogger.warn({
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
        event: 'process_warning'
    }, 'Node.js process warning');
});

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
    pinoLogger.info('Initializing services');

    // Validate environment consistency BEFORE starting services
    validateEnvironmentConsistency();

    // Start cron jobs
    analyticsCleanupJob.start();

    // Start server only after all services are ready
    httpServer.listen(PORT, () => {
      pinoLogger.info({ port: PORT }, 'Server running');
      pinoLogger.info('WebSocket server active');
      pinoLogger.info({ url: `http://localhost:${PORT}/health` }, 'Health check available');
      pinoLogger.info({ maxConnections: 10, timeout: '20s' }, 'Database connection pool configured');
    });
  } catch (error) {
    pinoLogger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();