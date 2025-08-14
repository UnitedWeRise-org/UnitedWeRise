import { createNotification } from './notifications';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateProfileUpdate } from '../middleware/validation';
import { FollowService } from '../services/relationshipService';

const router = express.Router();
const prisma = new PrismaClient();

// Get current user's full profile
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
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
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update current user's profile
router.put('/profile', requireAuth, validateProfileUpdate, async (req: AuthRequest, res: express.Response) => {
    try {
        const { firstName, lastName, bio, website, location } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: req.user!.id },
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
    } catch (error) {
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
    } catch (error) {
        console.error('Get public user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Follow a user (using reusable service)
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
        console.error('Follow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unfollow a user (using reusable service)
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
        console.error('Unfollow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search users
router.get('/search', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());

        const currentUserId = req.user!.id;
        
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check if current user is following another user (using reusable service)
router.get('/follow-status/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

        const status = await FollowService.getFollowStatus(currentUserId, userId);
        res.json(status);
    } catch (error) {
        console.error('Check follow status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;