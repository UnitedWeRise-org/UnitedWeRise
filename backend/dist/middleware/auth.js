"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStagingAuth = exports.requireAdmin = exports.requireAuth = void 0;
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../utils/auth");
;
const sessionManager_1 = require("../services/sessionManager");
const metricsService_1 = require("../services/metricsService");
const environment_1 = require("../utils/environment");
const requireAuth = async (req, res, next) => {
    try {
        // 🔍 LAYER 5 DEBUG: Authentication middleware entry
        console.log('🔍 LAYER 5 | Authentication | Starting auth check:', {
            path: req.path,
            hasCookie: !!req.cookies?.authToken,
            hasAuthHeader: !!req.header('Authorization')
        });
        // Get token from cookie first, fallback to header for transition period
        let token = req.cookies?.authToken;
        // Fallback for migration period
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        if (!token) {
            metricsService_1.metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'no_token' });
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded) {
            metricsService_1.metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'invalid_token' });
            return res.status(401).json({ error: 'Invalid token.' });
        }
        // Check if token is blacklisted
        const tokenId = `${decoded.userId}_${token.slice(-10)}`; // Use last 10 chars as token ID
        if (await sessionManager_1.sessionManager.isTokenBlacklisted(tokenId)) {
            return res.status(401).json({ error: 'Token has been revoked.' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }
        req.user = user;
        // 🔍 LAYER 5 DEBUG: Authentication successful
        console.log('🔍 LAYER 5 | Authentication | User authenticated:', {
            userId: user.id,
            username: user.username
        });
        // Record successful authentication
        metricsService_1.metricsService.incrementCounter('auth_middleware_success_total', {
            method: req.cookies?.authToken ? 'cookie' : 'header'
        });
        // Update user's lastSeenAt, but only if it's been more than 5 minutes since last update to avoid database spam
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        // Only update if user hasn't been seen recently (batch updates to reduce DB load)
        if (!user.lastSeenAt || user.lastSeenAt < fiveMinutesAgo) {
            // CRITICAL FIX: Properly await and handle database operation to prevent uncaught promise rejections
            try {
                await prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: { lastSeenAt: now }
                });
            }
            catch (error) {
                // Log but don't fail the request if lastSeenAt update fails
                console.error('Failed to update lastSeenAt:', error);
            }
        }
        // Update session activity if available
        const sessionId = req.header('X-Session-ID');
        if (sessionId) {
            try {
                await sessionManager_1.sessionManager.updateSessionActivity(sessionId);
            }
            catch (error) {
                // Log but don't fail the request if session update fails
                console.error('Failed to update session activity:', error);
            }
        }
        // Check if development environment requires admin access for specific routes
        if ((0, environment_1.isDevelopment)() && !req.user?.isAdmin) {
            // Define admin-only routes for staging environment
            const adminOnlyInStaging = [
                '/api/admin/', '/api/motd/admin/', '/api/moderation/',
                '/api/candidate-verification/', '/api/appeals/'
            ];
            const requiresAdminInStaging = adminOnlyInStaging.some(route => req.path.startsWith(route));
            if (requiresAdminInStaging) {
                return res.status(403).json({
                    error: 'Admin access required for this staging feature.',
                    environment: 'staging'
                });
            }
            // Allow user-facing routes (photos, feed, posts, etc.) to proceed for all authenticated users
        }
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = async (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
// Environment-aware authentication for staging
const requireStagingAuth = async (req, res, next) => {
    // If not in development environment, proceed with normal auth
    if (!(0, environment_1.isDevelopment)()) {
        return (0, exports.requireAuth)(req, res, next);
    }
    // In development environment, require admin access for all protected routes
    await (0, exports.requireAuth)(req, res, async (authError) => {
        if (authError) {
            return next(authError);
        }
        // After successful auth, check for admin status in development
        if (!req.user?.isAdmin) {
            return res.status(403).json({
                error: 'This is a staging environment - admin access required.',
                environment: 'staging'
            });
        }
        next();
    });
};
exports.requireStagingAuth = requireStagingAuth;
//# sourceMappingURL=auth.js.map