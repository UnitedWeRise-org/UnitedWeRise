/**
 * Discussion Service
 *
 * Handles internal organization discussions, threads, and replies.
 * Supports visibility levels and pinning.
 *
 * @module services/discussionService
 */
import { OrganizationDiscussion, DiscussionReply, DiscussionVisibility } from '@prisma/client';
/**
 * Request interface for creating a discussion
 */
interface CreateDiscussionRequest {
    title: string;
    content: string;
    visibility?: DiscussionVisibility;
}
/**
 * Request interface for creating a reply
 */
interface CreateReplyRequest {
    content: string;
    parentReplyId?: string;
}
/**
 * Options for listing discussions
 */
interface ListDiscussionsOptions {
    limit?: number;
    offset?: number;
    visibility?: DiscussionVisibility;
    pinnedOnly?: boolean;
}
/**
 * Discussion Service Class
 */
export declare class DiscussionService {
    /**
     * Check if user can view a discussion based on visibility level
     */
    canViewDiscussion(userId: string, organizationId: string, visibility: DiscussionVisibility): Promise<boolean>;
    /**
     * Create a new discussion
     */
    createDiscussion(organizationId: string, authorId: string, data: CreateDiscussionRequest): Promise<OrganizationDiscussion>;
    /**
     * Get a discussion by ID
     */
    getDiscussion(discussionId: string): Promise<OrganizationDiscussion | null>;
    /**
     * Get a discussion with all replies
     */
    getDiscussionWithReplies(discussionId: string): Promise<OrganizationDiscussion | null>;
    /**
     * Update a discussion
     */
    updateDiscussion(discussionId: string, data: {
        title?: string;
        content?: string;
        visibility?: DiscussionVisibility;
    }): Promise<OrganizationDiscussion>;
    /**
     * Delete a discussion and all replies
     */
    deleteDiscussion(discussionId: string): Promise<void>;
    /**
     * List discussions for an organization
     */
    listDiscussions(organizationId: string, userId: string, options?: ListDiscussionsOptions): Promise<{
        discussions: OrganizationDiscussion[];
        total: number;
    }>;
    /**
     * Pin or unpin a discussion
     */
    togglePin(discussionId: string, pinnedBy: string): Promise<OrganizationDiscussion>;
    /**
     * REPLY MANAGEMENT
     */
    /**
     * Create a reply to a discussion
     */
    createReply(discussionId: string, authorId: string, data: CreateReplyRequest): Promise<DiscussionReply>;
    /**
     * Update a reply
     */
    updateReply(replyId: string, data: {
        content: string;
    }): Promise<DiscussionReply>;
    /**
     * Delete a reply
     */
    deleteReply(replyId: string): Promise<void>;
    /**
     * Get reply by ID
     */
    getReply(replyId: string): Promise<DiscussionReply | null>;
    /**
     * Get recent discussions across all organizations a user is a member of
     */
    getUserRecentDiscussions(userId: string, limit?: number): Promise<OrganizationDiscussion[]>;
}
export declare const discussionService: DiscussionService;
export {};
//# sourceMappingURL=discussionService.d.ts.map