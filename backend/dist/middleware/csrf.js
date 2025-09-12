"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnCsrf = exports.verifyCsrf = void 0;
/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 * Verifies that the CSRF token in the request header matches the one in the cookie
 */
const verifyCsrf = (req, res, next) => {
    // Skip CSRF verification for GET requests (they should be safe by design)
    if (req.method === 'GET') {
        return next();
    }
    // Skip CSRF verification for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        return next();
    }
    // Get CSRF token from request header or body
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    // Get CSRF token from cookie
    const cookie = req.cookies['csrf-token'];
    // Verify both tokens exist
    if (!token) {
        return res.status(403).json({
            error: 'CSRF token missing in request',
            code: 'CSRF_TOKEN_MISSING'
        });
    }
    if (!cookie) {
        return res.status(403).json({
            error: 'CSRF token missing in cookies',
            code: 'CSRF_COOKIE_MISSING'
        });
    }
    // Verify tokens match (double-submit cookie pattern)
    if (token !== cookie) {
        return res.status(403).json({
            error: 'Invalid CSRF token',
            code: 'CSRF_TOKEN_MISMATCH'
        });
    }
    // CSRF validation passed
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
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const cookie = req.cookies['csrf-token'];
    if (!token || !cookie || token !== cookie) {
        console.warn(`⚠️  CSRF Warning: ${req.method} ${req.path} - Missing or mismatched CSRF token`);
        // Continue with request but log the warning
    }
    next();
};
exports.warnCsrf = warnCsrf;
//# sourceMappingURL=csrf.js.map