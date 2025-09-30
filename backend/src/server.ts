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
import photoRoutes from './routes/photos';
import photoTagRoutes from './routes/photoTags';
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
import questRoutes from './routes/quests';
import WebSocketService from './services/WebSocketService';
import { PhotoService } from './services/photoService';
import { apiLimiter, burstLimiter } from './middleware/rateLimiting';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler';
import { setupSwagger } from './swagger';
import { metricsService } from './services/metricsService';
import { performanceMiddleware } from './middleware/performanceMonitor';
import { enableRequestLogging, enableApiDocs, getEnvironment } from './utils/environment';

dotenv.config();

const app = express();

// Configure trust proxy for Azure Container Apps (1 proxy layer)
app.set('trust proxy', 1);

const httpServer = http.createServer(app);

// Prisma singleton is now imported from lib/prisma.ts to prevent connection leaks
// Previously, 60+ files were each creating their own PrismaClient instance

const PORT = process.env.PORT || 3001;

// Initialize unified WebSocket service
const webSocketService = new WebSocketService(httpServer);

// Export webSocketService for global access (notifications, etc.)
export { webSocketService };

// Enhanced Security Middleware - Enterprise Grade
app.use(helmet({
  // Content Security Policy - Prevent XSS and injection attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "data:", "blob:", "local.adguard.org"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "data:",
        "blob:",
        "https://unpkg.com",
        "https://js.stripe.com",
        "local.adguard.org"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // Required for dynamic imports and MapLibre
        "https://unpkg.com",
        "https://js.stripe.com",
        "https://js.hcaptcha.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://googleads.g.doubleclick.net",
        "local.adguard.org"
      ],
      styleSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
        "https://js.stripe.com",
        "local.adguard.org"
      ],
      imgSrc: ["'self'", "data:", "https:", "*.azurestaticapps.net", "*.unitedwerise.org"],
      connectSrc: [
        "'self'",
        "ws:", "wss:", // WebSocket connections
        "https://js.stripe.com", // Stripe API
        "*.azurecontainerapps.io", // Azure backend
        "https://hcaptcha.com", // hCaptcha API
        "https://api.hcaptcha.com",
      ],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"], // Block dangerous plugins
      mediaSrc: ["'self'", "https:"],
      frameSrc: [
        "'self'",
        "https://js.stripe.com", // Stripe checkout frames
        "https://newassets.hcaptcha.com", // hCaptcha frames
        "https://www.googletagmanager.com" // Google Tag Manager
      ],
      workerSrc: ["'self'", "blob:", "data:"], // Required for MapLibre workers
      upgradeInsecureRequests: [], // Force HTTPS in production
    },
  },
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }, // Prevent clickjacking
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // XSS protection
  referrerPolicy: { policy: 'same-origin' }, // Control referrer info
  crossOriginEmbedderPolicy: false, // Keep false for compatibility
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 🚨 FAILSAFE LOGGER - LOGS EVERY REQUEST BEFORE ANY OTHER MIDDLEWARE
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('🆘🆘🆘 FAILSAFE: Request received before all middleware');
  console.log(`🆘 Time: ${timestamp}`);
  console.log(`🆘 Method: ${req.method}`);
  console.log(`🆘 URL: ${req.url}`);
  console.log(`🆘 Path: ${req.path}`);
  console.log(`🆘 Content-Type: ${req.headers['content-type'] || 'none'}`);
  console.log(`🆘 Origin: ${req.headers['origin'] || 'none'}`);
  console.log('🆘🆘🆘');
  next();
});

// Apply burst limiter first (shorter window, catches rapid requests)
app.use(burstLimiter);

// Then apply general API rate limiting (longer window, more permissive)
app.use(apiLimiter);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
console.log('🔒 CORS - Allowed Origins:', allowedOrigins);
app.use(cors({
  origin: (origin, callback) => {
    console.log('🔍 CORS - Request from origin:', origin);
    
    // In development, be more permissive
    if (getEnvironment() === 'development') {
      console.log('✅ CORS - Development mode, allowing all origins');
      callback(null, true);
      return;
    }
    
    // Allow any Azure Static Web Apps origin or unitedwerise.org domain
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.includes('azurestaticapps.net') ||
        origin.includes('unitedwerise.org')) {
      console.log('✅ CORS - Origin allowed');
      callback(null, true);
    } else {
      console.log('❌ CORS - Origin blocked:', origin);
      // TEMPORARY: Allow all origins for debugging file upload issue
      console.log('⚠️ TEMPORARY DEBUG: Allowing blocked origin for file upload debugging');
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-TOTP-Verified', 'X-TOTP-Token', 'X-Recent-Auth', 'X-Dismissal-Token', 'X-CSRF-Token']
}));

// 🚨 CRITICAL DEBUG: Log ALL incoming requests (REMOVE AFTER DEBUGGING)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥');
  console.log(`📥 INCOMING REQUEST: ${timestamp}`);
  console.log(`📥 Method: ${req.method}`);
  console.log(`📥 URL: ${req.url}`);
  console.log(`📥 Path: ${req.path}`);
  console.log(`📥 Content-Type: ${req.headers['content-type'] || 'none'}`);
  console.log(`📥 Content-Length: ${req.headers['content-length'] || 'none'}`);
  console.log(`📥 Origin: ${req.headers['origin'] || 'none'}`);
  console.log(`📥 User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'none'}`);

  // Special attention to photos endpoint
  if (req.path === '/api/photos/upload') {
    console.log('🎯🎯🎯 PHOTOS UPLOAD ENDPOINT HIT!');
    console.log('🎯 Full headers:', JSON.stringify(req.headers, null, 2));
  }

  console.log('📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥📥');
  next();
});

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

// Request logging (only in development)
if (enableRequestLogging()) {
  app.use(requestLogger);
}

// Metrics middleware (must be early to capture all requests)
app.use(metricsService.requestMetricsMiddleware());

// Performance monitoring middleware
app.use(performanceMiddleware);

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
app.use('/api/photos', photoRoutes);
app.use('/api/photo-tags', photoTagRoutes);
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

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.end(metricsService.getPrometheusMetrics());
});

// JSON metrics endpoint for custom dashboards
app.get('/api/metrics', (req, res) => {
  res.json(metricsService.getJSONMetrics());
});

// Security-focused metrics endpoint
app.get('/api/security-metrics', (req, res) => {
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

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Initializing services...');

    // Initialize photo service and Azure Blob Storage - MUST complete before accepting requests
    await PhotoService.initializeDirectories();
    console.log('✅ Photo service initialized');

    // Start server only after all services are ready
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ WebSocket server active`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`✅ Photo uploads: enabled with automatic resizing`);
      console.log(`✅ Database connection pool: 10 connections max, 20s timeout`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();