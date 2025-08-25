"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const onboardingService_1 = require("../services/onboardingService");
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
        // Temporary stub - return empty steps array
        const steps = [];
        res.json({ steps });
    }
    catch (error) {
        console.error('Get onboarding steps error:', error);
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
        console.error('Get onboarding progress error:', error);
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
        // If location step completed, fetch representatives
        if (stepId === 'location' && stepData?.zipCode) {
            try {
                // await googleCivicService.updateUserRepresentatives(userId, stepData.zipCode);
                console.log('Representative fetching would happen here for:', stepData.zipCode);
            }
            catch (error) {
                console.error('Failed to fetch representatives:', error);
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
        console.error('Complete onboarding step error:', error);
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
        console.error('Skip onboarding step error:', error);
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
        console.error('Get interests error:', error);
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
        // const representatives = await googleCivicService.getRepresentatives(locationQuery);
        const representatives = []; // Temporary placeholder
        if (!representatives || representatives.length === 0) {
            return res.status(400).json({
                error: 'Unable to find representatives for this location. Please check your ZIP code or address.'
            });
        }
        // Extract location info from the first representative's address
        const locationInfo = {
            zipCode,
            address,
            representatives: representatives.slice(0, 5), // Return first 5 for preview
            totalRepresentatives: representatives.length
        };
        res.json({
            message: 'Location validated successfully',
            location: locationInfo
        });
    }
    catch (error) {
        console.error('Location validation error:', error);
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
        console.error('Welcome step error:', error);
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
        console.error('Get onboarding analytics error:', error);
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
        console.error('Search preview error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
exports.default = router;
//# sourceMappingURL=onboarding.js.map