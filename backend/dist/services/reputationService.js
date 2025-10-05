"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reputationService = exports.ReputationService = void 0;
const prisma_1 = require("../lib/prisma");
/**
 * Reputation Service for UnitedWeRise
 *
 * Simple 0-100 scoring system focused on behavior, not content
 * - Starts at 70 for new users
 * - No automatic decay (scores only change through actions)
 * - Per-post penalty cap (prevents pile-ons)
 * - Mild algorithmic effects (±10-20% visibility)
 */
const azureOpenAIService_1 = require("./azureOpenAIService");
const logger_1 = __importDefault(require("../utils/logger"));
// Score thresholds and effects
const SCORE_CONFIG = {
    starting: 70,
    min: 0,
    max: 100,
    thresholds: {
        boost: 95, // +10% visibility
        normal: 50, // 1.0x visibility  
        suppress1: 30, // -10% visibility (0.9x)
        suppress2: 0 // -20% visibility (0.8x)
    }
};
// Penalty values (per post)
const PENALTIES = {
    hate_speech: -10,
    harassment: -8,
    spam: -2,
    excessive_profanity: -3,
    personal_attack: -1
};
// Reward values (daily max +2)
const REWARDS = {
    quality_post: 0.5, // 5+ diverse likes
    constructive: 0.25, // Constructive dialogue
    helpful: 0.25, // Helpful content
    positive_feedback: 0.25 // Community feedback
};
const DAILY_MAX_GAIN = 2;
class ReputationService {
    constructor() {
        this.prisma = prisma_1.prisma;
    }
    /**
     * Get user's current reputation score
     */
    async getUserReputation(userId) {
        try {
            let user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    reputationScore: true,
                    reputationUpdatedAt: true,
                    createdAt: true
                }
            });
            if (!user) {
                throw new Error('User not found');
            }
            // Initialize reputation if not set
            if (user.reputationScore === null || user.reputationScore === undefined) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        reputationScore: SCORE_CONFIG.starting,
                        reputationUpdatedAt: new Date()
                    }
                });
                user.reputationScore = SCORE_CONFIG.starting;
                user.reputationUpdatedAt = new Date();
            }
            const score = user.reputationScore;
            const tier = this.getTier(score);
            const visibilityMultiplier = this.getVisibilityMultiplier(score);
            return {
                current: score,
                tier,
                visibilityMultiplier,
                lastUpdated: user.reputationUpdatedAt || user.createdAt
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get user reputation:', error);
            throw error;
        }
    }
    /**
     * Apply reputation change with all validations
     */
    async applyReputationChange(event) {
        try {
            // Get current reputation
            const current = await this.getUserReputation(event.userId);
            // Check if this is a penalty that needs validation
            if (event.eventType.startsWith('PENALTY_') && !event.validated) {
                logger_1.default.warn('Penalty event requires validation', event);
                return current;
            }
            // Check daily gain limit for rewards
            if (event.eventType.startsWith('REWARD_')) {
                const todayGain = await this.getTodayGain(event.userId);
                if (todayGain >= DAILY_MAX_GAIN) {
                    logger_1.default.info('User hit daily gain limit', { userId: event.userId, todayGain });
                    return current;
                }
                // Reduce points if would exceed daily limit
                if (todayGain + event.impact > DAILY_MAX_GAIN) {
                    event.impact = DAILY_MAX_GAIN - todayGain;
                }
            }
            // Check for duplicate post penalties
            if (event.eventType.startsWith('PENALTY_') && event.postId) {
                const existingPenalty = await this.prisma.reputationEvent.findFirst({
                    where: {
                        userId: event.userId,
                        postId: event.postId,
                        eventType: { startsWith: 'PENALTY_' }
                    }
                });
                if (existingPenalty) {
                    logger_1.default.info('Post already has penalty applied', { postId: event.postId });
                    return current;
                }
            }
            // Calculate new score
            const newScore = Math.max(SCORE_CONFIG.min, Math.min(SCORE_CONFIG.max, current.current + event.impact));
            // Update user score
            await this.prisma.user.update({
                where: { id: event.userId },
                data: {
                    reputationScore: newScore,
                    reputationUpdatedAt: new Date()
                }
            });
            // Log the event
            await this.logReputationEvent(event, current.current, newScore);
            return {
                current: newScore,
                tier: this.getTier(newScore),
                visibilityMultiplier: this.getVisibilityMultiplier(newScore),
                lastUpdated: new Date()
            };
        }
        catch (error) {
            logger_1.default.error('Failed to apply reputation change:', error);
            throw error;
        }
    }
    /**
     * Analyze content and apply appropriate penalties
     */
    async analyzeAndApplyPenalties(content, userId, postId) {
        try {
            const penalties = [];
            let totalPenalty = 0;
            // AI content analysis
            const analysis = await this.analyzeContent(content);
            if (analysis.hate_speech) {
                penalties.push('hate_speech');
                totalPenalty += PENALTIES.hate_speech;
            }
            if (analysis.harassment) {
                penalties.push('harassment');
                totalPenalty += PENALTIES.harassment;
            }
            if (analysis.spam) {
                penalties.push('spam');
                totalPenalty += PENALTIES.spam;
            }
            if (analysis.excessive_profanity) {
                penalties.push('excessive_profanity');
                totalPenalty += PENALTIES.excessive_profanity;
            }
            if (analysis.personal_attack) {
                penalties.push('personal_attack');
                totalPenalty += PENALTIES.personal_attack;
            }
            // Apply penalty if any issues found
            if (totalPenalty < 0) {
                await this.applyReputationChange({
                    userId,
                    eventType: 'PENALTY_AI_ANALYSIS',
                    reason: penalties.join(', '),
                    impact: totalPenalty,
                    postId,
                    validated: true, // AI analysis counts as validation
                    details: { analysis }
                });
            }
            return { penalties, totalPenalty };
        }
        catch (error) {
            logger_1.default.error('Failed to analyze content for penalties:', error);
            return { penalties: [], totalPenalty: 0 };
        }
    }
    /**
     * Generate content warning before posting
     */
    async generateContentWarning(content, userId) {
        try {
            const analysis = await this.analyzeContent(content);
            const issues = [];
            let potentialPenalty = 0;
            if (analysis.hate_speech) {
                issues.push('hate speech');
                potentialPenalty += PENALTIES.hate_speech;
            }
            if (analysis.harassment) {
                issues.push('harassment');
                potentialPenalty += PENALTIES.harassment;
            }
            if (analysis.spam) {
                issues.push('spam/duplicate content');
                potentialPenalty += PENALTIES.spam;
            }
            if (analysis.excessive_profanity) {
                issues.push('excessive profanity');
                potentialPenalty += PENALTIES.excessive_profanity;
            }
            if (analysis.personal_attack) {
                issues.push('personal attack');
                potentialPenalty += PENALTIES.personal_attack;
            }
            if (issues.length === 0) {
                return {
                    showWarning: false,
                    issues: [],
                    potentialPenalty: 0,
                    message: ''
                };
            }
            const message = `We don't aim to prevent anyone from sharing their ideas, but please keep things civil.

Your post contains: ${issues.join(', ')}

To maintain a positive community environment, we kindly ask you to reconsider how you might convey your ideas in a more constructive manner.

You may still post, but this content will be flagged and may affect your Community Reputation Score (potential impact: ${potentialPenalty} points).`;
            return {
                showWarning: true,
                issues,
                potentialPenalty,
                message
            };
        }
        catch (error) {
            logger_1.default.error('Failed to generate content warning:', error);
            return {
                showWarning: false,
                issues: [],
                potentialPenalty: 0,
                message: ''
            };
        }
    }
    /**
     * Award reputation for positive actions
     */
    async awardReputation(userId, reason, postId) {
        const points = REWARDS[reason];
        return this.applyReputationChange({
            userId,
            eventType: 'REWARD_QUALITY_POST',
            reason,
            impact: points,
            postId,
            validated: true
        });
    }
    /**
     * Handle community reports
     */
    async processReport(reporterId, targetUserId, postId, reason, content) {
        try {
            // AI validation of the report
            const isValid = await this.validateReport(content, reason);
            if (!isValid) {
                logger_1.default.info('Report not validated by AI', { reporterId, reason });
                return { accepted: false };
            }
            // Apply penalty based on reason
            let penalty = 0;
            switch (reason.toLowerCase()) {
                case 'hate_speech':
                    penalty = PENALTIES.hate_speech;
                    break;
                case 'harassment':
                    penalty = PENALTIES.harassment;
                    break;
                case 'spam':
                    penalty = PENALTIES.spam;
                    break;
                case 'personal_attack':
                    penalty = PENALTIES.personal_attack;
                    break;
                default:
                    penalty = -1; // Generic penalty for other validated reports
            }
            await this.applyReputationChange({
                userId: targetUserId,
                eventType: 'PENALTY_COMMUNITY_REPORT',
                reason: `community_report_${reason}`,
                impact: penalty,
                postId,
                validated: true,
                details: { reporterId }
            });
            return { accepted: true, penalty };
        }
        catch (error) {
            logger_1.default.error('Failed to process report:', error);
            return { accepted: false };
        }
    }
    /**
     * Appeal a reputation penalty
     */
    async processAppeal(userId, eventId, reason) {
        try {
            // Get the original event
            const event = await this.prisma.reputationEvent.findUnique({
                where: { id: eventId }
            });
            if (!event || event.userId !== userId) {
                throw new Error('Event not found or unauthorized');
            }
            // AI review of the appeal
            const review = await this.reviewAppeal(event, reason);
            if (review.confidence < 0.7) {
                // Flag for admin review
                await this.flagForAdminReview(eventId, reason, review);
                return {
                    decision: 'under_review',
                    explanation: 'Your appeal has been flagged for admin review due to complexity. You will receive a response within 48 hours.'
                };
            }
            if (review.overturn) {
                // Restore the points
                await this.applyReputationChange({
                    userId,
                    eventType: 'REWARD_APPEAL_OVERTURNED',
                    reason: 'appeal_overturned',
                    impact: Math.abs(event.impact),
                    validated: true,
                    details: { originalEventId: eventId }
                });
                // Mark original event as overturned
                await this.prisma.reputationEvent.update({
                    where: { id: eventId },
                    data: {
                        details: {
                            ...event.details,
                            overturned: true,
                            appealReason: reason
                        }
                    }
                });
                return {
                    decision: 'overturned',
                    explanation: review.explanation
                };
            }
            else {
                return {
                    decision: 'upheld',
                    explanation: review.explanation
                };
            }
        }
        catch (error) {
            logger_1.default.error('Failed to process appeal:', error);
            throw error;
        }
    }
    // Private helper methods
    getTier(score) {
        if (score >= SCORE_CONFIG.thresholds.boost)
            return 'boosted';
        if (score >= SCORE_CONFIG.thresholds.normal)
            return 'normal';
        if (score >= SCORE_CONFIG.thresholds.suppress1)
            return 'suppressed';
        return 'heavily_suppressed';
    }
    getVisibilityMultiplier(score) {
        if (score >= SCORE_CONFIG.thresholds.boost)
            return 1.1; // +10%
        if (score >= SCORE_CONFIG.thresholds.normal)
            return 1.0; // Normal
        if (score >= SCORE_CONFIG.thresholds.suppress1)
            return 0.9; // -10%
        return 0.8; // -20%
    }
    async getTodayGain(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const events = await this.prisma.reputationEvent.findMany({
            where: {
                userId,
                eventType: 'REWARD_QUALITY_POST',
                createdAt: { gte: today }
            }
        });
        return events.reduce((sum, event) => sum + event.impact, 0);
    }
    async analyzeContent(content) {
        try {
            const analysisPrompt = `Analyze this content for community standards violations:

"${content.slice(0, 1000)}"

Check for:
1. Hate speech targeting identity groups
2. Harassment of specific individuals  
3. Spam or duplicate-like content
4. Excessive profanity (7+ instances, but consider context - is it offensive or just expressive?)
5. Direct personal attacks on users

Respond with JSON only:
{
  "hate_speech": boolean,
  "harassment": boolean, 
  "spam": boolean,
  "excessive_profanity": boolean,
  "personal_attack": boolean
}`;
            // Use General tier (gpt-4o-mini) for content moderation pattern matching
            const response = await azureOpenAIService_1.azureOpenAI.generateGeneralCompletion(analysisPrompt, {
                maxTokens: 150,
                temperature: 0.1,
                systemMessage: "You are a content moderation system. Be conservative - only flag clear violations. Political opinions and passionate expression are allowed. Focus on behavior, not content."
            });
            const analysis = JSON.parse(response);
            return analysis;
        }
        catch (error) {
            logger_1.default.warn('Content analysis failed, defaulting to no violations:', error);
            return {
                hate_speech: false,
                harassment: false,
                spam: false,
                excessive_profanity: false,
                personal_attack: false
            };
        }
    }
    async validateReport(content, reason) {
        try {
            const prompt = `A user reported this content for "${reason}":

"${content}"

Is this report valid? Consider:
- Is the content actually violating the stated reason?
- Are users potentially weaponizing reports against opinions they disagree with?
- Focus on behavior/tone, not political positions

Respond with JSON: {"valid": boolean, "confidence": 0.0-1.0}`;
            // Use General tier (gpt-4o-mini) for report validation pattern matching
            const response = await azureOpenAIService_1.azureOpenAI.generateGeneralCompletion(prompt, {
                maxTokens: 100,
                temperature: 0.1,
                systemMessage: "You validate user reports. Be skeptical of reports against unpopular political opinions. Only validate clear behavioral violations."
            });
            const result = JSON.parse(response);
            return result.valid && result.confidence > 0.7;
        }
        catch (error) {
            logger_1.default.warn('Report validation failed:', error);
            return false;
        }
    }
    async reviewAppeal(event, appealReason) {
        try {
            const prompt = `Review this reputation penalty appeal:

Original penalty: ${event.impact} points for "${event.reason}"
User's appeal: "${appealReason}"

Was the original penalty justified? Consider:
- Could this have been an error in AI judgment?
- Is this a case of legitimate political speech being penalized?
- Does the user provide compelling context?

Respond with JSON:
{
  "overturn": boolean,
  "confidence": 0.0-1.0,
  "explanation": "brief reasoning"
}`;
            // Use General tier (gpt-4o-mini) for appeal review pattern matching
            const response = await azureOpenAIService_1.azureOpenAI.generateGeneralCompletion(prompt, {
                maxTokens: 200,
                temperature: 0.2,
                systemMessage: "You review appeals of reputation penalties. Err on the side of free speech - overturn penalties if there's reasonable doubt."
            });
            return JSON.parse(response);
        }
        catch (error) {
            logger_1.default.warn('Appeal review failed:', error);
            return {
                overturn: false,
                confidence: 0.5,
                explanation: 'Unable to process appeal automatically. Flagged for admin review.'
            };
        }
    }
    async flagForAdminReview(eventId, appealReason, review) {
        // In a real implementation, this would notify admins
        logger_1.default.info('Appeal flagged for admin review', {
            eventId,
            appealReason,
            aiReview: review
        });
    }
    async logReputationEvent(event, oldScore, newScore) {
        await this.prisma.reputationEvent.create({
            data: {
                userId: event.userId,
                eventType: event.eventType,
                reason: event.reason,
                impact: event.impact,
                postId: event.postId,
                details: event.details || {}
            }
        });
    }
}
exports.ReputationService = ReputationService;
exports.reputationService = new ReputationService();
//# sourceMappingURL=reputationService.js.map