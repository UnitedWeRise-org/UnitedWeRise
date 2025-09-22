/**
 * Activity Tracker Service
 * Automatically tracks user activities for accountability and activity logs
 */
import { ActivityType } from '@prisma/client';
interface ActivityMetadata {
    title?: string;
    content?: string;
    contentPreview?: string;
    targetUsername?: string;
    previousContent?: string;
    editReason?: string;
    [key: string]: any;
}
export declare class ActivityTracker {
    /**
     * Track a user activity
     */
    static track(userId: string, activityType: ActivityType, targetType: string, targetId: string, metadata?: ActivityMetadata): Promise<void>;
    /**
     * Track post creation
     */
    static trackPostCreated(userId: string, postId: string, content: string): Promise<void>;
    /**
     * Track post editing
     */
    static trackPostEdited(userId: string, postId: string, newContent: string, previousContent: string, editReason?: string): Promise<void>;
    /**
     * Track post deletion
     */
    static trackPostDeleted(userId: string, postId: string, content: string, deletedReason?: string): Promise<void>;
    /**
     * Track comment creation
     */
    static trackCommentCreated(userId: string, commentId: string, content: string, postId: string, postTitle?: string): Promise<void>;
    /**
     * Track comment editing
     */
    static trackCommentEdited(userId: string, commentId: string, newContent: string, previousContent: string, postId: string): Promise<void>;
    /**
     * Track comment deletion
     */
    static trackCommentDeleted(userId: string, commentId: string, content: string, postId: string, deletedReason?: string): Promise<void>;
    /**
     * Track like addition
     */
    static trackLikeAdded(userId: string, postId: string, postTitle?: string): Promise<void>;
    /**
     * Track like removal
     */
    static trackLikeRemoved(userId: string, postId: string, postTitle?: string): Promise<void>;
    /**
     * Track follow
     */
    static trackFollowAdded(userId: string, targetUserId: string, targetUsername: string): Promise<void>;
    /**
     * Track unfollow
     */
    static trackFollowRemoved(userId: string, targetUserId: string, targetUsername: string): Promise<void>;
    /**
     * Get user activity log with filtering
     */
    static getUserActivity(userId: string, options?: {
        types?: ActivityType[];
        search?: string;
        offset?: number;
        limit?: number;
        includeTarget?: boolean;
    }): Promise<({
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        targetType: string;
        targetId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        activityType: import(".prisma/client").$Enums.ActivityType;
    })[]>;
    /**
     * Get activity counts by type for a user
     */
    static getActivityCounts(userId: string, timeframe?: {
        start: Date;
        end: Date;
    }): Promise<Record<import(".prisma/client").$Enums.ActivityType, number>>;
}
export default ActivityTracker;
//# sourceMappingURL=activityTracker.d.ts.map