import { prisma } from '../lib/prisma';
/**
 * Relationship Service
 * 
 * Reusable service layer for managing user relationships (following and friendships)
 * Can be used across different contexts: API routes, components, background jobs, etc.
 */

;
import { createNotification } from '../routes/notifications';

// Using singleton prisma from lib/prisma.ts

export enum RelationshipType {
    FOLLOW = 'FOLLOW',
    FRIEND = 'FRIEND',
    SUBSCRIPTION = 'SUBSCRIPTION'
}

export enum FriendshipStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    BLOCKED = 'BLOCKED'
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

export interface SubscriptionStatus {
    isSubscribed: boolean;
    subscribedAt?: Date;
}

/**
 * FOLLOW SYSTEM - Reusable Functions
 */

export class FollowService {
    /**
     * Follow a user
     */
    static async followUser(followerId: string, followingId: string): Promise<RelationshipResult> {
        try {
            // Validation
            if (followerId === followingId) {
                return { success: false, message: 'Cannot follow yourself' };
            }

            // Check if user exists
            const userToFollow = await prisma.user.findUnique({
                where: { id: followingId },
                select: { id: true, username: true }
            });

            if (!userToFollow) {
                return { success: false, message: 'User not found' };
            }

            // Check if already following
            const existingFollow = await this.getFollowStatus(followerId, followingId);
            if (existingFollow.isFollowing) {
                return { success: false, message: 'Already following this user' };
            }

            // Create follow relationship and update counts atomically
            await prisma.$transaction([
                prisma.follow.create({
                    data: {
                        followerId,
                        followingId
                    }
                }),
                prisma.user.update({
                    where: { id: followerId },
                    data: { followingCount: { increment: 1 } }
                }),
                prisma.user.update({
                    where: { id: followingId },
                    data: { followersCount: { increment: 1 } }
                })
            ]);

            // Create notification (async, don't block response)
            const follower = await prisma.user.findUnique({
                where: { id: followerId },
                select: { username: true }
            });

            if (follower) {
                createNotification(
                    'FOLLOW',
                    followerId,
                    followingId,
                    `${follower.username} started following you`
                ).catch(console.error);
            }

            return {
                success: true,
                message: 'Successfully followed user',
                data: { followerId, followingId, followedAt: new Date() }
            };

        } catch (error) {
            console.error('Follow user error:', error);
            return { success: false, message: 'Failed to follow user', error: error.message };
        }
    }

    /**
     * Unfollow a user
     */
    static async unfollowUser(followerId: string, followingId: string): Promise<RelationshipResult> {
        try {
            // Check if following
            const existingFollow = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId,
                        followingId
                    }
                }
            });

            if (!existingFollow) {
                return { success: false, message: 'Not following this user' };
            }

            // Remove follow relationship and update counts atomically
            await prisma.$transaction([
                prisma.follow.delete({
                    where: {
                        followerId_followingId: {
                            followerId,
                            followingId
                        }
                    }
                }),
                prisma.user.update({
                    where: { id: followerId },
                    data: { followingCount: { decrement: 1 } }
                }),
                prisma.user.update({
                    where: { id: followingId },
                    data: { followersCount: { decrement: 1 } }
                })
            ]);

            return {
                success: true,
                message: 'Successfully unfollowed user',
                data: { followerId, followingId }
            };

        } catch (error) {
            console.error('Unfollow user error:', error);
            return { success: false, message: 'Failed to unfollow user', error: error.message };
        }
    }

    /**
     * Get follow status between two users
     */
    static async getFollowStatus(followerId: string, followingId: string): Promise<FollowStatus> {
        try {
            const follow = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId,
                        followingId
                    }
                },
                select: { createdAt: true }
            });

            return {
                isFollowing: !!follow,
                followedAt: follow?.createdAt
            };

        } catch (error) {
            console.error('Get follow status error:', error);
            return { isFollowing: false };
        }
    }

    /**
     * Get followers list for a user
     */
    static async getFollowers(userId: string, limit: number = 20, offset: number = 0) {
        try {
            const followers = await prisma.follow.findMany({
                where: { followingId: userId },
                include: {
                    follower: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true,
                            followersCount: true
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' }
            });

            const total = await prisma.follow.count({
                where: { followingId: userId }
            });

            return {
                success: true,
                data: {
                    followers: followers.map(f => f.follower),
                    pagination: { limit, offset, total }
                }
            };

        } catch (error) {
            console.error('Get followers error:', error);
            return { success: false, message: 'Failed to get followers', error: error.message };
        }
    }

    /**
     * Get following list for a user
     */
    static async getFollowing(userId: string, limit: number = 20, offset: number = 0) {
        try {
            const following = await prisma.follow.findMany({
                where: { followerId: userId },
                include: {
                    following: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true,
                            followersCount: true
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' }
            });

            const total = await prisma.follow.count({
                where: { followerId: userId }
            });

            return {
                success: true,
                data: {
                    following: following.map(f => f.following),
                    pagination: { limit, offset, total }
                }
            };

        } catch (error) {
            console.error('Get following error:', error);
            return { success: false, message: 'Failed to get following', error: error.message };
        }
    }

    /**
     * Bulk follow status check - useful for user lists
     */
    static async getBulkFollowStatus(currentUserId: string, userIds: string[]): Promise<Map<string, boolean>> {
        try {
            const follows = await prisma.follow.findMany({
                where: {
                    followerId: currentUserId,
                    followingId: { in: userIds }
                },
                select: { followingId: true }
            });

            const followMap = new Map<string, boolean>();
            userIds.forEach(id => followMap.set(id, false));
            follows.forEach(follow => followMap.set(follow.followingId, true));

            return followMap;

        } catch (error) {
            console.error('Bulk follow status error:', error);
            return new Map();
        }
    }
}

/**
 * SUBSCRIPTION SYSTEM - Reusable Functions
 */

export class SubscriptionService {
    /**
     * Subscribe to a user (high-priority follow for algorithmic boost)
     */
    static async subscribeToUser(subscriberId: string, subscribedId: string): Promise<RelationshipResult> {
        try {
            // Validation
            if (subscriberId === subscribedId) {
                return { success: false, message: 'Cannot subscribe to yourself' };
            }

            // Check if user exists
            const userToSubscribe = await prisma.user.findUnique({
                where: { id: subscribedId },
                select: { id: true, username: true }
            });

            if (!userToSubscribe) {
                return { success: false, message: 'User not found' };
            }

            // Check if already subscribed
            const existingSubscription = await this.getSubscriptionStatus(subscriberId, subscribedId);
            if (existingSubscription.isSubscribed) {
                return { success: false, message: 'Already subscribed to this user' };
            }

            // Create subscription relationship atomically
            await prisma.subscription.create({
                data: {
                    subscriberId,
                    subscribedId
                }
            });

            // Create notification (async, don't block response)
            const subscriber = await prisma.user.findUnique({
                where: { id: subscriberId },
                select: { username: true }
            });

            if (subscriber) {
                createNotification(
                    'FOLLOW',
                    subscriberId,
                    subscribedId,
                    `${subscriber.username} subscribed to your posts`
                ).catch(console.error);
            }

            return {
                success: true,
                message: 'Successfully subscribed to user',
                data: { subscriberId, subscribedId, subscribedAt: new Date() }
            };

        } catch (error) {
            console.error('Subscribe to user error:', error);
            return { success: false, message: 'Failed to subscribe to user', error: error.message };
        }
    }

    /**
     * Unsubscribe from a user
     */
    static async unsubscribeFromUser(subscriberId: string, subscribedId: string): Promise<RelationshipResult> {
        try {
            // Check if subscribed
            const existingSubscription = await prisma.subscription.findUnique({
                where: {
                    subscriberId_subscribedId: {
                        subscriberId,
                        subscribedId
                    }
                }
            });

            if (!existingSubscription) {
                return { success: false, message: 'Not subscribed to this user' };
            }

            // Remove subscription relationship
            await prisma.subscription.delete({
                where: {
                    subscriberId_subscribedId: {
                        subscriberId,
                        subscribedId
                    }
                }
            });

            return {
                success: true,
                message: 'Successfully unsubscribed from user',
                data: { subscriberId, subscribedId }
            };

        } catch (error) {
            console.error('Unsubscribe from user error:', error);
            return { success: false, message: 'Failed to unsubscribe from user', error: error.message };
        }
    }

    /**
     * Get subscription status between two users
     */
    static async getSubscriptionStatus(subscriberId: string, subscribedId: string): Promise<SubscriptionStatus> {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: {
                    subscriberId_subscribedId: {
                        subscriberId,
                        subscribedId
                    }
                },
                select: { createdAt: true }
            });

            return {
                isSubscribed: !!subscription,
                subscribedAt: subscription?.createdAt
            };

        } catch (error) {
            console.error('Get subscription status error:', error);
            return { isSubscribed: false };
        }
    }

    /**
     * Get subscribers list for a user
     */
    static async getSubscribers(userId: string, limit: number = 20, offset: number = 0) {
        try {
            const subscribers = await prisma.subscription.findMany({
                where: { subscribedId: userId },
                include: {
                    subscriber: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true,
                            followersCount: true
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' }
            });

            const total = await prisma.subscription.count({
                where: { subscribedId: userId }
            });

            return {
                success: true,
                data: {
                    subscribers: subscribers.map(s => s.subscriber),
                    pagination: { limit, offset, total }
                }
            };

        } catch (error) {
            console.error('Get subscribers error:', error);
            return { success: false, message: 'Failed to get subscribers', error: error.message };
        }
    }

    /**
     * Get subscriptions list for a user
     */
    static async getSubscriptions(userId: string, limit: number = 20, offset: number = 0) {
        try {
            const subscriptions = await prisma.subscription.findMany({
                where: { subscriberId: userId },
                include: {
                    subscribed: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true,
                            followersCount: true
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' }
            });

            const total = await prisma.subscription.count({
                where: { subscriberId: userId }
            });

            return {
                success: true,
                data: {
                    subscriptions: subscriptions.map(s => s.subscribed),
                    pagination: { limit, offset, total }
                }
            };

        } catch (error) {
            console.error('Get subscriptions error:', error);
            return { success: false, message: 'Failed to get subscriptions', error: error.message };
        }
    }

    /**
     * Bulk subscription status check - useful for user lists
     */
    static async getBulkSubscriptionStatus(currentUserId: string, userIds: string[]): Promise<Map<string, boolean>> {
        try {
            const subscriptions = await prisma.subscription.findMany({
                where: {
                    subscriberId: currentUserId,
                    subscribedId: { in: userIds }
                },
                select: { subscribedId: true }
            });

            const subscriptionMap = new Map<string, boolean>();
            userIds.forEach(id => subscriptionMap.set(id, false));
            subscriptions.forEach(subscription => subscriptionMap.set(subscription.subscribedId, true));

            return subscriptionMap;

        } catch (error) {
            console.error('Bulk subscription status error:', error);
            return new Map();
        }
    }
}

/**
 * FRIEND SYSTEM - Reusable Functions
 */

export class FriendService {
    /**
     * Send friend request
     */
    static async sendFriendRequest(requesterId: string, recipientId: string): Promise<RelationshipResult> {
        try {
            // Validation
            if (requesterId === recipientId) {
                return { success: false, message: 'Cannot send friend request to yourself' };
            }

            // Check if user exists
            const recipient = await prisma.user.findUnique({
                where: { id: recipientId },
                select: { id: true, username: true }
            });

            if (!recipient) {
                return { success: false, message: 'User not found' };
            }

            // Check existing friendship status
            const existingFriendship = await this.getFriendStatus(requesterId, recipientId);
            
            if (existingFriendship.isFriend) {
                return { success: false, message: 'Already friends with this user' };
            }

            if (existingFriendship.friendshipStatus === FriendshipStatus.PENDING) {
                if (existingFriendship.requestSentByCurrentUser) {
                    return { success: false, message: 'Friend request already sent' };
                } else {
                    // They sent us a request, auto-accept
                    return await this.acceptFriendRequest(requesterId, recipientId);
                }
            }

            // Create friend request
            await prisma.friendship.create({
                data: {
                    requesterId,
                    recipientId,
                    status: FriendshipStatus.PENDING
                }
            });

            // Create notification
            const requester = await prisma.user.findUnique({
                where: { id: requesterId },
                select: { username: true }
            });

            if (requester) {
                createNotification(
                    'FRIEND_REQUEST',
                    requesterId,
                    recipientId,
                    `${requester.username} sent you a friend request`
                ).catch(console.error);
            }

            return {
                success: true,
                message: 'Friend request sent successfully',
                data: { requesterId, recipientId, status: FriendshipStatus.PENDING }
            };

        } catch (error) {
            console.error('Send friend request error:', error);
            return { success: false, message: 'Failed to send friend request', error: error.message };
        }
    }

    /**
     * Accept friend request
     */
    static async acceptFriendRequest(userId: string, friendId: string): Promise<RelationshipResult> {
        try {
            // Find pending request where current user is the recipient
            const friendRequest = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        { requesterId: friendId, recipientId: userId, status: FriendshipStatus.PENDING },
                        { requesterId: userId, recipientId: friendId, status: FriendshipStatus.PENDING }
                    ]
                }
            });

            if (!friendRequest) {
                return { success: false, message: 'No pending friend request found' };
            }

            // Update to accepted
            await prisma.friendship.update({
                where: { id: friendRequest.id },
                data: { 
                    status: FriendshipStatus.ACCEPTED,
                    acceptedAt: new Date()
                }
            });

            // Create notification
            const accepter = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });

            if (accepter) {
                createNotification(
                    'FRIEND_ACCEPTED',
                    userId,
                    friendId,
                    `${accepter.username} accepted your friend request`
                ).catch(console.error);
            }

            return {
                success: true,
                message: 'Friend request accepted',
                data: { userId, friendId, status: FriendshipStatus.ACCEPTED }
            };

        } catch (error) {
            console.error('Accept friend request error:', error);
            return { success: false, message: 'Failed to accept friend request', error: error.message };
        }
    }

    /**
     * Reject friend request
     */
    static async rejectFriendRequest(userId: string, friendId: string): Promise<RelationshipResult> {
        try {
            const friendRequest = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        { requesterId: friendId, recipientId: userId, status: FriendshipStatus.PENDING },
                        { requesterId: userId, recipientId: friendId, status: FriendshipStatus.PENDING }
                    ]
                }
            });

            if (!friendRequest) {
                return { success: false, message: 'No pending friend request found' };
            }

            // Update to rejected
            await prisma.friendship.update({
                where: { id: friendRequest.id },
                data: { status: FriendshipStatus.REJECTED }
            });

            return {
                success: true,
                message: 'Friend request rejected',
                data: { userId, friendId, status: FriendshipStatus.REJECTED }
            };

        } catch (error) {
            console.error('Reject friend request error:', error);
            return { success: false, message: 'Failed to reject friend request', error: error.message };
        }
    }

    /**
     * Remove friend / Unfriend
     */
    static async removeFriend(userId: string, friendId: string): Promise<RelationshipResult> {
        try {
            const friendship = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        { requesterId: userId, recipientId: friendId, status: FriendshipStatus.ACCEPTED },
                        { requesterId: friendId, recipientId: userId, status: FriendshipStatus.ACCEPTED }
                    ]
                }
            });

            if (!friendship) {
                return { success: false, message: 'No friendship found' };
            }

            // Delete the friendship
            await prisma.friendship.delete({
                where: { id: friendship.id }
            });

            return {
                success: true,
                message: 'Friend removed successfully',
                data: { userId, friendId }
            };

        } catch (error) {
            console.error('Remove friend error:', error);
            return { success: false, message: 'Failed to remove friend', error: error.message };
        }
    }

    /**
     * Get friend status between two users
     */
    static async getFriendStatus(userId: string, otherUserId: string): Promise<FriendStatus> {
        try {
            const friendship = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        { requesterId: userId, recipientId: otherUserId },
                        { requesterId: otherUserId, recipientId: userId }
                    ]
                },
                select: {
                    status: true,
                    requesterId: true,
                    acceptedAt: true
                }
            });

            if (!friendship) {
                return { isFriend: false };
            }

            return {
                isFriend: friendship.status === FriendshipStatus.ACCEPTED,
                friendshipStatus: friendship.status as FriendshipStatus,
                requestSentByCurrentUser: friendship.requesterId === userId,
                friendsSince: friendship.acceptedAt || undefined
            };

        } catch (error) {
            console.error('Get friend status error:', error);
            return { isFriend: false };
        }
    }

    /**
     * Get friends list
     */
    static async getFriends(userId: string, limit: number = 20, offset: number = 0) {
        try {
            const friendships = await prisma.friendship.findMany({
                where: {
                    OR: [
                        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
                        { recipientId: userId, status: FriendshipStatus.ACCEPTED }
                    ]
                },
                include: {
                    requester: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true
                        }
                    },
                    recipient: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { acceptedAt: 'desc' }
            });

            const friends = friendships.map(friendship => {
                // Return the other user (not the current user)
                return friendship.requesterId === userId 
                    ? friendship.recipient 
                    : friendship.requester;
            });

            const total = await prisma.friendship.count({
                where: {
                    OR: [
                        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
                        { recipientId: userId, status: FriendshipStatus.ACCEPTED }
                    ]
                }
            });

            return {
                success: true,
                data: {
                    friends,
                    pagination: { limit, offset, total }
                }
            };

        } catch (error) {
            console.error('Get friends error:', error);
            return { success: false, message: 'Failed to get friends', error: error.message };
        }
    }

    /**
     * Get pending friend requests (received)
     */
    static async getPendingRequests(userId: string) {
        try {
            const requests = await prisma.friendship.findMany({
                where: {
                    recipientId: userId,
                    status: FriendshipStatus.PENDING
                },
                include: {
                    requester: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                success: true,
                data: requests.map(req => ({
                    id: req.id,
                    requester: req.requester,
                    createdAt: req.createdAt
                }))
            };

        } catch (error) {
            console.error('Get pending requests error:', error);
            return { success: false, message: 'Failed to get pending requests', error: error.message };
        }
    }

    /**
     * Bulk friend status check - useful for user lists
     */
    static async getBulkFriendStatus(currentUserId: string, userIds: string[]): Promise<Map<string, FriendStatus>> {
        try {
            const friendships = await prisma.friendship.findMany({
                where: {
                    OR: [
                        { requesterId: currentUserId, recipientId: { in: userIds } },
                        { requesterId: { in: userIds }, recipientId: currentUserId }
                    ]
                },
                select: {
                    requesterId: true,
                    recipientId: true,
                    status: true,
                    acceptedAt: true
                }
            });

            const friendMap = new Map<string, FriendStatus>();
            
            // Initialize all as not friends
            userIds.forEach(id => friendMap.set(id, { isFriend: false }));
            
            // Update with actual statuses
            friendships.forEach(friendship => {
                const otherUserId = friendship.requesterId === currentUserId 
                    ? friendship.recipientId 
                    : friendship.requesterId;
                
                friendMap.set(otherUserId, {
                    isFriend: friendship.status === FriendshipStatus.ACCEPTED,
                    friendshipStatus: friendship.status as FriendshipStatus,
                    requestSentByCurrentUser: friendship.requesterId === currentUserId,
                    friendsSince: friendship.acceptedAt || undefined
                });
            });

            return friendMap;

        } catch (error) {
            console.error('Bulk friend status error:', error);
            return new Map();
        }
    }
}

/**
 * COMBINED UTILITIES
 */

export class RelationshipUtils {
    /**
     * Get combined relationship status for display in UI
     */
    static async getCombinedStatus(currentUserId: string, targetUserId: string) {
        const [followStatus, friendStatus, subscriptionStatus] = await Promise.all([
            FollowService.getFollowStatus(currentUserId, targetUserId),
            FriendService.getFriendStatus(currentUserId, targetUserId),
            SubscriptionService.getSubscriptionStatus(currentUserId, targetUserId)
        ]);

        return {
            follow: followStatus,
            friend: friendStatus,
            subscription: subscriptionStatus,
            canMessage: friendStatus.isFriend, // Only friends can message
            displayPriority: friendStatus.isFriend ? 'friend' : (subscriptionStatus.isSubscribed ? 'subscribed' : (followStatus.isFollowing ? 'following' : 'none'))
        };
    }

    /**
     * Suggest people to follow/friend based on mutual connections
     */
    static async getSuggestions(userId: string, type: 'follow' | 'friend' = 'follow', limit: number = 10) {
        try {
            // SECURITY FIX: Use parameterized queries to prevent SQL injection
            let suggestions;

            if (type === 'follow') {
                suggestions = await prisma.$queryRaw`
                    SELECT DISTINCT u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified,
                           COUNT(mutual.id) as mutual_count
                    FROM "User" u
                    JOIN "Follow" f1 ON f1."followingId" = u.id
                    JOIN "Follow" mutual ON mutual."followerId" = f1."followerId"
                    WHERE mutual."followingId" = ${userId}
                      AND u.id != ${userId}
                      AND NOT EXISTS (
                        SELECT 1 FROM "Follow" existing
                        WHERE existing."followerId" = ${userId} AND existing."followingId" = u.id
                      )
                    GROUP BY u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified
                    ORDER BY mutual_count DESC, u."followersCount" DESC
                    LIMIT ${limit}
                `;
            } else {
                suggestions = await prisma.$queryRaw`
                    SELECT DISTINCT u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified,
                           COUNT(mutual.id) as mutual_count
                    FROM "User" u
                    JOIN "Friendship" f1 ON (f1."requesterId" = u.id OR f1."recipientId" = u.id) AND f1.status = 'ACCEPTED'
                    JOIN "Friendship" mutual ON
                        (mutual."requesterId" = CASE WHEN f1."requesterId" = u.id THEN f1."recipientId" ELSE f1."requesterId" END
                         OR mutual."recipientId" = CASE WHEN f1."requesterId" = u.id THEN f1."recipientId" ELSE f1."requesterId" END)
                        AND mutual.status = 'ACCEPTED'
                    WHERE (mutual."requesterId" = ${userId} OR mutual."recipientId" = ${userId})
                      AND u.id != ${userId}
                      AND NOT EXISTS (
                        SELECT 1 FROM "Friendship" existing
                        WHERE (existing."requesterId" = ${userId} AND existing."recipientId" = u.id)
                           OR (existing."requesterId" = u.id AND existing."recipientId" = ${userId})
                      )
                    GROUP BY u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified
                    ORDER BY mutual_count DESC
                    LIMIT ${limit}
                `;
            }

            return {
                success: true,
                data: suggestions
            };

        } catch (error) {
            console.error('Get suggestions error:', error);
            return { success: false, message: 'Failed to get suggestions', error: error.message };
        }
    }
}