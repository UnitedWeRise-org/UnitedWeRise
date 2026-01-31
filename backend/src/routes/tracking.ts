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

import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import visitorAnalytics from '../services/visitorAnalytics';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * Rate limiter for tracking endpoint
 * Generous limit since every page load sends a beacon,
 * but prevents abuse from automated scripts
 */
const trackingLimiter = rateLimit({
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
router.post(
    '/pageview',
    trackingLimiter,
    [
        body('path')
            .isString()
            .isLength({ min: 1, max: 500 })
            .trim(),
        body('referrer')
            .optional()
            .isString()
            .isLength({ max: 2000 })
            .trim(),
        body('userId')
            .optional()
            .isString()
            .isLength({ max: 100 })
            .trim()
    ],
    async (req: express.Request, res: express.Response) => {
        // Validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(204).send(); // Silently ignore malformed beacons
        }

        const { path, referrer, userId } = req.body;

        // Extract client IP
        const forwarded = req.headers['x-forwarded-for'];
        let ip: string;
        if (forwarded) {
            const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
            ip = ips[0].trim();
        } else {
            ip = req.ip || req.socket?.remoteAddress || 'unknown';
        }

        const userAgent = req.headers['user-agent'] || '';

        // Track asynchronously - don't block response
        visitorAnalytics
            .trackPageView({
                path,
                ip,
                userAgent,
                referrer: referrer || undefined,
                userId: userId || undefined
            })
            .catch(err => {
                logger.error(
                    { error: err, path, userId },
                    'Tracking: Error recording page view beacon'
                );
            });

        return res.status(204).send();
    }
);

export default router;
