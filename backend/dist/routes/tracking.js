"use strict";
/**
 * Lightweight Page View Tracking Route
 *
 * Receives page view beacons from the frontend page-tracker module.
 * This endpoint is intentionally lightweight and unauthenticated since
 * it receives beacons from all visitors (anonymous and logged-in).
 *
 * Privacy: Raw IPs are never stored. The visitorAnalytics service
 * hashes IPs with a daily-rotating salt before persistence.
 *
 * @swagger
 * tags:
 *   - name: Tracking
 *     description: Page view tracking endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const visitorAnalytics_1 = __importDefault(require("../services/visitorAnalytics"));
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
/**
 * Rate limiter for tracking endpoint
 * Generous limit since every page load sends a beacon,
 * but prevents abuse from automated scripts
 */
const trackingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute window
    max: 30, // 30 beacons per minute per IP
    message: '',
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
            return ips[0].trim();
        }
        return req.ip || req.socket?.remoteAddress || 'unknown';
    }
});
/**
 * @swagger
 * /api/track/pageview:
 *   post:
 *     summary: Record a page view beacon
 *     description: >
 *       Lightweight endpoint for frontend page view tracking.
 *       No authentication required. IP is extracted from headers
 *       and hashed before storage. Returns 204 No Content.
 *     tags: [Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *                 description: The page path visited
 *                 example: /feed
 *               referrer:
 *                 type: string
 *                 description: The referring URL
 *               userId:
 *                 type: string
 *                 description: User ID if logged in
 *     responses:
 *       204:
 *         description: Page view recorded successfully
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/pageview', trackingLimiter, [
    (0, express_validator_1.body)('path')
        .isString()
        .isLength({ min: 1, max: 500 })
        .trim(),
    (0, express_validator_1.body)('referrer')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .trim(),
    (0, express_validator_1.body)('userId')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .trim()
], async (req, res) => {
    // Validation
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(204).send(); // Silently ignore malformed beacons
    }
    const { path, referrer, userId } = req.body;
    // Extract client IP
    const forwarded = req.headers['x-forwarded-for'];
    let ip;
    if (forwarded) {
        const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
        ip = ips[0].trim();
    }
    else {
        ip = req.ip || req.socket?.remoteAddress || 'unknown';
    }
    const userAgent = req.headers['user-agent'] || '';
    // Track asynchronously - don't block response
    visitorAnalytics_1.default
        .trackPageView({
        path,
        ip,
        userAgent,
        referrer: referrer || undefined,
        userId: userId || undefined
    })
        .catch(err => {
        logger_1.logger.error({ error: err, path, userId }, 'Tracking: Error recording page view beacon');
    });
    return res.status(204).send();
});
exports.default = router;
//# sourceMappingURL=tracking.js.map