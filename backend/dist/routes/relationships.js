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
const router = express_1.default.Router();
/**
 * FOLLOW ENDPOINTS
 */
// Follow a user
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
        console.error('Follow user route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Unfollow a user
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
        console.error('Unfollow user route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get follow status
router.get('/follow-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.FollowService.getFollowStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        console.error('Get follow status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get followers list
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
        console.error('Get followers route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get following list
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
        console.error('Get following route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * SUBSCRIPTION ENDPOINTS
 */
// Subscribe to a user
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
        console.error('Subscribe to user route error:', error);
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
        console.error('Unsubscribe from user route error:', error);
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
        console.error('Get subscription status route error:', error);
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
        console.error('Get subscribers route error:', error);
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
        console.error('Get subscriptions route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * FRIEND ENDPOINTS
 */
// Send friend request
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
        console.error('Send friend request route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Accept friend request
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
        console.error('Accept friend request route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Reject friend request
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
        console.error('Reject friend request route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Remove friend
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
        console.error('Remove friend route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get friend status
router.get('/friend-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.FriendService.getFriendStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        console.error('Get friend status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get friends list
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
        console.error('Get friends route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get pending friend requests (received by current user)
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
        console.error('Get pending requests route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * COMBINED ENDPOINTS
 */
// Get combined relationship status
router.get('/status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.RelationshipUtils.getCombinedStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        console.error('Get combined status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get suggestions (people to follow/friend)
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
        console.error('Get suggestions route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * BULK OPERATIONS (for efficiency)
 */
// Get bulk follow status for multiple users
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
        console.error('Bulk follow status route error:', error);
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
        console.error('Bulk friend status route error:', error);
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
        console.error('Bulk subscription status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=relationships.js.map