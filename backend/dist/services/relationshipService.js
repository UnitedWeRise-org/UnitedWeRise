"use strict";
/**
 * Relationship Service
 *
 * Reusable service layer for managing user relationships (following and friendships)
 * Can be used across different contexts: API routes, components, background jobs, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipUtils = exports.FriendService = exports.FollowService = exports.FriendshipStatus = exports.RelationshipType = void 0;
const client_1 = require("@prisma/client");
const notifications_1 = require("../routes/notifications");
const prisma = new client_1.PrismaClient();
var RelationshipType;
(function (RelationshipType) {
    RelationshipType["FOLLOW"] = "FOLLOW";
    RelationshipType["FRIEND"] = "FRIEND";
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
                (0, notifications_1.createNotification)('FOLLOW', followerId, followingId, `${follower.username} started following you`).catch(console.error);
            }
            return {
                success: true,
                message: 'Successfully followed user',
                data: { followerId, followingId, followedAt: new Date() }
            };
        }
        catch (error) {
            console.error('Follow user error:', error);
            return { success: false, message: 'Failed to follow user', error: error.message };
        }
    }
    /**
     * Unfollow a user
     */
    static async unfollowUser(followerId, followingId) {
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
        }
        catch (error) {
            console.error('Unfollow user error:', error);
            return { success: false, message: 'Failed to unfollow user', error: error.message };
        }
    }
    /**
     * Get follow status between two users
     */
    static async getFollowStatus(followerId, followingId) {
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
        }
        catch (error) {
            console.error('Get follow status error:', error);
            return { isFollowing: false };
        }
    }
    /**
     * Get followers list for a user
     */
    static async getFollowers(userId, limit = 20, offset = 0) {
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
        }
        catch (error) {
            console.error('Get followers error:', error);
            return { success: false, message: 'Failed to get followers', error: error.message };
        }
    }
    /**
     * Get following list for a user
     */
    static async getFollowing(userId, limit = 20, offset = 0) {
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
        }
        catch (error) {
            console.error('Get following error:', error);
            return { success: false, message: 'Failed to get following', error: error.message };
        }
    }
    /**
     * Bulk follow status check - useful for user lists
     */
    static async getBulkFollowStatus(currentUserId, userIds) {
        try {
            const follows = await prisma.follow.findMany({
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
            console.error('Bulk follow status error:', error);
            return new Map();
        }
    }
}
exports.FollowService = FollowService;
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
                }
                else {
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
                (0, notifications_1.createNotification)('FRIEND_REQUEST', requesterId, recipientId, `${requester.username} sent you a friend request`).catch(console.error);
            }
            return {
                success: true,
                message: 'Friend request sent successfully',
                data: { requesterId, recipientId, status: FriendshipStatus.PENDING }
            };
        }
        catch (error) {
            console.error('Send friend request error:', error);
            return { success: false, message: 'Failed to send friend request', error: error.message };
        }
    }
    /**
     * Accept friend request
     */
    static async acceptFriendRequest(userId, friendId) {
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
                (0, notifications_1.createNotification)('FRIEND_ACCEPTED', userId, friendId, `${accepter.username} accepted your friend request`).catch(console.error);
            }
            return {
                success: true,
                message: 'Friend request accepted',
                data: { userId, friendId, status: FriendshipStatus.ACCEPTED }
            };
        }
        catch (error) {
            console.error('Accept friend request error:', error);
            return { success: false, message: 'Failed to accept friend request', error: error.message };
        }
    }
    /**
     * Reject friend request
     */
    static async rejectFriendRequest(userId, friendId) {
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
        }
        catch (error) {
            console.error('Reject friend request error:', error);
            return { success: false, message: 'Failed to reject friend request', error: error.message };
        }
    }
    /**
     * Remove friend / Unfriend
     */
    static async removeFriend(userId, friendId) {
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
        }
        catch (error) {
            console.error('Remove friend error:', error);
            return { success: false, message: 'Failed to remove friend', error: error.message };
        }
    }
    /**
     * Get friend status between two users
     */
    static async getFriendStatus(userId, otherUserId) {
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
                friendshipStatus: friendship.status,
                requestSentByCurrentUser: friendship.requesterId === userId,
                friendsSince: friendship.acceptedAt || undefined
            };
        }
        catch (error) {
            console.error('Get friend status error:', error);
            return { isFriend: false };
        }
    }
    /**
     * Get friends list
     */
    static async getFriends(userId, limit = 20, offset = 0) {
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
        }
        catch (error) {
            console.error('Get friends error:', error);
            return { success: false, message: 'Failed to get friends', error: error.message };
        }
    }
    /**
     * Get pending friend requests (received)
     */
    static async getPendingRequests(userId) {
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
        }
        catch (error) {
            console.error('Get pending requests error:', error);
            return { success: false, message: 'Failed to get pending requests', error: error.message };
        }
    }
    /**
     * Bulk friend status check - useful for user lists
     */
    static async getBulkFriendStatus(currentUserId, userIds) {
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
            console.error('Bulk friend status error:', error);
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
        const [followStatus, friendStatus] = await Promise.all([
            FollowService.getFollowStatus(currentUserId, targetUserId),
            FriendService.getFriendStatus(currentUserId, targetUserId)
        ]);
        return {
            follow: followStatus,
            friend: friendStatus,
            canMessage: friendStatus.isFriend, // Only friends can message
            displayPriority: friendStatus.isFriend ? 'friend' : (followStatus.isFollowing ? 'following' : 'none')
        };
    }
    /**
     * Suggest people to follow/friend based on mutual connections
     */
    static async getSuggestions(userId, type = 'follow', limit = 10) {
        try {
            // Get mutual connections through followers/friends
            const mutualQuery = type === 'follow' ? `
                SELECT DISTINCT u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified,
                       COUNT(mutual.id) as mutual_count
                FROM "User" u
                JOIN "Follow" f1 ON f1."followingId" = u.id
                JOIN "Follow" mutual ON mutual."followerId" = f1."followerId"
                WHERE mutual."followingId" = $1 
                  AND u.id != $1
                  AND NOT EXISTS (
                    SELECT 1 FROM "Follow" existing 
                    WHERE existing."followerId" = $1 AND existing."followingId" = u.id
                  )
                GROUP BY u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified
                ORDER BY mutual_count DESC, u."followersCount" DESC
                LIMIT $2
            ` : `
                SELECT DISTINCT u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified,
                       COUNT(mutual.id) as mutual_count
                FROM "User" u
                JOIN "Friendship" f1 ON (f1."requesterId" = u.id OR f1."recipientId" = u.id) AND f1.status = 'ACCEPTED'
                JOIN "Friendship" mutual ON 
                    (mutual."requesterId" = CASE WHEN f1."requesterId" = u.id THEN f1."recipientId" ELSE f1."requesterId" END
                     OR mutual."recipientId" = CASE WHEN f1."requesterId" = u.id THEN f1."recipientId" ELSE f1."requesterId" END)
                    AND mutual.status = 'ACCEPTED'
                WHERE (mutual."requesterId" = $1 OR mutual."recipientId" = $1)
                  AND u.id != $1
                  AND NOT EXISTS (
                    SELECT 1 FROM "Friendship" existing 
                    WHERE (existing."requesterId" = $1 AND existing."recipientId" = u.id)
                       OR (existing."requesterId" = u.id AND existing."recipientId" = $1)
                  )
                GROUP BY u.id, u.username, u."firstName", u."lastName", u.avatar, u.verified
                ORDER BY mutual_count DESC
                LIMIT $2
            `;
            const suggestions = await prisma.$queryRawUnsafe(mutualQuery, userId, limit);
            return {
                success: true,
                data: suggestions
            };
        }
        catch (error) {
            console.error('Get suggestions error:', error);
            return { success: false, message: 'Failed to get suggestions', error: error.message };
        }
    }
}
exports.RelationshipUtils = RelationshipUtils;
//# sourceMappingURL=relationshipService.js.map