"use strict";
/**
 * RiseAI API Routes
 *
 * Endpoints for the @RiseAI mention system, argument ledger,
 * and fact claim management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const riseAIMentionService_1 = require("../services/riseAIMentionService");
const riseAIAgentService_1 = require("../services/riseAIAgentService");
const argumentLedgerService_1 = require("../services/argumentLedgerService");
const factClaimService_1 = require("../services/factClaimService");
const logger_1 = __importDefault(require("../utils/logger"));
const safeJson_1 = require("../utils/safeJson");
const router = express_1.default.Router();
// ==========================================
// RiseAI Core Endpoints
// ==========================================
/**
 * Trigger RiseAI analysis on a post
 * POST /api/riseai/analyze
 */
router.post('/analyze', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId, commentId, content } = req.body;
        const userId = req.user.id;
        if (!postId || !content) {
            return res.status(400).json({ error: 'postId and content are required' });
        }
        // Process the mention
        const result = await riseAIMentionService_1.RiseAIMentionService.processMention({
            postId,
            commentId,
            userId,
            content
        });
        if (!result.success) {
            return res.status(result.rateLimitInfo ? 429 : 400).json({
                error: result.error,
                rateLimitInfo: result.rateLimitInfo
            });
        }
        // Process the interaction asynchronously
        // Start processing but don't wait
        riseAIAgentService_1.RiseAIAgentService.processInteraction(result.interactionId).catch(err => {
            logger_1.default.error('Background interaction processing failed', { err, interactionId: result.interactionId });
        });
        return res.status(202).json({
            message: 'Analysis started',
            interactionId: result.interactionId,
            rateLimitInfo: result.rateLimitInfo
        });
    }
    catch (error) {
        logger_1.default.error('RiseAI analyze endpoint failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get interaction status/result
 * GET /api/riseai/interaction/:id
 */
router.get('/interaction/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const interaction = await riseAIMentionService_1.RiseAIMentionService.getInteraction(req.params.id);
        if (!interaction) {
            return res.status(404).json({ error: 'Interaction not found' });
        }
        return res.json(interaction);
    }
    catch (error) {
        logger_1.default.error('Get interaction failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get user's RiseAI interactions
 * GET /api/riseai/my-interactions
 */
router.get('/my-interactions', auth_1.requireAuth, async (req, res) => {
    try {
        const { limit } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        const interactions = await riseAIMentionService_1.RiseAIMentionService.getUserInteractions(req.user.id, limit);
        return res.json(interactions);
    }
    catch (error) {
        logger_1.default.error('Get user interactions failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get rate limit status
 * GET /api/riseai/rate-limit
 */
router.get('/rate-limit', auth_1.requireAuth, async (req, res) => {
    try {
        const rateLimitInfo = await riseAIMentionService_1.RiseAIMentionService.checkRateLimit(req.user.id);
        return res.json(rateLimitInfo);
    }
    catch (error) {
        logger_1.default.error('Get rate limit failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get RiseAI settings (public portion)
 * GET /api/riseai/settings
 */
router.get('/settings', async (req, res) => {
    try {
        const settings = await riseAIMentionService_1.RiseAIMentionService.getSettings();
        return res.json({
            isEnabled: settings.isEnabled,
            dailyLimitNonAdmin: settings.dailyLimitNonAdmin
        });
    }
    catch (error) {
        logger_1.default.error('Get settings failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ==========================================
// Admin Endpoints
// ==========================================
/**
 * Update RiseAI settings (admin only)
 * PUT /api/riseai/admin/settings
 */
router.put('/admin/settings', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { dailyLimitNonAdmin, dailyLimitAdmin, confidenceThreshold, isEnabled } = req.body;
        const settings = await riseAIMentionService_1.RiseAIMentionService.updateSettings(req.user.id, {
            dailyLimitNonAdmin,
            dailyLimitAdmin,
            confidenceThreshold,
            isEnabled
        });
        logger_1.default.info('RiseAI settings updated', { adminId: req.user.id, settings });
        return res.json(settings);
    }
    catch (error) {
        logger_1.default.error('Update settings failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get full admin settings
 * GET /api/riseai/admin/settings
 */
router.get('/admin/settings', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = await riseAIMentionService_1.RiseAIMentionService.getSettings();
        return res.json(settings);
    }
    catch (error) {
        logger_1.default.error('Get admin settings failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ==========================================
// Argument Ledger Endpoints
// ==========================================
/**
 * Get top arguments
 * GET /api/riseai/arguments
 */
router.get('/arguments', async (req, res) => {
    try {
        const { limit } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        const arguments_ = await argumentLedgerService_1.ArgumentLedgerService.getTopArguments(limit);
        return res.json(arguments_);
    }
    catch (error) {
        logger_1.default.error('Get arguments failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get argument by ID
 * GET /api/riseai/arguments/:id
 */
router.get('/arguments/:id', async (req, res) => {
    try {
        const argument = await argumentLedgerService_1.ArgumentLedgerService.getArgument(req.params.id);
        if (!argument) {
            return res.status(404).json({ error: 'Argument not found' });
        }
        return res.json(argument);
    }
    catch (error) {
        logger_1.default.error('Get argument failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get arguments for a post
 * GET /api/riseai/posts/:postId/arguments
 */
router.get('/posts/:postId/arguments', async (req, res) => {
    try {
        const arguments_ = await argumentLedgerService_1.ArgumentLedgerService.getPostArguments(req.params.postId);
        return res.json(arguments_);
    }
    catch (error) {
        logger_1.default.error('Get post arguments failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Support an argument
 * POST /api/riseai/arguments/:id/support
 */
router.post('/arguments/:id/support', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await argumentLedgerService_1.ArgumentLedgerService.supportArgument(req.params.id, req.user.id);
        return res.json(result);
    }
    catch (error) {
        logger_1.default.error('Support argument failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Refute an argument
 * POST /api/riseai/arguments/:id/refute
 */
router.post('/arguments/:id/refute', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await argumentLedgerService_1.ArgumentLedgerService.refuteArgument(req.params.id, req.user.id);
        return res.json(result);
    }
    catch (error) {
        logger_1.default.error('Refute argument failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ==========================================
// Fact Claim Endpoints
// ==========================================
/**
 * Search facts
 * GET /api/riseai/facts
 */
router.get('/facts', async (req, res) => {
    try {
        const { query } = req.query;
        const { limit } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        if (query) {
            const facts = await factClaimService_1.FactClaimService.searchFacts(query, limit);
            return res.json(facts);
        }
        const facts = await factClaimService_1.FactClaimService.getEstablishedFacts(0.5, limit);
        return res.json(facts);
    }
    catch (error) {
        logger_1.default.error('Search facts failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Get fact by ID
 * GET /api/riseai/facts/:id
 */
router.get('/facts/:id', async (req, res) => {
    try {
        const fact = await factClaimService_1.FactClaimService.getFact(req.params.id);
        if (!fact) {
            return res.status(404).json({ error: 'Fact not found' });
        }
        return res.json(fact);
    }
    catch (error) {
        logger_1.default.error('Get fact failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Challenge a fact
 * POST /api/riseai/facts/:id/challenge
 */
router.post('/facts/:id/challenge', auth_1.requireAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }
        const result = await factClaimService_1.FactClaimService.challengeFact(req.params.id, reason);
        return res.json(result);
    }
    catch (error) {
        logger_1.default.error('Challenge fact failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Cite a fact
 * POST /api/riseai/facts/:id/cite
 */
router.post('/facts/:id/cite', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.body;
        const result = await factClaimService_1.FactClaimService.citeFact(req.params.id, postId);
        return res.json(result);
    }
    catch (error) {
        logger_1.default.error('Cite fact failed', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=riseai.js.map