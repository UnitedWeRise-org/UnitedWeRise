"use strict";
/**
 * Reputation-based Content Warning Middleware
 *
 * Analyzes content before posting and shows warnings for potentially problematic content
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warningRateLimit = exports.applyReputationPenalties = exports.requireWarningAcknowledgment = exports.analyzeContentForWarning = void 0;
const reputationService_1 = require("../services/reputationService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware that analyzes content and attaches warning info to request
 * Does not block the request - just provides warning data
 */
const analyzeContentForWarning = async (req, res, next) => {
    try {
        const { content } = req.body;
        const userId = req.user?.id;
        if (!content || !userId) {
            return next();
        }
        // Generate content warning
        const warning = await reputationService_1.reputationService.generateContentWarning(content, userId);
        // Attach warning to request for potential use in response
        req.contentWarning = warning;
        // Add custom header to indicate warning status
        if (warning.showWarning) {
            res.setHeader('X-Content-Warning', 'true');
            res.setHeader('X-Content-Issues', warning.issues.join(','));
            res.setHeader('X-Potential-Penalty', warning.potentialPenalty.toString());
        }
        next();
    }
    catch (error) {
        logger_1.default.warn('Content warning analysis failed:', error);
        // Don't block request on analysis failure
        next();
    }
};
exports.analyzeContentForWarning = analyzeContentForWarning;
/**
 * Middleware that blocks posting if user hasn't acknowledged warning
 * Use this for strict content moderation
 */
const requireWarningAcknowledgment = async (req, res, next) => {
    try {
        const { content, acknowledgeWarning } = req.body;
        const userId = req.user?.id;
        if (!content || !userId) {
            return next();
        }
        // Check if content needs warning
        const warning = await reputationService_1.reputationService.generateContentWarning(content, userId);
        if (warning.showWarning && !acknowledgeWarning) {
            return res.status(400).json({
                error: 'Content warning acknowledgment required',
                warning: {
                    message: warning.message,
                    issues: warning.issues,
                    potentialPenalty: warning.potentialPenalty,
                    showWarning: true
                },
                requiresAcknowledgment: true
            });
        }
        // Store warning for potential penalty application
        req.contentWarning = warning;
        next();
    }
    catch (error) {
        logger_1.default.warn('Warning acknowledgment check failed:', error);
        // Don't block request on check failure
        next();
    }
};
exports.requireWarningAcknowledgment = requireWarningAcknowledgment;
/**
 * Middleware that applies reputation penalties after content is posted
 * Use this after successful post creation
 */
const applyReputationPenalties = async (req, res, next) => {
    try {
        const { content } = req.body;
        const userId = req.user?.id;
        if (!content || !userId) {
            return next();
        }
        // Extract post ID from response body (if available)
        const originalSend = res.send;
        res.send = function (data) {
            try {
                let postId;
                if (typeof data === 'string') {
                    const parsed = JSON.parse(data);
                    postId = parsed.post?.id;
                }
                else if (data && data.post && data.post.id) {
                    postId = data.post.id;
                }
                if (postId) {
                    // Apply penalties asynchronously (don't block response)
                    reputationService_1.reputationService.analyzeAndApplyPenalties(content, userId, postId)
                        .catch(error => {
                        logger_1.default.error('Failed to apply reputation penalties:', error);
                    });
                }
            }
            catch (error) {
                logger_1.default.warn('Failed to extract post ID for reputation analysis:', error);
            }
            return originalSend.call(this, data);
        };
        next();
    }
    catch (error) {
        logger_1.default.warn('Reputation penalty setup failed:', error);
        next();
    }
};
exports.applyReputationPenalties = applyReputationPenalties;
/**
 * Rate limiting for content warnings to prevent spam
 */
const warningRateLimit = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next();
        }
        // Check how many warnings user has triggered in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentWarnings = await reputationService_1.reputationService['prisma'].reputationEvent.count({
            where: {
                userId,
                eventType: 'PENALTY_HATE_SPEECH',
                createdAt: { gte: oneHourAgo }
            }
        });
        // Allow max 5 warnings per hour
        if (recentWarnings >= 5) {
            return res.status(429).json({
                error: 'Too many content warnings. Please wait before posting again.',
                retryAfter: 3600 // 1 hour in seconds
            });
        }
        next();
    }
    catch (error) {
        logger_1.default.warn('Warning rate limit check failed:', error);
        next();
    }
};
exports.warningRateLimit = warningRateLimit;
//# sourceMappingURL=reputationWarning.js.map