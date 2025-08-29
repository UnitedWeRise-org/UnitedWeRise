"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const relationshipService_1 = require("../services/relationshipService");
const photoService_1 = require("../services/photoService");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
// Get current user's full profile
router.get('/profile', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                website: true,
                location: true,
                verified: true,
                followersCount: true,
                followingCount: true,
                createdAt: true,
                backgroundImage: true,
                // Address fields
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
                // Political profile fields
                politicalProfileType: true,
                verificationStatus: true,
                office: true,
                officialTitle: true,
                politicalParty: true,
                campaignWebsite: true,
                // Preferences
                notificationPreferences: true,
                // Photo tagging preferences 
                photoTaggingEnabled: true,
                requireTagApproval: true,
                allowTagsByFriendsOnly: true,
                // Candidate profile relation
                candidateProfile: {
                    select: {
                        id: true,
                        name: true,
                        office: true,
                        status: true
                    }
                }
            }
        });
        res.json({ user });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update current user's profile
router.put('/profile', auth_1.requireAuth, validation_1.validateProfileUpdate, async (req, res) => {
    try {
        const { firstName, lastName, bio, website, location } = req.body;
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                firstName,
                lastName,
                bio,
                website,
                location
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                website: true,
                location: true,
                verified: true,
                followersCount: true,
                followingCount: true
            }
        });
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get public user profile (no authentication required)
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                website: true,
                location: true,
                verified: true,
                followersCount: true,
                followingCount: true,
                createdAt: true,
                backgroundImage: true,
                // Public political profile fields only
                politicalProfileType: true,
                verificationStatus: true,
                office: true,
                officialTitle: true,
                politicalParty: true,
                campaignWebsite: true,
                // Hide private fields - no email, address, etc.
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get public user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Follow a user (using reusable service)
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
        console.error('Follow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Unfollow a user (using reusable service)
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
        console.error('Unfollow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Search users
router.get('/search', auth_1.requireAuth, async (req, res) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        const currentUserId = req.user.id;
        const users = await prisma_1.prisma.user.findMany({
            where: {
                OR: [
                    {
                        username: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        firstName: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        lastName: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                verified: true,
                followersCount: true,
                state: true,
                zipCode: true,
                city: true,
                office: true, // May contain district info
                followers: {
                    where: { followerId: currentUserId },
                    select: { id: true }
                }
            },
            take: limitNum,
            skip: offsetNum,
            orderBy: [
                { followersCount: 'desc' },
                { username: 'asc' }
            ]
        });
        // Transform to include isFollowing flag
        const usersWithFollowStatus = users.map(user => ({
            ...user,
            isFollowing: user.followers.length > 0,
            followers: undefined // Remove the followers array from response
        }));
        res.json({
            users: usersWithFollowStatus,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: usersWithFollowStatus.length
            }
        });
    }
    catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 🎯 OPTIMIZED: Get complete user profile (batches 5-6 API calls into 1)
// Replaces: /users/:id + /posts/user/:id + /users/:id/followers + /users/:id/following + /users/follow-status/:id
router.get('/:userId/complete', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Get authenticated user ID if available
        const currentUserId = req.user?.id;
        // Parallel fetch all profile-related data
        const [user, posts, followersCount, followingCount, relationshipStatus] = await Promise.all([
            // User profile data
            prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    bio: true,
                    website: true,
                    location: true,
                    verified: true,
                    followersCount: true,
                    followingCount: true,
                    createdAt: true,
                    backgroundImage: true,
                    // Public political profile fields
                    politicalProfileType: true,
                    verificationStatus: true,
                    office: true,
                    officialTitle: true,
                    politicalParty: true,
                    campaignWebsite: true,
                    _count: {
                        select: {
                            posts: true,
                            followers: true,
                            following: true
                        }
                    }
                }
            }),
            // User's posts
            prisma_1.prisma.post.findMany({
                where: { authorId: userId },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true,
                            politicalProfileType: true
                        }
                    },
                    _count: {
                        select: {
                            comments: true,
                            likes: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limitNum,
                skip: offsetNum
            }),
            // Followers count (actual count for accuracy)
            prisma_1.prisma.follow.count({
                where: { followingId: userId }
            }),
            // Following count (actual count for accuracy) 
            prisma_1.prisma.follow.count({
                where: { followerId: userId }
            }),
            // Relationship status with current user (if authenticated)
            currentUserId ? Promise.all([
                // Check if current user follows this user
                prisma_1.prisma.follow.findFirst({
                    where: {
                        followerId: currentUserId,
                        followingId: userId
                    }
                }),
                // Check if this user follows current user
                prisma_1.prisma.follow.findFirst({
                    where: {
                        followerId: userId,
                        followingId: currentUserId
                    }
                }),
                // Check friendship status
                prisma_1.prisma.friendship.findFirst({
                    where: {
                        OR: [
                            { requesterId: currentUserId, recipientId: userId },
                            { requesterId: userId, recipientId: currentUserId }
                        ]
                    }
                })
            ]) : [null, null, null]
        ]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Process relationship status
        const [isFollowing, isFollower, friendship] = relationshipStatus;
        let friendshipStatus = 'none';
        if (friendship) {
            if (friendship.status === 'ACCEPTED') {
                friendshipStatus = 'friends';
            }
            else if (friendship.status === 'PENDING') {
                friendshipStatus = friendship.requesterId === currentUserId ? 'request_sent' : 'request_received';
            }
        }
        // Return complete profile data
        res.json({
            success: true,
            data: {
                user: {
                    ...user,
                    followersCount: followersCount,
                    followingCount: followingCount,
                    postsCount: user._count.posts
                },
                posts: {
                    items: posts,
                    pagination: {
                        limit: limitNum,
                        offset: offsetNum,
                        count: posts.length,
                        hasMore: posts.length === limitNum
                    }
                },
                relationship: currentUserId ? {
                    isFollowing: !!isFollowing,
                    isFollower: !!isFollower,
                    friendshipStatus,
                    canMessage: true // Could add logic for message permissions
                } : null,
                optimized: true // Flag to indicate this is the batched endpoint
            }
        });
    }
    catch (error) {
        console.error('Get complete user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get public profile by username
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                website: true,
                location: true,
                verified: true,
                followersCount: true,
                followingCount: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get followers list
router.get('/:userId/followers', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
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
            take: limitNum,
            skip: offsetNum,
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            followers: followers.map(f => f.follower),
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: followers.length
            }
        });
    }
    catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get following list
router.get('/:userId/following', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
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
            take: limitNum,
            skip: offsetNum,
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            following: following.map(f => f.following),
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: following.length
            }
        });
    }
    catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Check if current user is following another user (using reusable service)
router.get('/follow-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const status = await relationshipService_1.FollowService.getFollowStatus(currentUserId, userId);
        res.json(status);
    }
    catch (error) {
        console.error('Check follow status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Rate limiting for background image uploads
const backgroundUploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 uploads per hour
    message: {
        error: 'Too many background image upload attempts',
        message: 'Please wait before uploading another background image'
    }
});
// Upload background image
router.post('/background-image', auth_1.requireAuth, backgroundUploadLimiter, async (req, res) => {
    const upload = photoService_1.PhotoService.getMulterConfig();
    upload.single('backgroundImage')(req, res, async (err) => {
        if (err) {
            console.error('Background image upload error:', err);
            return res.status(400).json({ error: 'Failed to upload background image' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No background image file provided' });
        }
        try {
            // Process the uploaded image
            const photoData = await photoService_1.PhotoService.uploadPhoto(req.file, {
                userId: req.user.id,
                photoType: 'COVER', // Use COVER type for background images
                purpose: 'PERSONAL',
                maxWidth: 1920,
                maxHeight: 1080
            });
            // Update user's background image
            const updatedUser = await prisma_1.prisma.user.update({
                where: { id: req.user.id },
                data: { backgroundImage: photoData.url },
                select: {
                    id: true,
                    backgroundImage: true
                }
            });
            res.json({
                message: 'Background image updated successfully',
                backgroundImage: updatedUser.backgroundImage
            });
        }
        catch (error) {
            console.error('Background image update error:', error);
            res.status(500).json({ error: 'Failed to update background image' });
        }
    });
});
// Remove background image
router.delete('/background-image', auth_1.requireAuth, async (req, res) => {
    try {
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: { backgroundImage: null },
            select: {
                id: true,
                backgroundImage: true
            }
        });
        res.json({
            message: 'Background image removed successfully',
            backgroundImage: updatedUser.backgroundImage
        });
    }
    catch (error) {
        console.error('Background image removal error:', error);
        res.status(500).json({ error: 'Failed to remove background image' });
    }
});
// Friend status endpoint for backward compatibility
router.get('/friend-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        // Use FollowService for follow status (no friendship table yet)
        const followStatus = await relationshipService_1.FollowService.getFollowStatus(currentUserId, userId);
        res.json({
            isFriend: false, // No friendship system yet
            isPending: false,
            status: 'none',
            isFollowing: followStatus.isFollowing
        });
    }
    catch (error) {
        console.error('Friend status error:', error);
        // Return safe default instead of 500 error
        res.json({
            isFriend: false,
            isPending: false,
            status: 'none',
            isFollowing: false
        });
    }
});
// User activity tracking endpoint (stub)
router.post('/activity', auth_1.requireAuth, async (req, res) => {
    try {
        res.json({ success: true, message: 'Activity recorded' });
    }
    catch (error) {
        console.error('Activity tracking error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});
// Get user notification preferences
router.get('/notification-preferences', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                notificationPreferences: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Return preferences or default values
        const defaultPreferences = {
            browserNotifications: true,
            browserNotifyNewMessages: true,
            browserNotifyLikes: false,
            browserNotifyComments: true,
            emailNotifications: true,
            emailNotifyImportantMessages: true,
            emailNotifyWeeklyDigest: false,
            emailNotifySecurityAlerts: true,
            candidateInboxNotifications: true,
            candidateElectionReminders: true
        };
        const preferences = {
            ...defaultPreferences,
            ...(user.notificationPreferences || {})
        };
        res.json({
            success: true,
            data: preferences
        });
    }
    catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification preferences'
        });
    }
});
// Update user notification preferences
router.put('/notification-preferences', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;
        // Validate that we only update known preference keys
        const allowedKeys = [
            'browserNotifications',
            'browserNotifyNewMessages',
            'browserNotifyLikes',
            'browserNotifyComments',
            'emailNotifications',
            'emailNotifyImportantMessages',
            'emailNotifyWeeklyDigest',
            'emailNotifySecurityAlerts',
            'candidateInboxNotifications',
            'candidateElectionReminders'
        ];
        const invalidKeys = Object.keys(updates).filter(key => !allowedKeys.includes(key));
        if (invalidKeys.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid preference keys: ${invalidKeys.join(', ')}`
            });
        }
        // Get current preferences
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { notificationPreferences: true }
        });
        const currentPreferences = user?.notificationPreferences || {};
        const updatedPreferences = {
            ...currentPreferences,
            ...updates
        };
        // Update user preferences
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                notificationPreferences: updatedPreferences
            }
        });
        console.log(`Updated notification preferences for user ${userId}:`, updates);
        res.json({
            success: true,
            data: updatedPreferences
        });
    }
    catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update notification preferences'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map