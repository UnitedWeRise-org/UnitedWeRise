"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const relationshipService_1 = require("../services/relationshipService");
const photoService_1 = require("../services/photoService");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get current user's full profile
router.get('/profile', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
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
                campaignWebsite: true
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
        const updatedUser = await prisma.user.update({
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
        const user = await prisma.user.findUnique({
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
        const users = await prisma.user.findMany({
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
// Get public profile by username
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await prisma.user.findUnique({
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
            const updatedUser = await prisma.user.update({
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
        const updatedUser = await prisma.user.update({
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
// User activity tracking endpoint
router.post('/activity', auth_1.requireAuth, async (req, res) => {
    try {
        // Simple activity tracking - just acknowledge the request
        // Full implementation can be added later if needed
        res.json({ success: true, message: 'Activity recorded' });
    }
    catch (error) {
        console.error('Activity tracking error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});
// Redirect friend-status to relationships route for backward compatibility
router.get('/friend-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        // Forward to the correct endpoint
        const response = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: req.user.id, recipientId: req.params.userId },
                    { requesterId: req.params.userId, recipientId: req.user.id }
                ]
            }
        });
        res.json({
            isFriend: response?.status === 'ACCEPTED',
            isPending: response?.status === 'PENDING',
            status: response?.status || 'none'
        });
    }
    catch (error) {
        console.error('Friend status error:', error);
        res.status(500).json({ error: 'Failed to get friend status' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map