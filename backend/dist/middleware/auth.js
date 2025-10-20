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
        // SECURITY FIX: Check if token is blacklisted using secure hash
        // Use SHA-256 hash of full token to prevent collisions and improve security
        const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
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
        // Add TOTP verification status from JWT to user object
        req.user = {
            ...user,
            totpVerified: decoded.totpVerified || false,
            totpVerifiedAt: decoded.totpVerifiedAt || null
        };
        // 🔍 DIAGNOSTIC: Show admin status and TOTP verification
        console.log('🔍 DIAGNOSTIC | req.user after assignment:', {
            userId: user.id,
            username: user.username,
            isAdmin: req.user.isAdmin,
            isModerator: req.user.isModerator,
            isSuperAdmin: req.user.isSuperAdmin,
            totpVerified: req.user.totpVerified,
            rawDatabaseUser: {
                isAdmin: user.isAdmin,
                isModerator: user.isModerator,
                isSuperAdmin: user.isSuperAdmin
            }
        });
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
        // SECURITY FIX: Always enforce admin access for admin routes (not just in staging)
        const adminOnlyRoutes = [
            '/api/admin/', '/api/motd/admin/', '/api/moderation/',
            '/api/candidate-verification/', '/api/appeals/'
        ];
        const requiresAdminAccess = adminOnlyRoutes.some(route => req.path.startsWith(route));
        // 🔍 DIAGNOSTIC: Show admin access check
        if (requiresAdminAccess) {
            console.log('🔍 DIAGNOSTIC | Admin access check:', {
                path: req.path,
                requiresAdminAccess,
                'req.user?.isAdmin': req.user?.isAdmin,
                'user.isAdmin': user.isAdmin,
                willReturn403: !req.user?.isAdmin
            });
        }
        if (requiresAdminAccess && !req.user?.isAdmin) {
            console.error('❌ 403 FORBIDDEN | Admin access denied:', {
                path: req.path,
                userId: req.user?.id,
                username: req.user?.username,
                isAdmin: req.user?.isAdmin,
                rawUserIsAdmin: user.isAdmin
            });
            return res.status(403).json({
                error: 'Admin access required for this endpoint.',
                requiredRole: 'admin'
            });
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
    // Check TOTP verification for admin users
    // Admin users must have TOTP verified in their JWT token
    if (!req.user?.totpVerified) {
        return res.status(403).json({
            error: 'TOTP_REQUIRED',
            message: 'Two-factor authentication required for admin access. Please log in with TOTP.'
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