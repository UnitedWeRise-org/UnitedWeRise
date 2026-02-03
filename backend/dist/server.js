"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const prisma_1 = require("./lib/prisma");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const posts_1 = __importDefault(require("./routes/posts"));
const feed_1 = __importDefault(require("./routes/feed"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const political_1 = __importDefault(require("./routes/political"));
const messages_1 = __importDefault(require("./routes/messages"));
const verification_1 = __importDefault(require("./routes/verification"));
const moderation_1 = __importDefault(require("./routes/moderation"));
const admin_1 = __importDefault(require("./routes/admin"));
const appeals_1 = __importDefault(require("./routes/appeals"));
const onboarding_1 = __importDefault(require("./routes/onboarding"));
const elections_1 = __importDefault(require("./routes/elections"));
const candidates_1 = __importDefault(require("./routes/candidates"));
const candidateMessages_1 = __importDefault(require("./routes/candidateMessages"));
const candidateAdminMessages_1 = __importDefault(require("./routes/candidateAdminMessages"));
const unifiedMessages_1 = __importDefault(require("./routes/unifiedMessages"));
const candidatePolicyPlatform_1 = __importDefault(require("./routes/candidatePolicyPlatform"));
const topics_1 = __importDefault(require("./routes/topics"));
const topicNavigation_1 = __importDefault(require("./routes/topicNavigation"));
const googleCivic_1 = __importDefault(require("./routes/googleCivic"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const batch_1 = __importDefault(require("./routes/batch"));
const reputation_1 = __importDefault(require("./routes/reputation"));
const relationships_1 = __importDefault(require("./routes/relationships"));
const health_1 = __importDefault(require("./routes/health"));
const crowdsourcing_1 = __importDefault(require("./routes/crowdsourcing"));
const legislative_1 = __importDefault(require("./routes/legislative"));
const civic_1 = __importDefault(require("./routes/civic"));
const oauth_1 = __importDefault(require("./routes/oauth"));
const trendingTopics_1 = __importDefault(require("./routes/trendingTopics"));
const payments_1 = __importDefault(require("./routes/payments"));
const search_1 = __importDefault(require("./routes/search"));
const totp_1 = __importDefault(require("./routes/totp"));
const candidateVerification_1 = __importDefault(require("./routes/candidateVerification"));
const externalCandidates_1 = __importDefault(require("./routes/externalCandidates"));
const motd_1 = __importDefault(require("./routes/motd"));
const badges_1 = __importDefault(require("./routes/badges"));
const badgeClaimCodes_1 = __importDefault(require("./routes/badgeClaimCodes"));
const quests_1 = __importDefault(require("./routes/quests"));
const photos_1 = __importDefault(require("./routes/photos"));
const riseai_1 = __importDefault(require("./routes/riseai"));
const communityNotes_1 = __importDefault(require("./routes/communityNotes"));
const organizations_1 = __importDefault(require("./routes/organizations"));
const discussions_1 = __importDefault(require("./routes/discussions"));
const questionnaires_1 = __importDefault(require("./routes/questionnaires"));
const endorsements_1 = __importDefault(require("./routes/endorsements"));
const districts_1 = __importDefault(require("./routes/districts"));
const devices_1 = __importDefault(require("./routes/devices"));
const videos_1 = __importDefault(require("./routes/videos"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const mediaServices_1 = __importDefault(require("./routes/webhooks/mediaServices"));
const coconut_1 = __importDefault(require("./routes/webhooks/coconut"));
const WebSocketService_1 = __importDefault(require("./services/WebSocketService"));
const analyticsCleanup_1 = __importDefault(require("./jobs/analyticsCleanup"));
const scheduledVideoPublishJob_1 = __importDefault(require("./jobs/scheduledVideoPublishJob"));
const videoEncodingWorker_1 = require("./workers/videoEncodingWorker");
const rateLimiting_1 = require("./middleware/rateLimiting");
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_1 = require("./swagger");
const metricsService_1 = require("./services/metricsService");
const performanceMonitor_1 = require("./middleware/performanceMonitor");
const environment_1 = require("./utils/environment");
const csrf_1 = require("./middleware/csrf");
const auth_2 = require("./middleware/auth");
const visitTracking_1 = __importDefault(require("./middleware/visitTracking"));
const logger_1 = __importDefault(require("./utils/logger"));
const logger_2 = require("./services/logger");
const requestLogger_1 = require("./middleware/requestLogger");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Configure trust proxy for Azure Container Apps (1 proxy layer)
app.set('trust proxy', 1);
logger_2.logger.info('Configured trust proxy for Azure Container Apps');
const httpServer = http_1.default.createServer(app);
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
const webSocketService = new WebSocketService_1.default(httpServer);
exports.webSocketService = webSocketService;
// Enhanced Security Middleware - Enterprise Grade
app.use((0, helmet_1.default)({
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
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=()');
    next();
});
// Apply burst limiter first (shorter window, catches rapid requests)
app.use(rateLimiting_1.burstLimiter);
// Then apply general API rate limiting (longer window, more permissive)
app.use(rateLimiting_1.apiLimiter);
// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
if ((0, environment_1.enableRequestLogging)()) {
    logger_2.logger.info({ allowedOrigins }, 'CORS configuration loaded');
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if ((0, environment_1.enableRequestLogging)()) {
            logger_2.logger.debug({ origin }, 'CORS request received');
        }
        // In development, be more permissive
        if ((0, environment_1.getEnvironment)() === 'development') {
            if ((0, environment_1.enableRequestLogging)()) {
                logger_2.logger.debug({ origin }, 'CORS allowing all origins in development');
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
            if ((0, environment_1.enableRequestLogging)()) {
                logger_2.logger.debug({ origin }, 'CORS origin allowed');
            }
            callback(null, true);
        }
        else {
            // SECURITY EVENT: Always log blocked origins (potential attack/misconfiguration)
            logger_2.logger.warn({ origin }, 'CORS origin blocked - potential security event');
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-TOTP-Verified', 'X-TOTP-Token', 'X-Recent-Auth', 'X-Dismissal-Token', 'X-CSRF-Token']
}));
// Basic middleware - Apply body parsing only for appropriate content types
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    // CRITICAL FIX: Explicitly skip multipart/form-data to prevent stream interference
    if (contentType.includes('multipart/form-data')) {
        logger_2.logger.debug({ contentType }, 'Skipping body parsing for multipart request');
        return next();
    }
    // Only parse as JSON if content-type indicates JSON
    if (contentType.includes('application/json')) {
        return express_1.default.json({ limit: '10mb' })(req, res, next);
    }
    // Only parse URL-encoded if content-type indicates it
    else if (contentType.includes('application/x-www-form-urlencoded')) {
        return express_1.default.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    }
    // For other content types, proceed without body parsing
    else {
        next();
    }
});
// Cookie parsing middleware
app.use((0, cookie_parser_1.default)());
// Pino request logging middleware (environment-aware)
app.use(requestLogger_1.requestLoggingMiddleware);
// Legacy request logging (only in development)
if ((0, environment_1.enableRequestLogging)()) {
    app.use(errorHandler_1.requestLogger);
}
// Metrics middleware (must be early to capture all requests)
app.use(metricsService_1.metricsService.requestMetricsMiddleware());
// Performance monitoring middleware
app.use(performanceMonitor_1.performanceMiddleware);
// Visitor analytics tracking (must be early to track all pageviews)
app.use(visitTracking_1.default);
// CSRF Protection - Apply to all state-changing requests (POST, PUT, DELETE, PATCH)
// Must be after cookie-parser to read CSRF tokens from cookies
// Must be before routes to protect all endpoints
app.use((req, res, next) => {
    // Exempt GET and OPTIONS requests from CSRF protection
    if (req.method === 'GET' || req.method === 'OPTIONS') {
        return next();
    }
    // Apply CSRF verification to all other methods
    return (0, csrf_1.verifyCsrf)(req, res, next);
});
// 🚨 DEBUGGING ROUTE: Test if our backend is being hit
app.get('/api/debug-test', (req, res) => {
    logger_2.logger.info({ path: req.path, ip: req.ip }, 'Debug test endpoint accessed');
    res.json({
        message: 'Debug test successful',
        timestamp: new Date().toISOString(),
        releaseSha: '2ba3d14',
        requestPath: req.path,
        logs: 'If you see this, our backend is working!'
    });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/photos', photos_1.default); // Layer 0: Minimal photo upload
app.use('/api/posts', posts_1.default);
app.use('/api/feed', feed_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/political', political_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/verification', verification_1.default);
app.use('/api/moderation', moderation_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/appeals', appeals_1.default);
app.use('/api/onboarding', onboarding_1.default);
app.use('/api/elections', elections_1.default);
app.use('/api/candidates', candidates_1.default);
app.use('/api/candidate-messages', candidateMessages_1.default);
app.use('/api/candidate', candidateAdminMessages_1.default);
app.use('/api/unified-messages', unifiedMessages_1.default);
app.use('/api/topics', topics_1.default);
app.use('/api/topic-navigation', topicNavigation_1.default);
app.use('/api/google-civic', googleCivic_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/batch', batch_1.default);
app.use('/api/reputation', reputation_1.default);
app.use('/api/relationships', relationships_1.default);
app.use('/api/crowdsourcing', crowdsourcing_1.default);
app.use('/api/legislative', legislative_1.default);
app.use('/api/civic', civic_1.default);
app.use('/api/oauth', oauth_1.default);
app.use('/api/trending', trendingTopics_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/search', search_1.default);
app.use('/api/totp', totp_1.default);
app.use('/api/candidate-policy-platform', candidatePolicyPlatform_1.default);
app.use('/api/candidate-verification', candidateVerification_1.default);
app.use('/api/external-candidates', externalCandidates_1.default);
app.use('/api/motd', motd_1.default);
app.use('/api/badges', badges_1.default);
app.use('/api/badges', badgeClaimCodes_1.default);
app.use('/api/quests', quests_1.default);
app.use('/api/riseai', riseai_1.default);
app.use('/api/community-notes', communityNotes_1.default);
app.use('/api/organizations', organizations_1.default);
app.use('/api/discussions', discussions_1.default);
app.use('/api/questionnaires', questionnaires_1.default);
app.use('/api/endorsements', endorsements_1.default);
app.use('/api/districts', districts_1.default);
app.use('/api/devices', devices_1.default);
app.use('/api/videos', videos_1.default);
app.use('/api/track', tracking_1.default);
app.use('/webhooks/media-services', mediaServices_1.default);
app.use('/webhooks/coconut', coconut_1.default);
app.use('/health', health_1.default);
// Serve uploaded photos statically
app.use('/uploads', express_1.default.static('uploads'));
// API Documentation
if ((0, environment_1.enableApiDocs)()) {
    (0, swagger_1.setupSwagger)(app);
}
// Monitoring endpoints
app.get('/health', async (req, res) => {
    try {
        await prisma_1.prisma.$connect();
        const healthMetrics = metricsService_1.metricsService.getHealthMetrics();
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
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'Disconnected',
            websocket: 'Unknown',
            timestamp: new Date().toISOString()
        });
    }
});
// Prometheus metrics endpoint (SECURITY: Admin-only access)
app.get('/metrics', auth_2.requireAuth, auth_2.requireAdmin, (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(metricsService_1.metricsService.getPrometheusMetrics());
});
// JSON metrics endpoint for custom dashboards (SECURITY: Admin-only access)
app.get('/api/metrics', auth_2.requireAuth, auth_2.requireAdmin, (req, res) => {
    res.json(metricsService_1.metricsService.getJSONMetrics());
});
// Security-focused metrics endpoint (SECURITY: Admin-only access)
app.get('/api/security-metrics', auth_2.requireAuth, auth_2.requireAdmin, (req, res) => {
    const metrics = metricsService_1.metricsService.getJSONMetrics();
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
            environment: (0, environment_1.getEnvironment)(),
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
        await prisma_1.prisma.$connect();
        const dbDuration = Date.now() - dbStart;
        // Get system info
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: (0, environment_1.getEnvironment)(),
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
            metrics: metricsService_1.metricsService.getHealthMetrics()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Error handling middleware (must be last)
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Graceful shutdown handler for proper database connection cleanup
const gracefulShutdown = async () => {
    logger_2.logger.info('Received shutdown signal, closing server gracefully');
    // Stop cron jobs
    analyticsCleanup_1.default.stop();
    scheduledVideoPublishJob_1.default.stop();
    // Stop video encoding worker
    videoEncodingWorker_1.videoEncodingWorker.stop().catch((error) => {
        logger_2.logger.error({ error }, 'Error stopping video encoding worker');
    });
    // Close HTTP server
    httpServer.close(() => {
        logger_2.logger.info('HTTP server closed');
    });
    // Close database connections
    try {
        await prisma_1.prisma.$disconnect();
        logger_2.logger.info('Database connections closed');
    }
    catch (error) {
        logger_2.logger.error({ error }, 'Error closing database connections');
    }
    process.exit(0);
};
// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_2.logger.error({
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
process.on('unhandledRejection', (reason, promise) => {
    logger_2.logger.error({
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        event: 'unhandled_rejection'
    }, 'Unhandled promise rejection');
    // Check if this is a critical error that should trigger shutdown
    if (isCriticalError(reason)) {
        logger_2.logger.error('Critical unhandled rejection - initiating shutdown');
        setTimeout(() => process.exit(1), 1000);
    }
});
// Helper to determine if an error is critical enough to warrant shutdown
function isCriticalError(error) {
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
process.on('warning', (warning) => {
    logger_2.logger.warn({
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
function validateEnvironmentConsistency() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const dbUrl = process.env.DATABASE_URL || '';
    logger_1.default.info('🔍 Validating environment consistency...');
    // Extract database hostname
    let dbHost = '';
    try {
        const url = new URL(dbUrl);
        dbHost = url.hostname;
    }
    catch (error) {
        logger_1.default.error('❌ Invalid DATABASE_URL format');
        throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    // Validate production environment
    if (nodeEnv === 'production') {
        if (dbHost.includes('-dev')) {
            logger_1.default.error('❌ CRITICAL: Production environment pointing to development database!');
            logger_1.default.error(`   NODE_ENV: ${nodeEnv}`);
            logger_1.default.error(`   Database: ${dbHost}`);
            throw new Error('Production NODE_ENV cannot use development database');
        }
    }
    // Validate staging environment
    if (nodeEnv === 'staging') {
        if (!dbHost.includes('-dev')) {
            logger_1.default.error('❌ CRITICAL: Staging environment pointing to production database!');
            logger_1.default.error(`   NODE_ENV: ${nodeEnv}`);
            logger_1.default.error(`   Database: ${dbHost}`);
            throw new Error('Staging NODE_ENV must use development database');
        }
    }
    logger_1.default.info('✅ Environment consistency validated');
    logger_1.default.info(`   Environment: ${nodeEnv}`);
    logger_1.default.info(`   Database: ${dbHost}`);
}
// Initialize services and start server
async function startServer() {
    try {
        logger_2.logger.info('Initializing services');
        // Validate environment consistency BEFORE starting services
        validateEnvironmentConsistency();
        // Start cron jobs
        analyticsCleanup_1.default.start();
        scheduledVideoPublishJob_1.default.start();
        // Start video encoding worker
        videoEncodingWorker_1.videoEncodingWorker.start().catch((error) => {
            logger_2.logger.error({ error }, 'Failed to start video encoding worker');
        });
        // Start server only after all services are ready
        httpServer.listen(PORT, () => {
            logger_2.logger.info({ port: PORT }, 'Server running');
            logger_2.logger.info('WebSocket server active');
            logger_2.logger.info({ url: `http://localhost:${PORT}/health` }, 'Health check available');
            logger_2.logger.info({ maxConnections: 10, timeout: '20s' }, 'Database connection pool configured');
        });
    }
    catch (error) {
        logger_2.logger.fatal({ error }, 'Failed to start server');
        process.exit(1);
    }
}
// Start the server
startServer();
//# sourceMappingURL=server.js.map