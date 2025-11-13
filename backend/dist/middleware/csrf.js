"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnCsrf = exports.verifyCsrf = void 0;
const metricsService_1 = require("../services/metricsService");
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../utils/environment");
const cookies_1 = require("../utils/cookies");
/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 * Verifies that the CSRF token in the request header matches the one in the cookie
 */
const verifyCsrf = (req, res, next) => {
    // Generate unique request ID for tracing
    const requestId = crypto_1.default.randomBytes(4).toString('hex');
    if ((0, environment_1.enableRequestLogging)()) {
        console.log(`[${requestId}] 🔍 CSRF Middleware Entry:`, {
            method: req.method,
            path: req.path,
            timestamp: new Date().toISOString(),
            hasHeaderToken: !!req.headers['x-csrf-token'],
            hasBodyToken: !!(req.body && req.body._csrf),
            hasCookie: !!req.cookies[cookies_1.COOKIE_NAMES.CSRF_TOKEN]
        });
    }
    // Skip CSRF verification for GET requests (they should be safe by design)
    if (req.method === 'GET') {
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] ✅ CSRF Skip: GET request`);
        }
        return next();
    }
    // Skip CSRF verification for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] ✅ CSRF Skip: OPTIONS request`);
        }
        return next();
    }
    // CRITICAL: Exempt authentication routes from CSRF protection
    // These routes are accessed before users have CSRF tokens or during logout
    const exemptedPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/check-email', // Email validation during registration (before session)
        '/api/auth/check-username', // Username availability check during registration (before session)
        '/api/auth/google',
        '/api/auth/google/callback',
        '/api/auth/refresh',
        '/api/auth/logout', // Logout must work even if CSRF token issues
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/health',
        '/api/health'
    ];
    // Check if current path is exempted
    const isExempted = exemptedPaths.some(path => req.path === path || req.path.startsWith(path));
    if (isExempted) {
        if ((0, environment_1.enableRequestLogging)()) {
            console.log(`[${requestId}] ✅ CSRF Skip: Exempted path - ${req.path}`);
        }
        return next();
    }
    // Get CSRF token from request header or body
    // Note: req.body might be undefined for multipart/form-data before body parsing
    const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
    // Get CSRF token from cookie
    const cookie = req.cookies[cookies_1.COOKIE_NAMES.CSRF_TOKEN];
    if ((0, environment_1.enableRequestLogging)()) {
        console.log(`[${requestId}] 🔍 CSRF Token Check:`, {
            hasHeaderToken: !!token,
            hasCookieToken: !!cookie,
            tokensMatch: token && cookie ? (token === cookie) : false
        });
    }
    // Verify both tokens exist
    if (!token) {
        // SECURITY EVENT: Always log CSRF failures
        console.log(`[${requestId}] 🚨 CSRF 403: Missing token in request`, {
            path: req.path,
            method: req.method,
            reason: 'CSRF_TOKEN_MISSING'
        });
        metricsService_1.metricsService.incrementCounter('csrf_failures_total', { reason: 'missing_token' });
        return res.status(403).json({
            error: 'CSRF token missing in request',
            code: 'CSRF_TOKEN_MISSING'
        });
    }
    if (!cookie) {
        // SECURITY EVENT: Always log CSRF failures
        console.log(`[${requestId}] 🚨 CSRF 403: Missing cookie`, {
            path: req.path,
            method: req.method,
            reason: 'CSRF_COOKIE_MISSING'
        });
        metricsService_1.metricsService.incrementCounter('csrf_failures_total', { reason: 'missing_cookie' });
        return res.status(403).json({
            error: 'CSRF token missing in cookies',
            code: 'CSRF_COOKIE_MISSING'
        });
    }
    // Verify tokens match (double-submit cookie pattern)
    if (token !== cookie) {
        // SECURITY EVENT: Always log CSRF failures
        console.log(`[${requestId}] 🚨 CSRF 403: Token mismatch`, {
            path: req.path,
            method: req.method,
            reason: 'CSRF_TOKEN_MISMATCH'
        });
        metricsService_1.metricsService.incrementCounter('csrf_failures_total', { reason: 'token_mismatch' });
        return res.status(403).json({
            error: 'Invalid CSRF token',
            code: 'CSRF_TOKEN_MISMATCH'
        });
    }
    if ((0, environment_1.enableRequestLogging)()) {
        console.log(`[${requestId}] ✅ CSRF Validation Passed:`, {
            path: req.path,
            method: req.method
        });
    }
    metricsService_1.metricsService.incrementCounter('csrf_validations_total', { status: 'success' });
    next();
};
exports.verifyCsrf = verifyCsrf;
/**
 * Optional CSRF protection - logs warnings but doesn't block requests
 * Useful for gradual migration
 */
const warnCsrf = (req, res, next) => {
    // Skip for GET and OPTIONS
    if (req.method === 'GET' || req.method === 'OPTIONS') {
        return next();
    }
    const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
    const cookie = req.cookies[cookies_1.COOKIE_NAMES.CSRF_TOKEN];
    if (!token || !cookie || token !== cookie) {
        console.warn(`⚠️  CSRF Warning: ${req.method} ${req.path} - Missing or mismatched CSRF token`);
        // Continue with request but log the warning
    }
    next();
};
exports.warnCsrf = warnCsrf;
//# sourceMappingURL=csrf.js.map