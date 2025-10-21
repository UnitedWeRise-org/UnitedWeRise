"use strict";
/**
 * Visit Tracking Middleware
 *
 * Automatically tracks all pageviews for analytics purposes.
 * Features:
 * - Tracks authenticated and anonymous visitors
 * - Rate limiting and bot detection
 * - Non-blocking (tracking failures don't affect user experience)
 * - Extracts IP from X-Forwarded-For header (Azure Container Apps proxy)
 *
 * Usage:
 * Add to Express app BEFORE route handlers:
 *   app.use(visitTrackingMiddleware);
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitTrackingMiddleware = visitTrackingMiddleware;
const visitorAnalytics_1 = __importDefault(require("../services/visitorAnalytics"));
/**
 * Extract client IP address from request
 * Handles X-Forwarded-For header from Azure Container Apps proxy
 */
function getClientIP(req) {
    // Check X-Forwarded-For header (Azure Container Apps, nginx, etc.)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // X-Forwarded-For can be comma-separated list, take first IP
        const ips = typeof forwardedFor === 'string' ? forwardedFor.split(',') : forwardedFor;
        return ips[0].trim();
    }
    // Fallback to direct connection IP
    return req.ip || req.socket.remoteAddress || 'unknown';
}
/**
 * Determine if a path should be tracked
 * Excludes health checks, static assets, and admin endpoints
 */
function shouldTrackPath(path) {
    const excludedPaths = [
        '/health',
        '/api/health',
        '/metrics',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
    ];
    const excludedPrefixes = [
        '/static/',
        '/assets/',
        '/_next/', // Next.js
        '/admin/api/', // Admin API endpoints (separate analytics)
    ];
    // Exact match
    if (excludedPaths.includes(path)) {
        return false;
    }
    // Prefix match
    if (excludedPrefixes.some(prefix => path.startsWith(prefix))) {
        return false;
    }
    return true;
}
/**
 * Visit tracking middleware
 * Tracks pageviews asynchronously without blocking the request
 */
async function visitTrackingMiddleware(req, res, next) {
    // Only track GET requests (pageviews, not API actions)
    if (req.method !== 'GET') {
        return next();
    }
    // Skip excluded paths
    if (!shouldTrackPath(req.path)) {
        return next();
    }
    // Extract tracking data
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const path = req.path;
    const referrer = req.headers['referer'] || req.headers['referrer'];
    // Get user ID if authenticated
    const userId = req.user?.userId || null;
    // Track asynchronously (don't block request)
    visitorAnalytics_1.default
        .trackPageView({
        path,
        ip,
        userAgent,
        referrer: typeof referrer === 'string' ? referrer : undefined,
        userId,
    })
        .catch(err => {
        // Log error but don't fail the request
        console.error('[VisitTracking] Error tracking pageview:', err.message);
    });
    // Continue processing request immediately
    next();
}
exports.default = visitTrackingMiddleware;
//# sourceMappingURL=visitTracking.js.map