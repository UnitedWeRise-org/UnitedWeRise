"use strict";
/**
 * Discussion Service
 *
 * Handles internal organization discussions, threads, and replies.
 * Supports visibility levels and pinning.
 *
 * @module services/discussionService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.discussionService = exports.DiscussionService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
/**
 * Standard user select fields
 */
const USER_SELECT = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatar: true,
};
/**
 * Discussion Service Class
 */
class DiscussionService {
    /**
     * Check if user can view a discussion based on visibility level
     */
    async canViewDiscussion(userId, organizationId, visibility) {
        // Check if user is org head
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { headUserId: true },
        });
        if (org?.headUserId === userId) {
            return true; // Head can view everything
        }
        // Get user's membership
        const membership = await prisma_1.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: { organizationId, userId },
            },
            select: {
                status: true,
                roleId: true,
                role: {
                    select: {
                        capabilities: true,
                    },
                },
            },
        });
        if (!membership || membership.status !== client_1.MembershipStatus.ACTIVE) {
            return false;
        }
        switch (visibility) {
            case client_1.DiscussionVisibility.ALL_MEMBERS:
                return true;
            case client_1.DiscussionVisibility.ROLE_HOLDERS:
                return membership.roleId !== null;
            case client_1.DiscussionVisibility.LEADERSHIP:
                return membership.role?.capabilities.includes('VIEW_LEADERSHIP_DISCUSSIONS') ?? false;
            default:
                return false;
        }
    }
    /**
     * Create a new discussion
     */
    async createDiscussion(organizationId, authorId, data) {
        const discussion = await prisma_1.prisma.organizationDiscussion.create({
            data: {
                organizationId,
                authorId,
                title: data.title,
                content: data.content,
                visibility: data.visibility ?? client_1.DiscussionVisibility.ALL_MEMBERS,
            },
            include: {
                author: {
                    select: USER_SELECT,
                },
                _count: {
                    select: {
                        replies: true,
                    },
                },
            },
        });
        logger_1.logger.info({ discussionId: discussion.id, organizationId, authorId }, 'Discussion created');
        return discussion;
    }
    /**
     * Get a discussion by ID
     */
    async getDiscussion(discussionId) {
        return prisma_1.prisma.organizationDiscussion.findUnique({
            where: { id: discussionId },
            include: {
                author: {
                    select: USER_SELECT,
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                _count: {
                    select: {
                        replies: true,
                    },
                },
            },
        });
    }
    /**
     * Get a discussion with all replies
     */
    async getDiscussionWithReplies(discussionId) {
        return prisma_1.prisma.organizationDiscussion.findUnique({
            where: { id: discussionId },
            include: {
                author: {
                    select: USER_SELECT,
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                replies: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: {
                            select: USER_SELECT,
                        },
                        childReplies: {
                            orderBy: { createdAt: 'asc' },
                            include: {
                                author: {
                                    select: USER_SELECT,
                                },
                            },
                        },
                    },
                    where: {
                        parentReplyId: null, // Only top-level replies
                    },
                },
            },
        });
    }
    /**
     * Update a discussion
     */
    async updateDiscussion(discussionId, data) {
        return prisma_1.prisma.organizationDiscussion.update({
            where: { id: discussionId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
            include: {
                author: {
                    select: USER_SELECT,
                },
            },
        });
    }
    /**
     * Delete a discussion and all replies
     */
    async deleteDiscussion(discussionId) {
        await prisma_1.prisma.$transaction([
            // Delete all replies first
            prisma_1.prisma.discussionReply.deleteMany({
                where: { discussionId },
            }),
            // Then delete the discussion
            prisma_1.prisma.organizationDiscussion.delete({
                where: { id: discussionId },
            }),
        ]);
        logger_1.logger.info({ discussionId }, 'Discussion deleted');
    }
    /**
     * List discussions for an organization
     */
    async listDiscussions(organizationId, userId, options = {}) {
        const { limit = 20, offset = 0, visibility, pinnedOnly = false } = options;
        // Get user's membership to determine what they can see
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { headUserId: true },
        });
        const membership = await prisma_1.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: { organizationId, userId },
            },
            select: {
                roleId: true,
                role: {
                    select: {
                        capabilities: true,
                    },
                },
            },
        });
        const isHead = org?.headUserId === userId;
        const hasRole = membership?.roleId !== null;
        const hasLeadershipAccess = membership?.role?.capabilities.includes('VIEW_LEADERSHIP_DISCUSSIONS') ?? false;
        // Build visibility filter based on user's access
        const visibilityFilter = [];
        visibilityFilter.push(client_1.DiscussionVisibility.ALL_MEMBERS);
        if (isHead || hasRole) {
            visibilityFilter.push(client_1.DiscussionVisibility.ROLE_HOLDERS);
        }
        if (isHead || hasLeadershipAccess) {
            visibilityFilter.push(client_1.DiscussionVisibility.LEADERSHIP);
        }
        const where = {
            organizationId,
            visibility: visibility ? visibility : { in: visibilityFilter },
            ...(pinnedOnly ? { isPinned: true } : {}),
        };
        const [discussions, total] = await Promise.all([
            prisma_1.prisma.organizationDiscussion.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' },
                ],
                include: {
                    author: {
                        select: USER_SELECT,
                    },
                    _count: {
                        select: {
                            replies: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.organizationDiscussion.count({ where }),
        ]);
        return { discussions, total };
    }
    /**
     * Pin or unpin a discussion
     */
    async togglePin(discussionId, pinnedBy) {
        const discussion = await prisma_1.prisma.organizationDiscussion.findUnique({
            where: { id: discussionId },
            select: { isPinned: true },
        });
        if (!discussion) {
            throw new Error('Discussion not found');
        }
        return prisma_1.prisma.organizationDiscussion.update({
            where: { id: discussionId },
            data: {
                isPinned: !discussion.isPinned,
                pinnedAt: !discussion.isPinned ? new Date() : null,
                pinnedBy: !discussion.isPinned ? pinnedBy : null,
            },
            include: {
                author: {
                    select: USER_SELECT,
                },
            },
        });
    }
    /**
     * REPLY MANAGEMENT
     */
    /**
     * Create a reply to a discussion
     */
    async createReply(discussionId, authorId, data) {
        // Validate parent reply if provided
        if (data.parentReplyId) {
            const parentReply = await prisma_1.prisma.discussionReply.findUnique({
                where: { id: data.parentReplyId },
                select: { discussionId: true },
            });
            if (!parentReply) {
                throw new Error('Parent reply not found');
            }
            if (parentReply.discussionId !== discussionId) {
                throw new Error('Parent reply does not belong to this discussion');
            }
        }
        const reply = await prisma_1.prisma.discussionReply.create({
            data: {
                discussionId,
                authorId,
                content: data.content,
                parentReplyId: data.parentReplyId,
            },
            include: {
                author: {
                    select: USER_SELECT,
                },
                parentReply: {
                    select: {
                        id: true,
                        author: {
                            select: USER_SELECT,
                        },
                    },
                },
            },
        });
        logger_1.logger.info({ replyId: reply.id, discussionId, authorId }, 'Reply created');
        return reply;
    }
    /**
     * Update a reply
     */
    async updateReply(replyId, data) {
        return prisma_1.prisma.discussionReply.update({
            where: { id: replyId },
            data: {
                content: data.content,
                updatedAt: new Date(),
            },
            include: {
                author: {
                    select: USER_SELECT,
                },
            },
        });
    }
    /**
     * Delete a reply
     */
    async deleteReply(replyId) {
        // Delete child replies first
        await prisma_1.prisma.discussionReply.deleteMany({
            where: { parentReplyId: replyId },
        });
        await prisma_1.prisma.discussionReply.delete({
            where: { id: replyId },
        });
        logger_1.logger.info({ replyId }, 'Reply deleted');
    }
    /**
     * Get reply by ID
     */
    async getReply(replyId) {
        return prisma_1.prisma.discussionReply.findUnique({
            where: { id: replyId },
            include: {
                author: {
                    select: USER_SELECT,
                },
                discussion: {
                    select: {
                        id: true,
                        organizationId: true,
                        authorId: true,
                    },
                },
            },
        });
    }
    /**
     * Get recent discussions across all organizations a user is a member of
     */
    async getUserRecentDiscussions(userId, limit = 10) {
        // Get user's organizations
        const memberships = await prisma_1.prisma.organizationMember.findMany({
            where: {
                userId,
                status: client_1.MembershipStatus.ACTIVE,
            },
            select: {
                organizationId: true,
            },
        });
        const orgIds = memberships.map(m => m.organizationId);
        if (orgIds.length === 0) {
            return [];
        }
        return prisma_1.prisma.organizationDiscussion.findMany({
            where: {
                organizationId: { in: orgIds },
                visibility: client_1.DiscussionVisibility.ALL_MEMBERS, // Only show ALL_MEMBERS for cross-org view
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: USER_SELECT,
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        avatar: true,
                    },
                },
                _count: {
                    select: {
                        replies: true,
                    },
                },
            },
        });
    }
}
exports.DiscussionService = DiscussionService;
// Export singleton instance
exports.discussionService = new DiscussionService();
//# sourceMappingURL=discussionService.js.map