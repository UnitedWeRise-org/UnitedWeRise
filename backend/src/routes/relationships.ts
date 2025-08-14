/**
 * Relationship Routes
 * 
 * API endpoints for follow and friend functionality using reusable service layer
 */

import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { FollowService, FriendService, RelationshipUtils } from '../services/relationshipService';

const router = express.Router();

/**
 * FOLLOW ENDPOINTS
 */

// Follow a user
router.post('/follow/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const result = await FollowService.followUser(currentUserId, userId);
        
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Follow user route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unfollow a user
router.delete('/follow/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const result = await FollowService.unfollowUser(currentUserId, userId);
        
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Unfollow user route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get follow status
router.get('/follow-status/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const status = await FollowService.getFollowStatus(currentUserId, userId);
        res.json(status);
    } catch (error) {
        console.error('Get follow status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get followers list
router.get('/:userId/followers', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const result = await FollowService.getFollowers(
            userId, 
            parseInt(limit.toString()), 
            parseInt(offset.toString())
        );

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Get followers route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get following list
router.get('/:userId/following', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const result = await FollowService.getFollowing(
            userId, 
            parseInt(limit.toString()), 
            parseInt(offset.toString())
        );

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Get following route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * FRIEND ENDPOINTS
 */

// Send friend request
router.post('/friend-request/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const result = await FriendService.sendFriendRequest(currentUserId, userId);
        
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Send friend request route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept friend request
router.post('/friend-request/:userId/accept', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const result = await FriendService.acceptFriendRequest(currentUserId, userId);
        
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Accept friend request route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reject friend request
router.post('/friend-request/:userId/reject', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const result = await FriendService.rejectFriendRequest(currentUserId, userId);
        
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Reject friend request route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove friend
router.delete('/friend/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const result = await FriendService.removeFriend(currentUserId, userId);
        
        if (result.success) {
            res.json({ message: result.message, data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Remove friend route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get friend status
router.get('/friend-status/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const status = await FriendService.getFriendStatus(currentUserId, userId);
        res.json(status);
    } catch (error) {
        console.error('Get friend status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get friends list
router.get('/:userId/friends', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const result = await FriendService.getFriends(
            userId, 
            parseInt(limit.toString()), 
            parseInt(offset.toString())
        );

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Get friends route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get pending friend requests (received by current user)
router.get('/friend-requests/pending', requireAuth, async (req: AuthRequest, res) => {
    try {
        const currentUserId = req.user!.id;

        const result = await FriendService.getPendingRequests(currentUserId);
        
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Get pending requests route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * COMBINED ENDPOINTS
 */

// Get combined relationship status
router.get('/status/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const status = await RelationshipUtils.getCombinedStatus(currentUserId, userId);
        res.json(status);
    } catch (error) {
        console.error('Get combined status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get suggestions (people to follow/friend)
router.get('/suggestions/:type', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { type } = req.params; // 'follow' or 'friend'
        const { limit = 10 } = req.query;
        const currentUserId = req.user!.id;

        if (type !== 'follow' && type !== 'friend') {
            return res.status(400).json({ error: 'Invalid suggestion type. Use "follow" or "friend"' });
        }

        const result = await RelationshipUtils.getSuggestions(
            currentUserId, 
            type as 'follow' | 'friend', 
            parseInt(limit.toString())
        );

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Get suggestions route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * BULK OPERATIONS (for efficiency)
 */

// Get bulk follow status for multiple users
router.post('/bulk/follow-status', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userIds } = req.body;
        const currentUserId = req.user!.id;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds array is required' });
        }

        if (userIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 users per request' });
        }

        const statusMap = await FollowService.getBulkFollowStatus(currentUserId, userIds);
        
        // Convert Map to object for JSON response
        const statusObject = Object.fromEntries(statusMap);
        res.json(statusObject);
    } catch (error) {
        console.error('Bulk follow status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bulk friend status for multiple users
router.post('/bulk/friend-status', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userIds } = req.body;
        const currentUserId = req.user!.id;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds array is required' });
        }

        if (userIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 users per request' });
        }

        const statusMap = await FriendService.getBulkFriendStatus(currentUserId, userIds);
        
        // Convert Map to object for JSON response
        const statusObject = Object.fromEntries(statusMap);
        res.json(statusObject);
    } catch (error) {
        console.error('Bulk friend status route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;