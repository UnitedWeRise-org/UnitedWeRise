"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const onboardingService_1 = require("../services/onboardingService");
const representativeService_1 = require("../services/representativeService");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * /api/onboarding/steps:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding steps for current user
 *     description: Returns all onboarding steps with completion status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding steps retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       required:
 *                         type: boolean
 *                       completed:
 *                         type: boolean
 *                       data:
 *                         type: object
 */
router.get('/steps', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const steps = await onboardingService_1.onboardingService.getOnboardingSteps(userId);
        res.json({ steps });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get onboarding steps error');
        res.status(500).json({ error: 'Failed to get onboarding steps' });
    }
});
/**
 * @swagger
 * /api/onboarding/progress:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding progress for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding progress retrieved successfully
 */
router.get('/progress', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const progress = await onboardingService_1.onboardingService.getOnboardingProgress(userId);
        res.json(progress);
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get onboarding progress error');
        res.status(500).json({ error: 'Failed to get onboarding progress' });
    }
});
/**
 * @swagger
 * /api/onboarding/complete-step:
 *   post:
 *     tags: [Onboarding]
 *     summary: Complete an onboarding step
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepId
 *             properties:
 *               stepId:
 *                 type: string
 *               stepData:
 *                 type: object
 */
router.post('/complete-step', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { stepId, stepData } = req.body;
        if (!stepId) {
            return res.status(400).json({ error: 'Step ID is required' });
        }
        const profile = await onboardingService_1.onboardingService.completeStep(userId, stepId, stepData);
        await onboardingService_1.onboardingService.trackOnboardingEvent(userId, 'step_completed', stepId, stepData);
        // If location step completed, fetch and cache representatives
        if (stepId === 'location' && stepData?.zipCode) {
            try {
                // Fetch representatives using RepresentativeService (with automatic caching)
                const address = stepData.address || stepData.zipCode;
                const state = stepData.state;
                await representativeService_1.RepresentativeService.getRepresentativesByAddress(address, stepData.zipCode, state);
                logger_1.logger.info({ zipCode: stepData.zipCode, state }, 'Representatives fetched and cached');
            }
            catch (error) {
                logger_1.logger.error({ error }, 'Failed to fetch representatives');
                // Don't fail the onboarding step if rep fetching fails
            }
        }
        res.json({
            message: 'Step completed successfully',
            profile,
            progress: await onboardingService_1.onboardingService.getOnboardingProgress(userId)
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Complete onboarding step error');
        res.status(500).json({ error: 'Failed to complete step' });
    }
});
/**
 * @swagger
 * /api/onboarding/skip-step:
 *   post:
 *     tags: [Onboarding]
 *     summary: Skip a non-required onboarding step
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepId
 *             properties:
 *               stepId:
 *                 type: string
 */
router.post('/skip-step', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { stepId } = req.body;
        if (!stepId) {
            return res.status(400).json({ error: 'Step ID is required' });
        }
        const profile = await onboardingService_1.onboardingService.skipStep(userId, stepId);
        await onboardingService_1.onboardingService.trackOnboardingEvent(userId, 'step_skipped', stepId);
        res.json({
            message: 'Step skipped successfully',
            profile,
            progress: await onboardingService_1.onboardingService.getOnboardingProgress(userId)
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Skip onboarding step error');
        if (error instanceof Error && error.message.includes('Cannot skip required step')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to skip step' });
    }
});
/**
 * @swagger
 * /api/onboarding/interests:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get available interest categories
 *     responses:
 *       200:
 *         description: Interest categories retrieved successfully
 */
router.get('/interests', async (req, res) => {
    try {
        const interests = onboardingService_1.onboardingService.getPopularIssues();
        res.json({ interests });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Get interests error');
        res.status(500).json({ error: 'Failed to get interests' });
    }
});
/**
 * @swagger
 * /api/onboarding/location/validate:
 *   post:
 *     tags: [Onboarding]
 *     summary: Validate location and get representative info
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zipCode:
 *                 type: string
 *               address:
 *                 type: string
 */
router.post('/location/validate', async (req, res) => {
    try {
        const { zipCode, address } = req.body;
        if (!zipCode && !address) {
            return res.status(400).json({ error: 'ZIP code or address is required' });
        }
        // Use the address if provided, otherwise use ZIP code
        const locationQuery = address || zipCode;
        // Fetch representatives using RepresentativeService (Geocodio + Google Civic + cache)
        const result = await representativeService_1.RepresentativeService.getRepresentativesByAddress(locationQuery, zipCode, undefined // state will be extracted from address
        );
        if (!result || !result.representatives) {
            return res.status(400).json({
                error: 'Unable to find representatives for this location. Please check your ZIP code or address.'
            });
        }
        // Convert to array if grouped by level
        let reps = Array.isArray(result.representatives)
            ? result.representatives
            : [
                ...(result.representatives.federal || []),
                ...(result.representatives.state || []),
                ...(result.representatives.local || [])
            ];
        if (reps.length === 0) {
            return res.status(400).json({
                error: 'Unable to find representatives for this location. Please check your ZIP code or address.'
            });
        }
        // Extract location info
        const locationInfo = {
            zipCode: result.location.zipCode || zipCode,
            city: result.location.city,
            state: result.location.state,
            address,
            representatives: reps.slice(0, 5).map(rep => ({
                name: rep.name,
                office: rep.office,
                party: rep.party,
                photoUrl: rep.photoUrl,
                level: rep.level
            })),
            totalRepresentatives: reps.length,
            source: result.source // 'cache', 'geocodio', 'google_civic', 'google_civic+geocodio'
        };
        res.json({
            message: 'Location validated successfully',
            location: locationInfo
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Location validation error');
        res.status(400).json({
            error: 'Invalid location. Please check your ZIP code or address and try again.'
        });
    }
});
/**
 * @swagger
 * /api/onboarding/welcome:
 *   post:
 *     tags: [Onboarding]
 *     summary: Mark welcome step as viewed
 *     security:
 *       - bearerAuth: []
 */
router.post('/welcome', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await onboardingService_1.onboardingService.completeStep(userId, 'welcome', {
            viewedAt: new Date().toISOString()
        });
        await onboardingService_1.onboardingService.trackOnboardingEvent(userId, 'welcome_viewed');
        res.json({
            message: 'Welcome step completed',
            profile
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Welcome step error');
        res.status(500).json({ error: 'Failed to complete welcome step' });
    }
});
/**
 * @swagger
 * /api/onboarding/analytics:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding analytics (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding analytics retrieved successfully
 */
router.get('/analytics', auth_1.requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const analytics = await onboardingService_1.onboardingService.getOnboardingAnalytics();
        res.json(analytics);
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get onboarding analytics error');
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});
// Enhanced search endpoint with political term filtering
router.get('/search-preview', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        // Filter political terms subtly
        const filteredQuery = onboardingService_1.onboardingService.filterSearchTerms(query);
        // If the query was filtered to something generic, return issue-based suggestions
        if (filteredQuery === 'community discussion' || onboardingService_1.onboardingService.isFilteredSearchTerm(query)) {
            const interests = onboardingService_1.onboardingService.getPopularIssues();
            return res.json({
                suggestions: interests.slice(0, 5),
                message: 'Here are some popular topics to explore'
            });
        }
        // Perform actual search with filtered query
        // This would integrate with your search service
        res.json({
            query: filteredQuery,
            results: [], // Would contain actual search results
            message: filteredQuery !== query ? 'Showing results for related topics' : undefined
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Search preview error');
        res.status(500).json({ error: 'Search failed' });
    }
});
exports.default = router;
//# sourceMappingURL=onboarding.js.map