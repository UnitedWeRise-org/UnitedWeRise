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
const photos_1 = __importDefault(require("./routes/photos"));
const photoTags_1 = __importDefault(require("./routes/photoTags"));
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
const WebSocketService_1 = __importDefault(require("./services/WebSocketService"));
const photoService_1 = require("./services/photoService");
const rateLimiting_1 = require("./middleware/rateLimiting");
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_1 = require("./swagger");
const metricsService_1 = require("./services/metricsService");
const performanceMonitor_1 = require("./middleware/performanceMonitor");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Configure trust proxy for Azure Container Apps (1 proxy layer)
app.set('trust proxy', 1);
const httpServer = http_1.default.createServer(app);
// Prisma singleton is now imported from lib/prisma.ts to prevent connection leaks
// Previously, 60+ files were each creating their own PrismaClient instance
const PORT = process.env.PORT || 3001;
// Initialize unified WebSocket service
const webSocketService = new WebSocketService_1.default(httpServer);
exports.webSocketService = webSocketService;
// Enhanced Security Middleware - Enterprise Grade
app.use((0, helmet_1.default)({
    // Content Security Policy - Prevent XSS and injection attacks
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://js.stripe.com"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline scripts - TODO: remove with nonce implementation
                "https://unpkg.com",
                "https://js.stripe.com/v3/", // Stripe payment processing
                "https://www.googletagmanager.com", // Analytics (if used)
            ],
            imgSrc: ["'self'", "data:", "https:", "*.azurestaticapps.net", "*.unitedwerise.org"],
            connectSrc: [
                "'self'",
                "ws:", "wss:", // WebSocket connections
                "https://js.stripe.com", // Stripe API
                "*.azurecontainerapps.io", // Azure backend
            ],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"], // Block dangerous plugins
            mediaSrc: ["'self'", "https:"],
            frameSrc: ["'self'", "https://js.stripe.com"], // Stripe checkout frames
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
// Apply burst limiter first (shorter window, catches rapid requests)
app.use(rateLimiting_1.burstLimiter);
// Then apply general API rate limiting (longer window, more permissive)
app.use(rateLimiting_1.apiLimiter);
// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
console.log('🔒 CORS - Allowed Origins:', allowedOrigins);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        console.log('🔍 CORS - Request from origin:', origin);
        // In development, be more permissive
        if (process.env.NODE_ENV === 'development') {
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
        }
        else {
            console.log('❌ CORS - Origin blocked:', origin);
            callback(null, false); // Don't throw error, just reject
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-TOTP-Verified', 'X-TOTP-Token', 'X-Recent-Auth', 'X-Dismissal-Token', 'X-CSRF-Token']
}));
// Basic middleware - Apply JSON parsing only when content-type is application/json
app.use((req, res, next) => {
    // Check if this is actually a JSON request
    const contentType = req.headers['content-type'] || '';
    // Only parse as JSON if content-type indicates JSON
    if (contentType.includes('application/json')) {
        express_1.default.json({ limit: '10mb' })(req, res, next);
    }
    else {
        // Skip JSON parsing for multipart and other content types
        next();
    }
});
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parsing middleware
app.use((0, cookie_parser_1.default)());
// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler_1.requestLogger);
}
// Metrics middleware (must be early to capture all requests)
app.use(metricsService_1.metricsService.requestMetricsMiddleware());
// Performance monitoring middleware
app.use(performanceMonitor_1.performanceMiddleware);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
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
app.use('/api/photos', photos_1.default);
app.use('/api/photo-tags', photoTags_1.default);
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
app.use('/health', health_1.default);
// Serve uploaded photos statically
app.use('/uploads', express_1.default.static('uploads'));
// API Documentation
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
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
// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(metricsService_1.metricsService.getPrometheusMetrics());
});
// JSON metrics endpoint for custom dashboards
app.get('/api/metrics', (req, res) => {
    res.json(metricsService_1.metricsService.getJSONMetrics());
});
// Security-focused metrics endpoint
app.get('/api/security-metrics', (req, res) => {
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
            environment: process.env.NODE_ENV || 'development',
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
            environment: process.env.NODE_ENV || 'development',
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
// Initialize photo service directories
photoService_1.PhotoService.initializeDirectories().catch(console.error);
// Graceful shutdown handler for proper database connection cleanup
const gracefulShutdown = async () => {
    console.log('Received shutdown signal, closing server gracefully...');
    // Close HTTP server
    httpServer.close(() => {
        console.log('HTTP server closed');
    });
    // Close database connections
    try {
        await prisma_1.prisma.$disconnect();
        console.log('Database connections closed');
    }
    catch (error) {
        console.error('Error closing database connections:', error);
    }
    process.exit(0);
};
// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Use httpServer instead of app for WebSocket support
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server active`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Photo uploads: enabled with automatic resizing`);
    console.log(`Database connection pool: 10 connections max, 20s timeout`);
});
//# sourceMappingURL=server.js.map