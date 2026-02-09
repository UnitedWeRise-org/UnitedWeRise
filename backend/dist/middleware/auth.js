"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStagingAuth = exports.requireAdmin = exports.optionalAuth = exports.requireAuth = void 0;
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../utils/auth");
const crypto_1 = __importDefault(require("crypto"));
const sessionManager_1 = require("../services/sessionManager");
const metricsService_1 = require("../services/metricsService");
const environment_1 = require("../utils/environment");
const cookies_1 = require("../utils/cookies");
const logger_1 = require("../services/logger");
const requireAuth = async (req, res, next) => {
    // Generate unique request ID for tracing
    const requestId = crypto_1.default.randomBytes(4).toString('hex');
    try {
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({
                requestId,
                path: req.path,
                method: req.method,
                hasCookie: !!req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN],
                hasAuthHeader: !!req.header('Authorization')
            }, 'AUTH Middleware Entry');
        }
        // Get token from cookie first, fallback to header for transition period
        let token = req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
        // Fallback for migration period
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        if (!token) {
            // Keep error logs unconditional (401 response)
            logger_1.logger.info({
                requestId,
                path: req.path,
                method: req.method,
                reason: 'no_token'
            }, 'AUTH 401: No token provided');
            metricsService_1.metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'no_token' });
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({ requestId }, 'AUTH Token Verification: Verifying JWT token');
        }
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded) {
            // Keep error logs unconditional (401 response)
            logger_1.logger.info({
                requestId,
                reason: 'invalid_token'
            }, 'AUTH 401: Token verification failed');
            metricsService_1.metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'invalid_token' });
            return res.status(401).json({ error: 'Invalid token.', code: 'ACCESS_TOKEN_EXPIRED' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({
                requestId,
                userId: decoded.userId,
                totpVerified: decoded.totpVerified || false
            }, 'AUTH Token Decoded');
        }
        // SECURITY FIX: Check if token is blacklisted using secure hash
        // Use SHA-256 hash of full token to prevent collisions and improve security
        const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
        if (await sessionManager_1.sessionManager.isTokenBlacklisted(tokenId)) {
            // SECURITY EVENT: Always log blacklisted tokens
            logger_1.logger.warn({
                requestId,
                userId: decoded.userId,
                event: 'token_blacklisted'
            }, 'AUTH 401: Token blacklisted');
            return res.status(401).json({ error: 'Token has been revoked.' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({ requestId }, 'AUTH Database Lookup: Querying user from database');
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
        });
        if (!user) {
            // Keep error logs unconditional (401 response)
            logger_1.logger.info({
                requestId,
                userId: decoded.userId,
                reason: 'user_not_found'
            }, 'AUTH 401: User not found in database');
            return res.status(401).json({ error: 'User not found.' });
        }
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({
                requestId,
                userId: user.id,
                username: user.username,
                dbIsAdmin: user.isAdmin,
                dbIsModerator: user.isModerator,
                dbIsSuperAdmin: user.isSuperAdmin
            }, 'AUTH User Found');
        }
        // Add TOTP verification status from JWT to user object
        req.user = {
            ...user,
            totpVerified: decoded.totpVerified || false,
            totpVerifiedAt: decoded.totpVerifiedAt || null
        };
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({
                requestId,
                userId: user.id,
                username: user.username,
                reqUserIsAdmin: req.user.isAdmin,
                reqUserIsModerator: req.user.isModerator,
                reqUserIsSuperAdmin: req.user.isSuperAdmin,
                reqUserTotpVerified: req.user.totpVerified,
                rawDatabaseUser: {
                    isAdmin: user.isAdmin,
                    isModerator: user.isModerator,
                    isSuperAdmin: user.isSuperAdmin
                }
            }, 'AUTH req.user Assigned');
            logger_1.logger.info({
                requestId,
                userId: user.id,
                username: user.username
            }, 'AUTH Basic Auth Successful');
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
                logger_1.logger.error({ error, userId: user.id }, 'Failed to update lastSeenAt');
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
                logger_1.logger.error({ error, sessionId, userId: user.id }, 'Failed to update session activity');
            }
        }
        // NOTE: Admin route authorization removed from requireAuth (H2 security fix)
        // Admin routes must explicitly use requireAdmin middleware instead of relying
        // on implicit path-based detection. This prevents authorization bypass via
        // path manipulation and ensures explicit, auditable access control.
        // All admin routes in admin.ts, moderation.ts, motd.ts, appeals.ts, etc.
        // already use requireAdmin middleware explicitly.
        if ((0, environment_1.enableRequestLogging)()) {
            logger_1.logger.info({
                requestId,
                path: req.path,
                userId: user.id,
                username: user.username,
                isAdmin: req.user.isAdmin
            }, 'AUTH Middleware Complete: Passing to next()');
        }
        next();
    }
    catch (error) {
        logger_1.logger.error({ error, requestId }, 'AUTH Error in middleware');
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.requireAuth = requireAuth;
/**
 * Optional authentication middleware.
 * Populates req.user if a valid token is present, but does not reject
 * unauthenticated requests. Use on routes that return extra data for
 * authenticated users (e.g. relationship status) but still work publicly.
 */
const optionalAuth = async (req, _res, next) => {
    try {
        let token = req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        if (!token) {
            return next();
        }
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded) {
            return next();
        }
        // Check blacklist
        const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
        if (await sessionManager_1.sessionManager.isTokenBlacklisted(tokenId)) {
            return next();
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
        });
        if (user) {
            req.user = {
                ...user,
                totpVerified: decoded.totpVerified || false,
                totpVerifiedAt: decoded.totpVerifiedAt || null
            };
        }
        next();
    }
    catch {
        // Silently continue without auth on any error
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireAdmin = async (req, res, next) => {
    // Generate unique request ID for tracing
    const requestId = crypto_1.default.randomBytes(4).toString('hex');
    if ((0, environment_1.enableRequestLogging)()) {
        logger_1.logger.info({
            requestId,
            path: req.path,
            method: req.method,
            hasUser: !!req.user,
            reqUserIsAdmin: req.user?.isAdmin,
            reqUserTotpVerified: req.user?.totpVerified
        }, 'requireAdmin Middleware Entry');
    }
    if (!req.user?.isAdmin) {
        // SECURITY EVENT: Always log admin access denials
        logger_1.logger.error({
            requestId,
            path: req.path,
            method: req.method,
            userId: req.user?.id,
            username: req.user?.username,
            reqUserIsAdmin: req.user?.isAdmin,
            reason: 'NOT_ADMIN',
            event: 'admin_access_denied'
        }, 'AUTH 403: requireAdmin - User not admin');
        return res.status(403).json({ error: 'Access denied' });
    }
    // Check TOTP verification for admin users
    // Admin users must have TOTP verified in their JWT token
    if (!req.user?.totpVerified) {
        // SECURITY EVENT: Always log TOTP verification failures for admin access
        logger_1.logger.error({
            requestId,
            path: req.path,
            method: req.method,
            userId: req.user?.id,
            username: req.user?.username,
            reqUserTotpVerified: req.user?.totpVerified,
            reqUserTotpVerifiedAt: req.user?.totpVerifiedAt,
            reason: 'TOTP_NOT_VERIFIED',
            event: 'totp_required'
        }, 'AUTH 403: requireAdmin - TOTP not verified');
        return res.status(403).json({
            error: 'TOTP_REQUIRED',
            message: 'Two-factor authentication required. Please log in with TOTP.'
        });
    }
    if ((0, environment_1.enableRequestLogging)()) {
        logger_1.logger.info({
            requestId,
            path: req.path,
            userId: req.user.id,
            username: req.user.username
        }, 'requireAdmin Passed');
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
                error: 'Access denied - staging environment'
            });
        }
        next();
    });
};
exports.requireStagingAuth = requireStagingAuth;
//# sourceMappingURL=auth.js.map