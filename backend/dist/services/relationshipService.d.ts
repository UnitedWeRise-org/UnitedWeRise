export declare enum RelationshipType {
    FOLLOW = "FOLLOW",
    FRIEND = "FRIEND"
}
export declare enum FriendshipStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    BLOCKED = "BLOCKED"
}
export interface RelationshipResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}
export interface FollowStatus {
    isFollowing: boolean;
    followedAt?: Date;
}
export interface FriendStatus {
    isFriend: boolean;
    friendshipStatus?: FriendshipStatus;
    requestSentByCurrentUser?: boolean;
    friendsSince?: Date;
}
/**
 * FOLLOW SYSTEM - Reusable Functions
 */
export declare class FollowService {
    /**
     * Follow a user
     */
    static followUser(followerId: string, followingId: string): Promise<RelationshipResult>;
    /**
     * Unfollow a user
     */
    static unfollowUser(followerId: string, followingId: string): Promise<RelationshipResult>;
    /**
     * Get follow status between two users
     */
    static getFollowStatus(followerId: string, followingId: string): Promise<FollowStatus>;
    /**
     * Get followers list for a user
     */
    static getFollowers(userId: string, limit?: number, offset?: number): Promise<{
        success: boolean;
        data: {
            followers: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
                avatar: string;
                verified: boolean;
                followersCount: number;
            }[];
            pagination: {
                limit: number;
                offset: number;
                total: number;
            };
        };
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
    /**
     * Get following list for a user
     */
    static getFollowing(userId: string, limit?: number, offset?: number): Promise<{
        success: boolean;
        data: {
            following: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
                avatar: string;
                verified: boolean;
                followersCount: number;
            }[];
            pagination: {
                limit: number;
                offset: number;
                total: number;
            };
        };
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
    /**
     * Bulk follow status check - useful for user lists
     */
    static getBulkFollowStatus(currentUserId: string, userIds: string[]): Promise<Map<string, boolean>>;
}
/**
 * FRIEND SYSTEM - Reusable Functions
 */
export declare class FriendService {
    /**
     * Send friend request
     */
    static sendFriendRequest(requesterId: string, recipientId: string): Promise<RelationshipResult>;
    /**
     * Accept friend request
     */
    static acceptFriendRequest(userId: string, friendId: string): Promise<RelationshipResult>;
    /**
     * Reject friend request
     */
    static rejectFriendRequest(userId: string, friendId: string): Promise<RelationshipResult>;
    /**
     * Remove friend / Unfriend
     */
    static removeFriend(userId: string, friendId: string): Promise<RelationshipResult>;
    /**
     * Get friend status between two users
     */
    static getFriendStatus(userId: string, otherUserId: string): Promise<FriendStatus>;
    /**
     * Get friends list
     */
    static getFriends(userId: string, limit?: number, offset?: number): Promise<{
        success: boolean;
        data: {
            friends: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
                avatar: string;
                verified: boolean;
            }[];
            pagination: {
                limit: number;
                offset: number;
                total: number;
            };
        };
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
    /**
     * Get pending friend requests (received)
     */
    static getPendingRequests(userId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            requester: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
                avatar: string;
                verified: boolean;
            };
            createdAt: Date;
        }[];
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
    /**
     * Bulk friend status check - useful for user lists
     */
    static getBulkFriendStatus(currentUserId: string, userIds: string[]): Promise<Map<string, FriendStatus>>;
}
/**
 * COMBINED UTILITIES
 */
export declare class RelationshipUtils {
    /**
     * Get combined relationship status for display in UI
     */
    static getCombinedStatus(currentUserId: string, targetUserId: string): Promise<{
        follow: FollowStatus;
        friend: FriendStatus;
        canMessage: boolean;
        displayPriority: string;
    }>;
    /**
     * Suggest people to follow/friend based on mutual connections
     */
    static getSuggestions(userId: string, type?: 'follow' | 'friend', limit?: number): Promise<{
        success: boolean;
        data: unknown;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
}
//# sourceMappingURL=relationshipService.d.ts.map