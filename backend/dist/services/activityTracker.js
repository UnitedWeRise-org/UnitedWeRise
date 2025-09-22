"use strict";
/**
 * Activity Tracker Service
 * Automatically tracks user activities for accountability and activity logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTracker = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
class ActivityTracker {
    /**
     * Track a user activity
     */
    static async track(userId, activityType, targetType, targetId, metadata = {}) {
        try {
            await prisma_1.prisma.userActivity.create({
                data: {
                    userId,
                    activityType,
                    targetType,
                    targetId,
                    metadata: metadata,
                },
            });
            console.log(`📊 Activity tracked: ${activityType} by user ${userId}`);
        }
        catch (error) {
            console.error('Failed to track activity:', error);
            // Don't throw - activity tracking shouldn't break main functionality
        }
    }
    /**
     * Track post creation
     */
    static async trackPostCreated(userId, postId, content) {
        const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        await this.track(userId, client_1.ActivityType.POST_CREATED, 'post', postId, {
            content,
            contentPreview,
        });
    }
    /**
     * Track post editing
     */
    static async trackPostEdited(userId, postId, newContent, previousContent, editReason) {
        const contentPreview = newContent.substring(0, 100) + (newContent.length > 100 ? '...' : '');
        await this.track(userId, client_1.ActivityType.POST_EDITED, 'post', postId, {
            content: newContent,
            contentPreview,
            previousContent: previousContent.substring(0, 200),
            editReason,
        });
    }
    /**
     * Track post deletion
     */
    static async trackPostDeleted(userId, postId, content, deletedReason) {
        const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        await this.track(userId, client_1.ActivityType.POST_DELETED, 'post', postId, {
            contentPreview,
            deletedReason,
            originalContent: content.substring(0, 500), // Store more for accountability
        });
    }
    /**
     * Track comment creation
     */
    static async trackCommentCreated(userId, commentId, content, postId, postTitle) {
        const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        await this.track(userId, client_1.ActivityType.COMMENT_CREATED, 'comment', commentId, {
            content,
            contentPreview,
            postId,
            postTitle: postTitle?.substring(0, 100),
        });
    }
    /**
     * Track comment editing
     */
    static async trackCommentEdited(userId, commentId, newContent, previousContent, postId) {
        const contentPreview = newContent.substring(0, 100) + (newContent.length > 100 ? '...' : '');
        await this.track(userId, client_1.ActivityType.COMMENT_EDITED, 'comment', commentId, {
            content: newContent,
            contentPreview,
            previousContent: previousContent.substring(0, 200),
            postId,
        });
    }
    /**
     * Track comment deletion
     */
    static async trackCommentDeleted(userId, commentId, content, postId, deletedReason) {
        const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        await this.track(userId, client_1.ActivityType.COMMENT_DELETED, 'comment', commentId, {
            contentPreview,
            deletedReason,
            originalContent: content.substring(0, 500),
            postId,
        });
    }
    /**
     * Track like addition
     */
    static async trackLikeAdded(userId, postId, postTitle) {
        await this.track(userId, client_1.ActivityType.LIKE_ADDED, 'post', postId, {
            postTitle: postTitle?.substring(0, 100),
        });
    }
    /**
     * Track like removal
     */
    static async trackLikeRemoved(userId, postId, postTitle) {
        await this.track(userId, client_1.ActivityType.LIKE_REMOVED, 'post', postId, {
            postTitle: postTitle?.substring(0, 100),
        });
    }
    /**
     * Track follow
     */
    static async trackFollowAdded(userId, targetUserId, targetUsername) {
        await this.track(userId, client_1.ActivityType.FOLLOW_ADDED, 'user', targetUserId, {
            targetUsername,
        });
    }
    /**
     * Track unfollow
     */
    static async trackFollowRemoved(userId, targetUserId, targetUsername) {
        await this.track(userId, client_1.ActivityType.FOLLOW_REMOVED, 'user', targetUserId, {
            targetUsername,
        });
    }
    /**
     * Track enhanced reaction changes (sentiment/stance)
     */
    static async trackReactionChanged(userId, postId, postTitle, reactionType, oldValue, newValue) {
        const metadata = {
            postTitle: postTitle?.substring(0, 100),
            reactionType,
            oldValue,
            newValue,
            change: oldValue && newValue ? 'modified' : newValue ? 'added' : 'removed'
        };
        await this.track(userId, client_1.ActivityType.REACTION_CHANGED, 'post', postId, metadata);
    }
    /**
     * Track post share
     */
    static async trackShareAdded(userId, postId, postTitle, shareType, quoteContent) {
        const metadata = {
            postTitle: postTitle?.substring(0, 100),
            shareType,
            hasQuote: shareType === 'QUOTE',
            quoteContent: quoteContent?.substring(0, 100)
        };
        await this.track(userId, client_1.ActivityType.SHARE_ADDED, 'post', postId, metadata);
    }
    /**
     * Track post share removal (unshare)
     */
    static async trackShareRemoved(userId, postId, postTitle, shareType) {
        const metadata = {
            postTitle: postTitle?.substring(0, 100),
            shareType
        };
        await this.track(userId, client_1.ActivityType.SHARE_REMOVED, 'post', postId, metadata);
    }
    /**
     * Get user activity log with filtering
     */
    static async getUserActivity(userId, options = {}) {
        const { types, search, offset = 0, limit = 20, includeTarget = false, } = options;
        const whereClause = {
            userId,
        };
        if (types && types.length > 0) {
            whereClause.activityType = {
                in: types,
            };
        }
        if (search) {
            whereClause.OR = [
                {
                    metadata: {
                        path: ['contentPreview'],
                        string_contains: search,
                    },
                },
                {
                    metadata: {
                        path: ['targetUsername'],
                        string_contains: search,
                    },
                },
                {
                    metadata: {
                        path: ['postTitle'],
                        string_contains: search,
                    },
                },
            ];
        }
        const activities = await prisma_1.prisma.userActivity.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc',
            },
            skip: offset,
            take: limit,
            include: includeTarget ? {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            } : undefined,
        });
        return activities;
    }
    /**
     * Get activity counts by type for a user
     */
    static async getActivityCounts(userId, timeframe) {
        const whereClause = {
            userId,
        };
        if (timeframe) {
            whereClause.createdAt = {
                gte: timeframe.start,
                lte: timeframe.end,
            };
        }
        const counts = await prisma_1.prisma.userActivity.groupBy({
            by: ['activityType'],
            where: whereClause,
            _count: {
                id: true,
            },
        });
        return counts.reduce((acc, item) => {
            acc[item.activityType] = item._count.id;
            return acc;
        }, {});
    }
}
exports.ActivityTracker = ActivityTracker;
exports.default = ActivityTracker;
//# sourceMappingURL=activityTracker.js.map