"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVerificationStatus = checkVerificationStatus;
const logger_1 = require("../services/logger");
/**
 * Paths exempt from verification enforcement.
 * These must remain accessible to unverified/onboarding-incomplete users
 * so they can complete verification and onboarding.
 */
const EXEMPT_PATH_PREFIXES = [
    '/api/auth', // Login, logout, register, refresh, password reset
    '/api/verification', // Email/phone verification endpoints
    '/api/onboarding', // Onboarding steps and progress
    '/api/health', // Health checks
    '/api/track', // Analytics tracking
    '/health' // Root health check
];
/**
 * Verification and onboarding enforcement middleware.
 *
 * Reads emailVerified and onboardingCompleted from req.user (set by requireAuth).
 * No additional DB query — piggybacks on requireAuth's existing user fetch.
 *
 * Enforcement:
 * - Unverified email → 403 (hard block, must verify first)
 * - Verified but onboarding incomplete → 200 with X-Onboarding-Required header
 *
 * Applied as route-level middleware after requireAuth. Exempt paths are
 * skipped so users can complete the verification and onboarding flow.
 *
 * @param req - Express request with user from requireAuth middleware
 * @param res - Express response
 * @param next - Next middleware function
 */
async function checkVerificationStatus(req, res, next) {
    // Skip for unauthenticated requests (requireAuth handles that)
    if (!req.user) {
        return next();
    }
    // Skip for exempt paths (auth, verification, onboarding, health)
    const isExempt = EXEMPT_PATH_PREFIXES.some(prefix => req.path.startsWith(prefix));
    if (isExempt) {
        return next();
    }
    // Skip for admin users (admins bypass verification gate)
    if (req.user.isAdmin) {
        return next();
    }
    // Hard block: email not verified
    if (!req.user.emailVerified) {
        logger_1.logger.warn({
            component: 'verificationEnforcement',
            userId: req.user.id,
            path: req.path
        }, 'Unverified user attempted to access protected resource');
        return res.status(403).json({
            error: 'Email verification required',
            message: 'Please verify your email address to continue.',
            verificationRequired: true
        });
    }
    // Soft flag: onboarding not complete (allow request but signal frontend)
    if (!req.user.onboardingCompleted) {
        res.setHeader('X-Onboarding-Required', 'true');
    }
    next();
}
//# sourceMappingURL=verificationEnforcement.js.map