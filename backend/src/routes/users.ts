import { createNotification } from './notifications';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

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
                createdAt: true
            }
        });

        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update current user's profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
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

// Follow a user
router.post('/follow/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

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
        await createNotification(
            'FOLLOW',
            currentUserId,
            userId,
            `${req.user!.username} started following you`
        );

    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unfollow a user
router.delete('/follow/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;

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
    } catch (error) {
        console.error('Unfollow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search users
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());

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
                followersCount: true
            },
            take: limitNum,
            skip: offsetNum,
            orderBy: [
                { followersCount: 'desc' },
                { username: 'asc' }
            ]
        });

        res.json({
            users,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: users.length
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

export default router;