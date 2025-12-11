"use strict";
/**
 * RiseAI Mention Detection Service
 *
 * Detects @RiseAI mentions in posts and comments, validates rate limits,
 * and initiates the analysis pipeline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiseAIMentionService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
// Rate limit constants
const DEFAULT_DAILY_LIMIT_NON_ADMIN = 10;
const DEFAULT_DAILY_LIMIT_ADMIN = -1; // Unlimited
class RiseAIMentionService {
    /**
     * Detect @RiseAI mentions in text content
     */
    static detectMentions(content) {
        const contexts = [];
        for (const pattern of this.MENTION_PATTERNS) {
            let match;
            pattern.lastIndex = 0; // Reset regex state
            while ((match = pattern.exec(content)) !== null) {
                const mentionIndex = match.index;
                const contextRadius = 500; // Characters of context before/after
                const contentBefore = content.slice(Math.max(0, mentionIndex - contextRadius), mentionIndex).trim();
                const contentAfter = content.slice(mentionIndex + match[0].length, mentionIndex + match[0].length + contextRadius).trim();
                // Determine what content the user wants analyzed
                // If mention is at start or after newline, analyze content after
                // If mention is at end or before newline, analyze content before
                const isAtStart = mentionIndex === 0 ||
                    content.slice(mentionIndex - 1, mentionIndex).match(/[\n\r]/);
                const isAtEnd = mentionIndex + match[0].length >= content.length ||
                    content.slice(mentionIndex + match[0].length, mentionIndex + match[0].length + 1).match(/[\n\r]/);
                let targetContent;
                let isDirectMention;
                if (contentAfter.length > contentBefore.length) {
                    targetContent = contentAfter;
                    isDirectMention = Boolean(isAtStart);
                }
                else if (contentBefore.length > 0) {
                    targetContent = contentBefore;
                    isDirectMention = Boolean(isAtEnd);
                }
                else {
                    targetContent = content;
                    isDirectMention = false;
                }
                contexts.push({
                    mentionIndex,
                    contentBefore,
                    contentAfter,
                    targetContent,
                    isDirectMention
                });
            }
        }
        return {
            hasMention: contexts.length > 0,
            contexts
        };
    }
    /**
     * Get or create RiseAI settings
     */
    static async getSettings() {
        let settings = await prisma_1.prisma.riseAISettings.findUnique({
            where: { id: 'default' }
        });
        if (!settings) {
            settings = await prisma_1.prisma.riseAISettings.create({
                data: {
                    id: 'default',
                    dailyLimitNonAdmin: DEFAULT_DAILY_LIMIT_NON_ADMIN,
                    dailyLimitAdmin: DEFAULT_DAILY_LIMIT_ADMIN,
                    confidenceThreshold: 0.85,
                    isEnabled: true
                }
            });
        }
        return settings;
    }
    /**
     * Check if user can make a RiseAI request (rate limiting)
     */
    static async checkRateLimit(userId) {
        const settings = await this.getSettings();
        if (!settings.isEnabled) {
            return {
                allowed: false,
                remaining: 0,
                limit: 0,
                resetTime: new Date()
            };
        }
        // Get user info to check if admin
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true, isSuperAdmin: true }
        });
        const isAdmin = user?.isAdmin || user?.isSuperAdmin;
        const dailyLimit = isAdmin ? settings.dailyLimitAdmin : settings.dailyLimitNonAdmin;
        // Unlimited for admins if set to -1
        if (dailyLimit === -1) {
            return {
                allowed: true,
                remaining: -1,
                limit: -1,
                resetTime: this.getNextResetTime()
            };
        }
        // Get today's usage
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const usage = await prisma_1.prisma.riseAIUsage.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today
                }
            }
        });
        const currentCount = usage?.count || 0;
        const remaining = Math.max(0, dailyLimit - currentCount);
        return {
            allowed: currentCount < dailyLimit,
            remaining,
            limit: dailyLimit,
            resetTime: this.getNextResetTime()
        };
    }
    /**
     * Increment usage count for user
     */
    static async incrementUsage(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await prisma_1.prisma.riseAIUsage.upsert({
            where: {
                userId_date: {
                    userId,
                    date: today
                }
            },
            update: {
                count: { increment: 1 }
            },
            create: {
                userId,
                date: today,
                count: 1
            }
        });
    }
    /**
     * Create a new RiseAI interaction record
     */
    static async createInteraction(params) {
        return prisma_1.prisma.riseAIInteraction.create({
            data: {
                triggerPostId: params.triggerPostId,
                triggerUserId: params.triggerUserId,
                triggerCommentId: params.triggerCommentId,
                targetContent: params.targetContent,
                status: 'pending'
            }
        });
    }
    /**
     * Update interaction with analysis results
     */
    static async updateInteraction(interactionId, updates) {
        return prisma_1.prisma.riseAIInteraction.update({
            where: { id: interactionId },
            data: updates
        });
    }
    /**
     * Get user's recent interactions
     */
    static async getUserInteractions(userId, limit = 10) {
        return prisma_1.prisma.riseAIInteraction.findMany({
            where: { triggerUserId: userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                triggerPost: {
                    select: {
                        id: true,
                        content: true
                    }
                }
            }
        });
    }
    /**
     * Get interaction by ID
     */
    static async getInteraction(interactionId) {
        return prisma_1.prisma.riseAIInteraction.findUnique({
            where: { id: interactionId },
            include: {
                triggerPost: {
                    select: {
                        id: true,
                        content: true,
                        author: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true
                            }
                        }
                    }
                },
                triggerUser: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                }
            }
        });
    }
    /**
     * Process a mention in a post or comment
     */
    static async processMention(params) {
        try {
            // Check if enabled
            const settings = await this.getSettings();
            if (!settings.isEnabled) {
                return { success: false, error: 'RiseAI is currently disabled' };
            }
            // Detect mentions
            const detection = this.detectMentions(params.content);
            if (!detection.hasMention) {
                return { success: false, error: 'No @RiseAI mention found' };
            }
            // Check rate limit
            const rateLimitResult = await this.checkRateLimit(params.userId);
            if (!rateLimitResult.allowed) {
                return {
                    success: false,
                    error: 'Rate limit exceeded',
                    rateLimitInfo: rateLimitResult
                };
            }
            // Get target content from first mention context
            const context = detection.contexts[0];
            // Create interaction record
            const interaction = await this.createInteraction({
                triggerPostId: params.postId,
                triggerUserId: params.userId,
                triggerCommentId: params.commentId,
                targetContent: context.targetContent
            });
            // Increment usage
            await this.incrementUsage(params.userId);
            logger_1.logger.info({
                interactionId: interaction.id,
                userId: params.userId,
                postId: params.postId,
                commentId: params.commentId
            }, 'Created RiseAI interaction');
            return {
                success: true,
                interactionId: interaction.id,
                rateLimitInfo: rateLimitResult
            };
        }
        catch (error) {
            logger_1.logger.error({ error, params }, 'Failed to process RiseAI mention');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get the next midnight for rate limit reset
     */
    static getNextResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }
    /**
     * Admin: Update RiseAI settings
     */
    static async updateSettings(updatedById, updates) {
        return prisma_1.prisma.riseAISettings.update({
            where: { id: 'default' },
            data: {
                ...updates,
                updatedById
            }
        });
    }
}
exports.RiseAIMentionService = RiseAIMentionService;
// Regex patterns for @RiseAI mentions (case-insensitive)
RiseAIMentionService.MENTION_PATTERNS = [
    /@riseai\b/gi,
    /@rise-ai\b/gi,
    /@rise_ai\b/gi
];
//# sourceMappingURL=riseAIMentionService.js.map