"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStagingAuth = exports.requireAdmin = exports.requireAuth = void 0;
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../utils/auth");
const crypto_1 = __importDefault(require("crypto"));
const sessionManager_1 = require("../services/sessionManager");
const metricsService_1 = require("../services/metricsService");
const environment_1 = require("../utils/environment");
const cookies_1 = require("../utils/cookies");
const requireAuth = async (req, res, next) => {
    // Generate unique request ID for tracing
    const requestId = crypto_1.default.randomBytes(4).toString('hex');
    try {
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] 🔍 AUTH Middleware Entry:`, {
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString(),
                hasCookie: !!req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN],
                hasAuthHeader: !!req.header('Authorization')
            });
        }
        // Get token from cookie first, fallback to header for transition period
        let token = req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
        // Fallback for migration period
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        if (!token) {
            // Keep error logs unconditional (401 response)
            console.log(`[${requestId}] ❌ AUTH 401: No token provided`, {
                path: req.path,
                method: req.method
            });
            metricsService_1.metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'no_token' });
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] 🔍 AUTH Token Verification: Verifying JWT token...`);
        }
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded) {
            // Keep error logs unconditional (401 response)
            console.log(`[${requestId}] ❌ AUTH 401: Token verification failed`);
            metricsService_1.metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'invalid_token' });
            return res.status(401).json({ error: 'Invalid token.', code: 'ACCESS_TOKEN_EXPIRED' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] ✅ AUTH Token Decoded:`, {
                userId: decoded.userId,
                totpVerified: decoded.totpVerified || false
            });
        }
        // SECURITY FIX: Check if token is blacklisted using secure hash
        // Use SHA-256 hash of full token to prevent collisions and improve security
        const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
        if (await sessionManager_1.sessionManager.isTokenBlacklisted(tokenId)) {
            // SECURITY EVENT: Always log blacklisted tokens
            console.log(`[${requestId}] ❌ AUTH 401: Token blacklisted`, {
                userId: decoded.userId
            });
            return res.status(401).json({ error: 'Token has been revoked.' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] 🔍 AUTH Database Lookup: Querying user from database...`);
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
        });
        if (!user) {
            // Keep error logs unconditional (401 response)
            console.log(`[${requestId}] ❌ AUTH 401: User not found in database`, {
                userId: decoded.userId
            });
            return res.status(401).json({ error: 'User not found.' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] ✅ AUTH User Found:`, {
                userId: user.id,
                username: user.username,
                dbIsAdmin: user.isAdmin,
                dbIsModerator: user.isModerator,
                dbIsSuperAdmin: user.isSuperAdmin
            });
        }
        // Add TOTP verification status from JWT to user object
        req.user = {
            ...user,
            totpVerified: decoded.totpVerified || false,
            totpVerifiedAt: decoded.totpVerifiedAt || null
        };
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] 🔍 AUTH req.user Assigned:`, {
                userId: user.id,
                username: user.username,
                'req.user.isAdmin': req.user.isAdmin,
                'req.user.isModerator': req.user.isModerator,
                'req.user.isSuperAdmin': req.user.isSuperAdmin,
                'req.user.totpVerified': req.user.totpVerified,
                rawDatabaseUser: {
                    isAdmin: user.isAdmin,
                    isModerator: user.isModerator,
                    isSuperAdmin: user.isSuperAdmin
                }
            });
            console.log(`[${requestId}] ✅ AUTH Basic Auth Successful:`, {
                userId: user.id,
                username: user.username
            });
        }
        // Record successful authentication
        metricsService_1.metricsService.incrementCounter('auth_middleware_success_total', {
            method: req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN] ? 'cookie' : 'header'
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
        // SECURITY FIX: Always enforce admin access for admin routes (not just in staging)
        const adminOnlyRoutes = [
            '/api/admin/', '/api/motd/admin/', '/api/moderation/',
            '/api/candidate-verification/', '/api/appeals/'
        ];
        const requiresAdminAccess = adminOnlyRoutes.some(route => req.path.startsWith(route));
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] 🔍 AUTH Admin Route Check:`, {
                path: req.path,
                requiresAdminAccess,
                adminOnlyRoutes,
                matchedRoute: adminOnlyRoutes.find(route => req.path.startsWith(route)) || 'none'
            });
            // Show admin access check for admin routes
            if (requiresAdminAccess) {
                console.log(`[${requestId}] 🔍 AUTH Admin Access Evaluation:`, {
                    path: req.path,
                    requiresAdminAccess,
                    'req.user?.isAdmin': req.user?.isAdmin,
                    'user.isAdmin': user.isAdmin,
                    'req.user?.isSuperAdmin': req.user?.isSuperAdmin,
                    'req.user?.totpVerified': req.user?.totpVerified,
                    willReturn403: !req.user?.isAdmin
                });
            }
        }
        if (requiresAdminAccess && !req.user?.isAdmin) {
            // SECURITY EVENT: Always log admin access denials
            console.error(`[${requestId}] 🚨 AUTH 403: Admin access denied`, {
                path: req.path,
                method: req.method,
                userId: req.user?.id,
                username: req.user?.username,
                'req.user.isAdmin': req.user?.isAdmin,
                'req.user.isSuperAdmin': req.user?.isSuperAdmin,
                'req.user.totpVerified': req.user?.totpVerified,
                rawDatabaseUser: {
                    isAdmin: user.isAdmin,
                    isSuperAdmin: user.isSuperAdmin
                },
                reason: 'USER_NOT_ADMIN'
            });
            return res.status(403).json({
                error: 'Admin access required for this endpoint.',
                requiredRole: 'admin'
            });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] ✅ AUTH Middleware Complete: Passing to next()`, {
                path: req.path,
                userId: user.id,
                username: user.username,
                isAdmin: req.user.isAdmin
            });
        }
        next();
    }
    catch (error) {
        console.error(`[${requestId}] ❌ AUTH Error in middleware:`, error);
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = async (req, res, next) => {
    // Generate unique request ID for tracing
    const requestId = crypto_1.default.randomBytes(4).toString('hex');
    if ((0, environment_1.enableRequestLogging)()) {
        console.log(`[${requestId}] 🔍 requireAdmin Middleware Entry:`, {
            path: req.path,
            method: req.method,
            hasUser: !!req.user,
            'req.user?.isAdmin': req.user?.isAdmin,
            'req.user?.totpVerified': req.user?.totpVerified
        });
    }
    if (!req.user?.isAdmin) {
        // SECURITY EVENT: Always log admin access denials
        console.error(`[${requestId}] 🚨 AUTH 403: requireAdmin - User not admin`, {
            path: req.path,
            method: req.method,
            userId: req.user?.id,
            username: req.user?.username,
            'req.user.isAdmin': req.user?.isAdmin,
            reason: 'NOT_ADMIN'
        });
        return res.status(403).json({ error: 'Admin access required.' });
    }
    // Check TOTP verification for admin users
    // Admin users must have TOTP verified in their JWT token
    if (!req.user?.totpVerified) {
        // SECURITY EVENT: Always log TOTP verification failures for admin access
        console.error(`[${requestId}] 🚨 AUTH 403: requireAdmin - TOTP not verified`, {
            path: req.path,
            method: req.method,
            userId: req.user?.id,
            username: req.user?.username,
            'req.user.totpVerified': req.user?.totpVerified,
            'req.user.totpVerifiedAt': req.user?.totpVerifiedAt,
            reason: 'TOTP_NOT_VERIFIED'
        });
        return res.status(403).json({
            error: 'TOTP_REQUIRED',
            message: 'Two-factor authentication required for admin access. Please log in with TOTP.'
        });
    }
    if ((0, environment_1.enableRequestLogging)()) {
        console.log(`[${requestId}] ✅ requireAdmin Passed:`, {
            path: req.path,
            userId: req.user.id,
            username: req.user.username
        });
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