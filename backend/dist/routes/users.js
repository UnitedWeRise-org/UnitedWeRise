"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notifications_1 = require("./notifications");
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
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
// Follow a user
router.post('/follow/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        if (userId === currentUserId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }
        // Check if user exists
        const userToFollow = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userToFollow) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if already following
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: currentUserId,
                    followingId: userId
                }
            }
        });
        if (existingFollow) {
            return res.status(400).json({ error: 'Already following this user' });
        }
        // Create follow relationship and update counts
        await prisma.$transaction([
            prisma.follow.create({
                data: {
                    followerId: currentUserId,
                    followingId: userId
                }
            }),
            prisma.user.update({
                where: { id: currentUserId },
                data: { followingCount: { increment: 1 } }
            }),
            prisma.user.update({
                where: { id: userId },
                data: { followersCount: { increment: 1 } }
            })
        ]);
        res.json({ message: 'Successfully followed user' });
        // Create follow notification
        await (0, notifications_1.createNotification)('FOLLOW', currentUserId, userId, `${req.user.username} started following you`);
    }
    catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Unfollow a user
router.delete('/follow/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        // Check if following
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: currentUserId,
                    followingId: userId
                }
            }
        });
        if (!existingFollow) {
            return res.status(400).json({ error: 'Not following this user' });
        }
        // Remove follow relationship and update counts
        await prisma.$transaction([
            prisma.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId: currentUserId,
                        followingId: userId
                    }
                }
            }),
            prisma.user.update({
                where: { id: currentUserId },
                data: { followingCount: { decrement: 1 } }
            }),
            prisma.user.update({
                where: { id: userId },
                data: { followersCount: { decrement: 1 } }
            })
        ]);
        res.json({ message: 'Successfully unfollowed user' });
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
// Check if current user is following another user
router.get('/follow-status/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const followRelation = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: currentUserId,
                    followingId: userId
                }
            }
        });
        res.json({
            isFollowing: !!followRelation
        });
    }
    catch (error) {
        console.error('Check follow status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map