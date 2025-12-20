"use strict";
/**
 * RiseAI Enrichment Service
 *
 * Enriches posts and comments with their associated RiseAI responses
 * for inline display in the frontend.
 *
 * @module RiseAIEnrichmentService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiseAIEnrichmentService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
/** System user ID for RiseAI responses */
const RISEAI_SYSTEM_USER_ID = 'riseai-system';
/**
 * RiseAI Enrichment Service
 *
 * Provides methods to enrich posts and comments with their associated
 * RiseAI responses for inline display.
 */
class RiseAIEnrichmentService {
    /**
     * Get the RiseAI system user ID
     */
    static getSystemUserId() {
        return RISEAI_SYSTEM_USER_ID;
    }
    /**
     * Get RiseAI response for a specific post trigger
     *
     * @param postId - The post that triggered the RiseAI analysis
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Enriched response data or null if no interaction exists
     */
    static async getResponseForPost(postId, currentUserId) {
        try {
            // Find interaction where the post itself (not a comment on it) triggered RiseAI
            const interaction = await prisma_1.prisma.riseAIInteraction.findFirst({
                where: {
                    triggerPostId: postId,
                    triggerCommentId: null, // Post-level trigger, not comment
                },
                orderBy: { createdAt: 'desc' }, // Get most recent if multiple
            });
            // Debug logging to trace enrichment lookup
            logger_1.logger.info({
                postId,
                interactionFound: !!interaction,
                interactionId: interaction?.id,
                status: interaction?.status,
                responseCommentId: interaction?.responseCommentId,
            }, 'RiseAI enrichment lookup for post');
            if (!interaction) {
                return null;
            }
            return this.enrichInteraction(interaction, currentUserId);
        }
        catch (error) {
            logger_1.logger.error({ error, postId }, 'Failed to get RiseAI response for post');
            return null;
        }
    }
    /**
     * Get RiseAI response for a specific comment trigger
     *
     * @param commentId - The comment that triggered the RiseAI analysis
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Enriched response data or null if no interaction exists
     */
    static async getResponseForComment(commentId, currentUserId) {
        try {
            const interaction = await prisma_1.prisma.riseAIInteraction.findFirst({
                where: {
                    triggerCommentId: commentId,
                },
                orderBy: { createdAt: 'desc' },
            });
            if (!interaction) {
                return null;
            }
            return this.enrichInteraction(interaction, currentUserId);
        }
        catch (error) {
            logger_1.logger.error({ error, commentId }, 'Failed to get RiseAI response for comment');
            return null;
        }
    }
    /**
     * Batch enrich multiple posts with their RiseAI responses
     * Optimized for feed performance to avoid N+1 queries
     *
     * @param postIds - Array of post IDs to enrich
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Map of postId to enriched response
     */
    static async enrichPostsWithResponses(postIds, currentUserId) {
        const resultMap = new Map();
        if (postIds.length === 0) {
            return resultMap;
        }
        try {
            // Get all post-level interactions in one query
            const interactions = await prisma_1.prisma.riseAIInteraction.findMany({
                where: {
                    triggerPostId: { in: postIds },
                    triggerCommentId: null, // Post-level triggers only
                },
                orderBy: { createdAt: 'desc' },
            });
            // Debug logging for batch enrichment
            logger_1.logger.info({
                requestedPostIds: postIds.length,
                interactionsFound: interactions.length,
                interactionDetails: interactions.map(i => ({
                    postId: i.triggerPostId,
                    status: i.status,
                    hasResponse: !!i.responseCommentId
                }))
            }, 'RiseAI batch enrichment for feed');
            // Group by postId, taking most recent
            const interactionsByPost = new Map();
            for (const interaction of interactions) {
                if (!interactionsByPost.has(interaction.triggerPostId)) {
                    interactionsByPost.set(interaction.triggerPostId, interaction);
                }
            }
            // Get all response comment IDs that exist
            const responseCommentIds = [...interactionsByPost.values()]
                .filter(i => i.responseCommentId)
                .map(i => i.responseCommentId);
            // Batch fetch response comments with author info
            const responseComments = responseCommentIds.length > 0
                ? await prisma_1.prisma.comment.findMany({
                    where: {
                        id: { in: responseCommentIds },
                        isDeleted: false,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                                verified: true,
                            },
                        },
                    },
                })
                : [];
            // Index comments by ID
            const commentsById = new Map(responseComments.map(c => [c.id, c]));
            // Fetch user reactions if currentUserId provided
            let userReactions = new Map();
            if (currentUserId && responseCommentIds.length > 0) {
                const reactions = await prisma_1.prisma.reaction.findMany({
                    where: {
                        userId: currentUserId,
                        commentId: { in: responseCommentIds },
                    },
                    select: {
                        commentId: true,
                        sentiment: true,
                        stance: true,
                    },
                });
                for (const reaction of reactions) {
                    if (!reaction.commentId)
                        continue;
                    userReactions.set(reaction.commentId, {
                        sentiment: reaction.sentiment || null,
                        stance: reaction.stance || null,
                    });
                }
            }
            // Build enriched responses
            for (const [postId, interaction] of interactionsByPost) {
                const comment = interaction.responseCommentId
                    ? commentsById.get(interaction.responseCommentId)
                    : null;
                const userReaction = interaction.responseCommentId
                    ? userReactions.get(interaction.responseCommentId)
                    : null;
                resultMap.set(postId, {
                    interactionId: interaction.id,
                    status: interaction.status,
                    responseComment: comment
                        ? {
                            id: comment.id,
                            content: comment.content,
                            createdAt: comment.createdAt,
                            likesCount: comment.likesCount,
                            dislikesCount: comment.dislikesCount,
                            agreesCount: comment.agreesCount,
                            disagreesCount: comment.disagreesCount,
                            userSentiment: userReaction?.sentiment,
                            userStance: userReaction?.stance,
                            author: {
                                id: comment.user.id,
                                username: comment.user.username,
                                firstName: comment.user.firstName,
                                lastName: comment.user.lastName,
                                avatar: comment.user.avatar,
                                verified: comment.user.verified,
                            },
                        }
                        : null,
                    entropyScore: interaction.entropyScore,
                    createdAt: interaction.createdAt,
                });
            }
            return resultMap;
        }
        catch (error) {
            logger_1.logger.error({ error, postIds }, 'Failed to batch enrich posts with RiseAI responses');
            return resultMap;
        }
    }
    /**
     * Batch enrich multiple comments with their RiseAI responses
     *
     * @param commentIds - Array of comment IDs to enrich
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Map of commentId to enriched response
     */
    static async enrichCommentsWithResponses(commentIds, currentUserId) {
        const resultMap = new Map();
        if (commentIds.length === 0) {
            return resultMap;
        }
        try {
            // Get all comment-level interactions in one query
            const interactions = await prisma_1.prisma.riseAIInteraction.findMany({
                where: {
                    triggerCommentId: { in: commentIds },
                },
                orderBy: { createdAt: 'desc' },
            });
            // Group by commentId, taking most recent
            const interactionsByComment = new Map();
            for (const interaction of interactions) {
                if (interaction.triggerCommentId && !interactionsByComment.has(interaction.triggerCommentId)) {
                    interactionsByComment.set(interaction.triggerCommentId, interaction);
                }
            }
            // Get all response comment IDs
            const responseCommentIds = [...interactionsByComment.values()]
                .filter(i => i.responseCommentId)
                .map(i => i.responseCommentId);
            // Batch fetch response comments
            const responseComments = responseCommentIds.length > 0
                ? await prisma_1.prisma.comment.findMany({
                    where: {
                        id: { in: responseCommentIds },
                        isDeleted: false,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                                verified: true,
                            },
                        },
                    },
                })
                : [];
            const commentsById = new Map(responseComments.map(c => [c.id, c]));
            // Fetch user reactions
            let userReactions = new Map();
            if (currentUserId && responseCommentIds.length > 0) {
                const reactions = await prisma_1.prisma.reaction.findMany({
                    where: {
                        userId: currentUserId,
                        commentId: { in: responseCommentIds },
                    },
                    select: {
                        commentId: true,
                        sentiment: true,
                        stance: true,
                    },
                });
                for (const reaction of reactions) {
                    if (!reaction.commentId)
                        continue;
                    userReactions.set(reaction.commentId, {
                        sentiment: reaction.sentiment || null,
                        stance: reaction.stance || null,
                    });
                }
            }
            // Build enriched responses
            for (const [commentId, interaction] of interactionsByComment) {
                const comment = interaction.responseCommentId
                    ? commentsById.get(interaction.responseCommentId)
                    : null;
                const userReaction = interaction.responseCommentId
                    ? userReactions.get(interaction.responseCommentId)
                    : null;
                resultMap.set(commentId, {
                    interactionId: interaction.id,
                    status: interaction.status,
                    responseComment: comment
                        ? {
                            id: comment.id,
                            content: comment.content,
                            createdAt: comment.createdAt,
                            likesCount: comment.likesCount,
                            dislikesCount: comment.dislikesCount,
                            agreesCount: comment.agreesCount,
                            disagreesCount: comment.disagreesCount,
                            userSentiment: userReaction?.sentiment,
                            userStance: userReaction?.stance,
                            author: {
                                id: comment.user.id,
                                username: comment.user.username,
                                firstName: comment.user.firstName,
                                lastName: comment.user.lastName,
                                avatar: comment.user.avatar,
                                verified: comment.user.verified,
                            },
                        }
                        : null,
                    entropyScore: interaction.entropyScore,
                    createdAt: interaction.createdAt,
                });
            }
            return resultMap;
        }
        catch (error) {
            logger_1.logger.error({ error, commentIds }, 'Failed to batch enrich comments with RiseAI responses');
            return resultMap;
        }
    }
    /**
     * Get all RiseAI response comment IDs for a post
     * Used to filter these from regular comment lists
     *
     * @param postId - The post ID
     * @returns Array of comment IDs that are RiseAI responses
     */
    static async getRiseAICommentIdsForPost(postId) {
        try {
            const interactions = await prisma_1.prisma.riseAIInteraction.findMany({
                where: {
                    triggerPostId: postId,
                    responseCommentId: { not: null },
                },
                select: {
                    responseCommentId: true,
                },
            });
            return interactions
                .map(i => i.responseCommentId)
                .filter((id) => id !== null);
        }
        catch (error) {
            logger_1.logger.error({ error, postId }, 'Failed to get RiseAI comment IDs for post');
            return [];
        }
    }
    /**
     * Internal helper to enrich a single interaction
     */
    static async enrichInteraction(interaction, currentUserId) {
        let responseComment = null;
        if (interaction.responseCommentId) {
            const comment = await prisma_1.prisma.comment.findUnique({
                where: { id: interaction.responseCommentId },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true,
                        },
                    },
                },
            });
            if (comment && !comment.isDeleted) {
                let userSentiment = null;
                let userStance = null;
                if (currentUserId) {
                    const reaction = await prisma_1.prisma.reaction.findFirst({
                        where: {
                            userId: currentUserId,
                            commentId: comment.id,
                        },
                        select: {
                            sentiment: true,
                            stance: true,
                        },
                    });
                    if (reaction) {
                        userSentiment = reaction.sentiment;
                        userStance = reaction.stance;
                    }
                }
                responseComment = {
                    id: comment.id,
                    content: comment.content,
                    createdAt: comment.createdAt,
                    likesCount: comment.likesCount,
                    dislikesCount: comment.dislikesCount,
                    agreesCount: comment.agreesCount,
                    disagreesCount: comment.disagreesCount,
                    userSentiment,
                    userStance,
                    author: {
                        id: comment.user.id,
                        username: comment.user.username,
                        firstName: comment.user.firstName,
                        lastName: comment.user.lastName,
                        avatar: comment.user.avatar,
                        verified: comment.user.verified,
                    },
                };
            }
        }
        return {
            interactionId: interaction.id,
            status: interaction.status,
            responseComment,
            entropyScore: interaction.entropyScore,
            createdAt: interaction.createdAt,
        };
    }
}
exports.RiseAIEnrichmentService = RiseAIEnrichmentService;
//# sourceMappingURL=riseAIEnrichmentService.js.map