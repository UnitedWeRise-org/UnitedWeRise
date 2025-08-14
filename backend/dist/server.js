"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const client_1 = require("@prisma/client");
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
const websocket_1 = require("./websocket");
const photoService_1 = require("./services/photoService");
const rateLimiting_1 = require("./middleware/rateLimiting");
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_1 = require("./swagger");
const metricsService_1 = require("./services/metricsService");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Configure trust proxy for Azure Container Apps (1 proxy layer)
app.set('trust proxy', 1);
const httpServer = http_1.default.createServer(app);
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
// Initialize WebSocket server
const io = (0, websocket_1.initializeWebSocket)(httpServer);
// Security Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    crossOriginEmbedderPolicy: false
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler_1.requestLogger);
}
// Metrics middleware (must be early to capture all requests)
app.use(metricsService_1.metricsService.requestMetricsMiddleware());
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
app.use('/api/topics', topics_1.default);
app.use('/api/topic-navigation', topicNavigation_1.default);
app.use('/api/photos', photos_1.default);
app.use('/api/photo-tags', photoTags_1.default);
app.use('/api/google-civic', googleCivic_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/batch', batch_1.default);
app.use('/api/reputation', reputation_1.default);
app.use('/api/relationships', relationships_1.default);
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
        await prisma.$connect();
        const healthMetrics = metricsService_1.metricsService.getHealthMetrics();
        res.json({
            ...healthMetrics,
            database: 'Connected',
            websocket: 'Active',
            timestamp: new Date().toISOString()
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
// Use httpServer instead of app for WebSocket support
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server active`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Photo uploads: enabled with automatic resizing`);
});
//# sourceMappingURL=server.js.map