"use strict";
/**
 * Relationship Routes
 *
 * API endpoints for follow and friend functionality using reusable service layer
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const relationshipService_1 = require("../services/relationshipService");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
/**
 * FOLLOW ENDPOINTS
 */
/**
 * @swagger
 * /api/relationships/follow/{userId}:
 *   post:
 *     tags: [Relationship]
 *     summary: Follow a user
 *     description: Creates a follow relationship. Updates follower/following counts.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to follow
 *     responses:
 *       200:
 *         description: User followed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully followed user
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request - cannot follow self, already following, or user not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/follow/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FollowService.followUser(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Follow user route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/follow/{userId}:
 *   delete:
 *     tags: [Relationship]
 *     summary: Unfollow a user
 *     description: Removes follow relationship. Updates follower/following counts.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Not following user
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/follow/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FollowService.unfollowUser(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Unfollow user route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/follow-status/{userId}:
 *   get:
 *     tags: [Relationship]
 *     summary: Get follow status
 *     description: Checks if current user follows the specified user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/follow-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.FollowService.getFollowStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Get follow status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/{userId}/followers:
 *   get:
 *     tags: [Relationship]
 *     summary: Get followers list
 *     description: Returns paginated list of users following the specified user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Followers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followers:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/followers', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await relationshipService_1.FollowService.getFollowers(userId, parseInt(limit.toString()), parseInt(offset.toString()));
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get followers route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/{userId}/following:
 *   get:
 *     tags: [Relationship]
 *     summary: Get following list
 *     description: Returns paginated list of users that the specified user follows
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Following list retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/following', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await relationshipService_1.FollowService.getFollowing(userId, parseInt(limit.toString()), parseInt(offset.toString()));
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get following route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * SUBSCRIPTION ENDPOINTS
 */
/**
 * @swagger
 * /api/relationships/subscribe/{userId}:
 *   post:
 *     tags: [Relationship]
 *     summary: Subscribe to a user
 *     description: Creates subscription for enhanced notifications from user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscribed successfully
 *       400:
 *         description: Cannot subscribe (self, already subscribed, or not found)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/subscribe/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.SubscriptionService.subscribeToUser(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Subscribe to user route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Unsubscribe from a user
router.delete('/subscribe/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.SubscriptionService.unsubscribeFromUser(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Unsubscribe from user route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get subscription status
router.get('/subscription-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.SubscriptionService.getSubscriptionStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Get subscription status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get subscribers list
router.get('/:userId/subscribers', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await relationshipService_1.SubscriptionService.getSubscribers(userId, parseInt(limit.toString()), parseInt(offset.toString()));
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get subscribers route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get subscriptions list
router.get('/:userId/subscriptions', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await relationshipService_1.SubscriptionService.getSubscriptions(userId, parseInt(limit.toString()), parseInt(offset.toString()));
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get subscriptions route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * FRIEND ENDPOINTS
 */
/**
 * @swagger
 * /api/relationships/friend-request/{userId}:
 *   post:
 *     tags: [Relationship]
 *     summary: Send friend request
 *     description: Sends friendship request to user. Creates pending friendship.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request sent
 *       400:
 *         description: Cannot send request (self, already friends, already pending)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/friend-request/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FriendService.sendFriendRequest(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Send friend request route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/friend-request/{userId}/accept:
 *   post:
 *     tags: [Relationship]
 *     summary: Accept friend request
 *     description: Accepts pending friend request from user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request accepted
 *       400:
 *         description: No pending request found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/friend-request/:userId/accept', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FriendService.acceptFriendRequest(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Accept friend request route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/friend-request/{userId}/reject:
 *   post:
 *     tags: [Relationship]
 *     summary: Reject friend request
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request rejected
 *       400:
 *         description: No pending request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/friend-request/:userId/reject', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FriendService.rejectFriendRequest(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Reject friend request route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/friend/{userId}:
 *   delete:
 *     tags: [Relationship]
 *     summary: Remove friend
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed
 *       400:
 *         description: Not friends
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/friend/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FriendService.removeFriend(currentUserId, userId);
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Remove friend route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/friend-status/{userId}:
 *   get:
 *     tags: [Relationship]
 *     summary: Get friend status
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/friend-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.FriendService.getFriendStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Get friend status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/{userId}/friends:
 *   get:
 *     tags: [Relationship]
 *     summary: Get friends list
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Friends list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/friends', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await relationshipService_1.FriendService.getFriends(userId, parseInt(limit.toString()), parseInt(offset.toString()));
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get friends route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/friend-requests/pending:
 *   get:
 *     tags: [Relationship]
 *     summary: Get pending friend requests
 *     description: Returns friend requests received by current user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Pending requests retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/friend-requests/pending', auth_1.requireAuth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const result = await relationshipService_1.FriendService.getPendingRequests(currentUserId);
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, currentUserId: req.user.id }, 'Get pending requests route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * COMBINED ENDPOINTS
 */
/**
 * @swagger
 * /api/relationships/status/{userId}:
 *   get:
 *     tags: [Relationship]
 *     summary: Get combined relationship status
 *     description: Returns follow, friend, and subscription status in single call
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Combined status retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.RelationshipUtils.getCombinedStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Get combined status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/relationships/suggestions/{type}:
 *   get:
 *     tags: [Relationship]
 *     summary: Get suggestions
 *     description: Returns suggested users to follow or friend
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [follow, friend]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Suggestions retrieved
 *       400:
 *         description: Invalid type (must be 'follow' or 'friend')
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/suggestions/:type', auth_1.requireAuth, async (req, res) => {
    try {
        const { type } = req.params; // 'follow' or 'friend'
        const { limit = 10 } = req.query;
        const currentUserId = req.user.id;
        if (type !== 'follow' && type !== 'friend') {
            return res.status(400).json({ error: 'Invalid suggestion type. Use "follow" or "friend"' });
        }
        const result = await relationshipService_1.RelationshipUtils.getSuggestions(currentUserId, type, parseInt(limit.toString()));
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, type: req.params.type, currentUserId: req.user.id }, 'Get suggestions route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * BULK OPERATIONS (for efficiency)
 */
/**
 * @swagger
 * /api/relationships/bulk/follow-status:
 *   post:
 *     tags: [Relationship]
 *     summary: Get bulk follow status
 *     description: Returns follow status for multiple users (max 100)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Bulk status retrieved (returns object mapping userId to boolean)
 *       400:
 *         description: Invalid request (empty array or >100 users)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/bulk/follow-status', auth_1.requireAuth, async (req, res) => {
    try {
        const { userIds } = req.body;
        const currentUserId = req.user.id;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds array is required' });
        }
        if (userIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 users per request' });
        }
        const statusMap = await relationshipService_1.FollowService.getBulkFollowStatus(currentUserId, userIds);
        // Convert Map to object for JSON response
        const statusObject = Object.fromEntries(statusMap);
        res.json(statusObject);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userCount: req.body.userIds?.length, currentUserId: req.user.id }, 'Bulk follow status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get bulk friend status for multiple users
router.post('/bulk/friend-status', auth_1.requireAuth, async (req, res) => {
    try {
        const { userIds } = req.body;
        const currentUserId = req.user.id;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds array is required' });
        }
        if (userIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 users per request' });
        }
        const statusMap = await relationshipService_1.FriendService.getBulkFriendStatus(currentUserId, userIds);
        // Convert Map to object for JSON response
        const statusObject = Object.fromEntries(statusMap);
        res.json(statusObject);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userCount: req.body.userIds?.length, currentUserId: req.user.id }, 'Bulk friend status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get bulk subscription status for multiple users
router.post('/bulk/subscription-status', auth_1.requireAuth, async (req, res) => {
    try {
        const { userIds } = req.body;
        const currentUserId = req.user.id;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds array is required' });
        }
        if (userIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 users per request' });
        }
        const statusMap = await relationshipService_1.SubscriptionService.getBulkSubscriptionStatus(currentUserId, userIds);
        // Convert Map to object for JSON response
        const statusObject = Object.fromEntries(statusMap);
        res.json(statusObject);
    }
    catch (error) {
        logger_1.logger.error({ err: error, userCount: req.body.userIds?.length, currentUserId: req.user.id }, 'Bulk subscription status route error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=relationships.js.map