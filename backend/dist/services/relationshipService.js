"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipUtils = exports.FriendService = exports.SubscriptionService = exports.FollowService = exports.FriendshipStatus = exports.RelationshipType = void 0;
const prisma_1 = require("../lib/prisma");
/**
 * Relationship Service
 *
 * Reusable service layer for managing user relationships (following and friendships)
 * Can be used across different contexts: API routes, components, background jobs, etc.
 */
;
const notifications_1 = require("../routes/notifications");
const logger_1 = require("./logger");
// Using singleton prisma from lib/prisma.ts
var RelationshipType;
(function (RelationshipType) {
    RelationshipType["FOLLOW"] = "FOLLOW";
    RelationshipType["FRIEND"] = "FRIEND";
    RelationshipType["SUBSCRIPTION"] = "SUBSCRIPTION";
})(RelationshipType || (exports.RelationshipType = RelationshipType = {}));
var FriendshipStatus;
(function (FriendshipStatus) {
    FriendshipStatus["PENDING"] = "PENDING";
    FriendshipStatus["ACCEPTED"] = "ACCEPTED";
    FriendshipStatus["REJECTED"] = "REJECTED";
    FriendshipStatus["BLOCKED"] = "BLOCKED";
})(FriendshipStatus || (exports.FriendshipStatus = FriendshipStatus = {}));
/**
 * FOLLOW SYSTEM - Reusable Functions
 */
class FollowService {
    /**
     * Follow a user
     */
    static async followUser(followerId, followingId) {
        try {
            // Validation
            if (followerId === followingId) {
                return { success: false, message: 'Cannot follow yourself' };
            }
            // Check if user exists
            const userToFollow = await prisma_1.prisma.user.findUnique({
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
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.follow.create({
                    data: {
                        followerId,
                        followingId
                    }
                }),
                prisma_1.prisma.user.update({
                    where: { id: followerId },
                    data: { followingCount: { increment: 1 } }
                }),
                prisma_1.prisma.user.update({
                    where: { id: followingId },
                    data: { followersCount: { increment: 1 } }
                })
            ]);
            // Create notification (async, don't block response)
            const follower = await prisma_1.prisma.user.findUnique({
                where: { id: followerId },
                select: { username: true }
            });
            if (follower) {
                (0, notifications_1.createNotification)('FOLLOW', followerId, followingId, `${follower.username} started following you`).catch(error => logger_1.logger.error({ error }, 'Failed to create follow notification'));
            }
            return {
                success: true,
                message: 'Successfully followed user',
                data: { followerId, followingId, followedAt: new Date() }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, followerId, followingId }, 'Follow user error');
            return { success: false, message: 'Failed to follow user', error: error.message };
        }
    }
    /**
     * Unfollow a user
     */
    static async unfollowUser(followerId, followingId) {
        try {
            // Check if following
            const existingFollow = await prisma_1.prisma.follow.findUnique({
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
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.follow.delete({
                    where: {
                        followerId_followingId: {
                            followerId,
                            followingId
                        }
                    }
                }),
                prisma_1.prisma.user.update({
                    where: { id: followerId },
                    data: { followingCount: { decrement: 1 } }
                }),
                prisma_1.prisma.user.update({
                    where: { id: followingId },
                    data: { followersCount: { decrement: 1 } }
                })
            ]);
            return {
                success: true,
                message: 'Successfully unfollowed user',
                data: { followerId, followingId }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, followerId, followingId }, 'Unfollow user error');
            return { success: false, message: 'Failed to unfollow user', error: error.message };
        }
    }
    /**
     * Get follow status between two users
     */
    static async getFollowStatus(followerId, followingId) {
        try {
            const follow = await prisma_1.prisma.follow.findUnique({
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
        }
        catch (error) {
            logger_1.logger.error({ error, followerId, followingId }, 'Get follow status error');
            return { isFollowing: false };
        }
    }
    /**
     * Get followers list for a user
     */
    static async getFollowers(userId, limit = 20, offset = 0) {
        try {
            const followers = await prisma_1.prisma.follow.findMany({
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
            const total = await prisma_1.prisma.follow.count({
                where: { followingId: userId }
            });
            return {
                success: true,
                data: {
                    followers: followers.map(f => f.follower),
                    pagination: { limit, offset, total }
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Get followers error');
            return { success: false, message: 'Failed to get followers', error: error.message };
        }
    }
    /**
     * Get following list for a user
     */
    static async getFollowing(userId, limit = 20, offset = 0) {
        try {
            const following = await prisma_1.prisma.follow.findMany({
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
            const total = await prisma_1.prisma.follow.count({
                where: { followerId: userId }
            });
            return {
                success: true,
                data: {
                    following: following.map(f => f.following),
                    pagination: { limit, offset, total }
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Get following error');
            return { success: false, message: 'Failed to get following', error: error.message };
        }
    }
    /**
     * Bulk follow status check - useful for user lists
     */
    static async getBulkFollowStatus(currentUserId, userIds) {
        try {
            const follows = await prisma_1.prisma.follow.findMany({
                where: {
                    followerId: currentUserId,
                    followingId: { in: userIds }
                },
                select: { followingId: true }
            });
            const followMap = new Map();
            userIds.forEach(id => followMap.set(id, false));
            follows.forEach(follow => followMap.set(follow.followingId, true));
            return followMap;
        }
        catch (error) {
            logger_1.logger.error({ error, currentUserId }, 'Bulk follow status error');
            return new Map();
        }
    }
}
exports.FollowService = FollowService;
/**
 * SUBSCRIPTION SYSTEM - Reusable Functions
 */
class SubscriptionService {
    /**
     * Subscribe to a user (high-priority follow for algorithmic boost)
     */
    static async subscribeToUser(subscriberId, subscribedId) {
        try {
            // Validation
            if (subscriberId === subscribedId) {
                return { success: false, message: 'Cannot subscribe to yourself' };
            }
            // Check if user exists
            const userToSubscribe = await prisma_1.prisma.user.findUnique({
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
            await prisma_1.prisma.subscription.create({
                data: {
                    subscriberId,
                    subscribedId
                }
            });
            // Create notification (async, don't block response)
            const subscriber = await prisma_1.prisma.user.findUnique({
                where: { id: subscriberId },
                select: { username: true }
            });
            if (subscriber) {
                (0, notifications_1.createNotification)('FOLLOW', subscriberId, subscribedId, `${subscriber.username} subscribed to your posts`).catch(error => logger_1.logger.error({ error }, 'Failed to create subscription notification'));
            }
            return {
                success: true,
                message: 'Successfully subscribed to user',
                data: { subscriberId, subscribedId, subscribedAt: new Date() }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, subscriberId, subscribedId }, 'Subscribe to user error');
            return { success: false, message: 'Failed to subscribe to user', error: error.message };
        }
    }
    /**
     * Unsubscribe from a user
     */
    static async unsubscribeFromUser(subscriberId, subscribedId) {
        try {
            // Check if subscribed
            const existingSubscription = await prisma_1.prisma.subscription.findUnique({
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
            await prisma_1.prisma.subscription.delete({
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
        }
        catch (error) {
            logger_1.logger.error({ error, subscriberId, subscribedId }, 'Unsubscribe from user error');
            return { success: false, message: 'Failed to unsubscribe from user', error: error.message };
        }
    }
    /**
     * Get subscription status between two users
     */
    static async getSubscriptionStatus(subscriberId, subscribedId) {
        try {
            const subscription = await prisma_1.prisma.subscription.findUnique({
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
        }
        catch (error) {
            logger_1.logger.error({ error, subscriberId, subscribedId }, 'Get subscription status error');
            return { isSubscribed: false };
        }
    }
    /**
     * Get subscribers list for a user
     */
    static async getSubscribers(userId, limit = 20, offset = 0) {
        try {
            const subscribers = await prisma_1.prisma.subscription.findMany({
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
            const total = await prisma_1.prisma.subscription.count({
                where: { subscribedId: userId }
            });
            return {
                success: true,
                data: {
                    subscribers: subscribers.map(s => s.subscriber),
                    pagination: { limit, offset, total }
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Get subscribers error');
            return { success: false, message: 'Failed to get subscribers', error: error.message };
        }
    }
    /**
     * Get subscriptions list for a user
     */
    static async getSubscriptions(userId, limit = 20, offset = 0) {
        try {
            const subscriptions = await prisma_1.prisma.subscription.findMany({
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
            const total = await prisma_1.prisma.subscription.count({
                where: { subscriberId: userId }
            });
            return {
                success: true,
                data: {
                    subscriptions: subscriptions.map(s => s.subscribed),
                    pagination: { limit, offset, total }
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Get subscriptions error');
            return { success: false, message: 'Failed to get subscriptions', error: error.message };
        }
    }
    /**
     * Bulk subscription status check - useful for user lists
     */
    static async getBulkSubscriptionStatus(currentUserId, userIds) {
        try {
            const subscriptions = await prisma_1.prisma.subscription.findMany({
                where: {
                    subscriberId: currentUserId,
                    subscribedId: { in: userIds }
                },
                select: { subscribedId: true }
            });
            const subscriptionMap = new Map();
            userIds.forEach(id => subscriptionMap.set(id, false));
            subscriptions.forEach(subscription => subscriptionMap.set(subscription.subscribedId, true));
            return subscriptionMap;
        }
        catch (error) {
            logger_1.logger.error({ error, currentUserId }, 'Bulk subscription status error');
            return new Map();
        }
    }
}
exports.SubscriptionService = SubscriptionService;
/**
 * FRIEND SYSTEM - Reusable Functions
 */
class FriendService {
    /**
     * Send friend request
     */
    static async sendFriendRequest(requesterId, recipientId) {
        try {
            // Validation
            if (requesterId === recipientId) {
                return { success: false, message: 'Cannot send friend request to yourself' };
            }
            // Check if user exists
            const recipient = await prisma_1.prisma.user.findUnique({
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
                }
                else {
                    // They sent us a request, auto-accept
                    return await this.acceptFriendRequest(requesterId, recipientId);
                }
            }
            // Create friend request
            await prisma_1.prisma.friendship.create({
                data: {
                    requesterId,
                    recipientId,
                    status: FriendshipStatus.PENDING
                }
            });
            // Create notification
            const requester = await prisma_1.prisma.user.findUnique({
                where: { id: requesterId },
                select: { username: true }
            });
            if (requester) {
                (0, notifications_1.createNotification)('FRIEND_REQUEST', requesterId, recipientId, `${requester.username} sent you a friend request`).catch(error => logger_1.logger.error({ error }, 'Failed to create friend request notification'));
            }
            return {
                success: true,
                message: 'Friend request sent successfully',
                data: { requesterId, recipientId, status: FriendshipStatus.PENDING }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, requesterId, recipientId }, 'Send friend request error');
            return { success: false, message: 'Failed to send friend request', error: error.message };
        }
    }
    /**
     * Accept friend request
     */
    static async acceptFriendRequest(userId, friendId) {
        try {
            // Find pending request where current user is the recipient
            const friendRequest = await prisma_1.prisma.friendship.findFirst({
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
            await prisma_1.prisma.friendship.update({
                where: { id: friendRequest.id },
                data: {
                    status: FriendshipStatus.ACCEPTED,
                    acceptedAt: new Date()
                }
            });
            // Create notification
            const accepter = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });
            if (accepter) {
                (0, notifications_1.createNotification)('FRIEND_ACCEPTED', userId, friendId, `${accepter.username} accepted your friend request`).catch(error => logger_1.logger.error({ error }, 'Failed to create friend accepted notification'));
            }
            return {
                success: true,
                message: 'Friend request accepted',
                data: { userId, friendId, status: FriendshipStatus.ACCEPTED }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, friendId }, 'Accept friend request error');
            return { success: false, message: 'Failed to accept friend request', error: error.message };
        }
    }
    /**
     * Reject friend request
     */
    static async rejectFriendRequest(userId, friendId) {
        try {
            const friendRequest = await prisma_1.prisma.friendship.findFirst({
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
            await prisma_1.prisma.friendship.update({
                where: { id: friendRequest.id },
                data: { status: FriendshipStatus.REJECTED }
            });
            return {
                success: true,
                message: 'Friend request rejected',
                data: { userId, friendId, status: FriendshipStatus.REJECTED }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, friendId }, 'Reject friend request error');
            return { success: false, message: 'Failed to reject friend request', error: error.message };
        }
    }
    /**
     * Remove friend / Unfriend
     */
    static async removeFriend(userId, friendId) {
        try {
            const friendship = await prisma_1.prisma.friendship.findFirst({
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
            await prisma_1.prisma.friendship.delete({
                where: { id: friendship.id }
            });
            return {
                success: true,
                message: 'Friend removed successfully',
                data: { userId, friendId }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, friendId }, 'Remove friend error');
            return { success: false, message: 'Failed to remove friend', error: error.message };
        }
    }
    /**
     * Get friend status between two users
     */
    static async getFriendStatus(userId, otherUserId) {
        try {
            const friendship = await prisma_1.prisma.friendship.findFirst({
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
                friendshipStatus: friendship.status,
                requestSentByCurrentUser: friendship.requesterId === userId,
                friendsSince: friendship.acceptedAt || undefined
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, otherUserId }, 'Get friend status error');
            return { isFriend: false };
        }
    }
    /**
     * Get friends list
     */
    static async getFriends(userId, limit = 20, offset = 0) {
        try {
            const friendships = await prisma_1.prisma.friendship.findMany({
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
            const total = await prisma_1.prisma.friendship.count({
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Get friends error');
            return { success: false, message: 'Failed to get friends', error: error.message };
        }
    }
    /**
     * Get pending friend requests (received)
     */
    static async getPendingRequests(userId) {
        try {
            const requests = await prisma_1.prisma.friendship.findMany({
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Get pending requests error');
            return { success: false, message: 'Failed to get pending requests', error: error.message };
        }
    }
    /**
     * Bulk friend status check - useful for user lists
     */
    static async getBulkFriendStatus(currentUserId, userIds) {
        try {
            const friendships = await prisma_1.prisma.friendship.findMany({
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
            const friendMap = new Map();
            // Initialize all as not friends
            userIds.forEach(id => friendMap.set(id, { isFriend: false }));
            // Update with actual statuses
            friendships.forEach(friendship => {
                const otherUserId = friendship.requesterId === currentUserId
                    ? friendship.recipientId
                    : friendship.requesterId;
                friendMap.set(otherUserId, {
                    isFriend: friendship.status === FriendshipStatus.ACCEPTED,
                    friendshipStatus: friendship.status,
                    requestSentByCurrentUser: friendship.requesterId === currentUserId,
                    friendsSince: friendship.acceptedAt || undefined
                });
            });
            return friendMap;
        }
        catch (error) {
            logger_1.logger.error({ error, currentUserId }, 'Bulk friend status error');
            return new Map();
        }
    }
}
exports.FriendService = FriendService;
/**
 * COMBINED UTILITIES
 */
class RelationshipUtils {
    /**
     * Get combined relationship status for display in UI
     */
    static async getCombinedStatus(currentUserId, targetUserId) {
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
    static async getSuggestions(userId, type = 'follow', limit = 10) {
        try {
            // SECURITY FIX: Use parameterized queries to prevent SQL injection
            let suggestions;
            if (type === 'follow') {
                suggestions = await prisma_1.prisma.$queryRaw `
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
            }
            else {
                suggestions = await prisma_1.prisma.$queryRaw `
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId, type }, 'Get suggestions error');
            return { success: false, message: 'Failed to get suggestions', error: error.message };
        }
    }
}
exports.RelationshipUtils = RelationshipUtils;
//# sourceMappingURL=relationshipService.js.map