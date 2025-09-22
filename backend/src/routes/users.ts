import { prisma } from '../lib/prisma';
import { createNotification } from './notifications';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateProfileUpdate } from '../middleware/validation';
import { FollowService } from '../services/relationshipService';
import { PhotoService } from '../services/photoService';
import { ActivityTracker } from '../services/activityTracker';
import { ActivityType } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

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
                isAdmin: true,
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
                campaignWebsite: true,
                // Preferences
                notificationPreferences: true,
                // Photo tagging preferences
                photoTaggingEnabled: true,
                requireTagApproval: true,
                allowTagsByFriendsOnly: true,
                // Profile privacy settings
                maritalStatus: true,
                profilePrivacySettings: true,
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

// Get user profile with privacy filtering (authentication optional)
router.get('/:userId', async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const viewerId = req.user?.id; // Optional authentication

        // Get full user data including privacy settings
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
                // Address fields (subject to privacy filtering)
                city: true,
                state: true,
                // Personal fields (subject to privacy filtering)
                maritalStatus: true,
                phoneNumber: true,
                // Political profile fields (subject to privacy filtering)
                politicalProfileType: true,
                verificationStatus: true,
                office: true,
                officialTitle: true,
                campaignWebsite: true,
                // Privacy settings
                profilePrivacySettings: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If viewing own profile, return everything
        if (viewerId === userId) {
            res.json({ user });
            return;
        }

        // Get privacy settings with defaults
        const defaultPrivacySettings = {
            bio: 'public',
            website: 'public',
            city: 'followers',
            state: 'followers',
            maritalStatus: 'friends',
            phoneNumber: 'private',
        };

        const privacySettings = {
            ...defaultPrivacySettings,
            ...(user.profilePrivacySettings as Record<string, any> || {})
        };

        // Check relationship status if viewer is authenticated
        let relationshipLevel = 'public';

        if (viewerId) {
            const [followStatus, friendshipStatus] = await Promise.all([
                // Check if viewer follows this user
                prisma.follow.findFirst({
                    where: {
                        followerId: viewerId,
                        followingId: userId
                    }
                }),
                // Check friendship status
                prisma.friendship.findFirst({
                    where: {
                        OR: [
                            { requesterId: viewerId, recipientId: userId },
                            { requesterId: userId, recipientId: viewerId }
                        ],
                        status: 'ACCEPTED'
                    }
                })
            ]);

            if (friendshipStatus) {
                relationshipLevel = 'friends';
            } else if (followStatus) {
                relationshipLevel = 'followers';
            }
        }

        // Apply privacy filtering
        const filteredUser: any = {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            verified: user.verified,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt,
            backgroundImage: user.backgroundImage,
            // Always show political profile type, verification status, and office
            politicalProfileType: user.politicalProfileType,
            verificationStatus: user.verificationStatus,
            office: user.office,
            officialTitle: user.officialTitle
        };

        // Helper function to check if field should be visible
        const canViewField = (fieldPrivacy: string): boolean => {
            switch (fieldPrivacy) {
                case 'public': return true;
                case 'followers': return relationshipLevel === 'followers' || relationshipLevel === 'friends';
                case 'friends': return relationshipLevel === 'friends';
                case 'private': return false;
                default: return false;
            }
        };

        // Apply field-level privacy filtering
        if (canViewField(privacySettings.bio)) {
            filteredUser.bio = user.bio;
        }

        if (canViewField(privacySettings.website)) {
            filteredUser.website = user.website;
        }

        if (canViewField(privacySettings.city)) {
            filteredUser.city = user.city;
        }

        if (canViewField(privacySettings.state)) {
            filteredUser.state = user.state;
        }

        if (canViewField(privacySettings.maritalStatus)) {
            filteredUser.maritalStatus = user.maritalStatus;
        }

        if (canViewField(privacySettings.phoneNumber)) {
            filteredUser.phoneNumber = user.phoneNumber;
        }


        // Campaign website is public for candidates (campaign transparency)
        if (user.campaignWebsite) {
            filteredUser.campaignWebsite = user.campaignWebsite;
        }

        // Always include location field for backward compatibility (but it may be empty)
        filteredUser.location = user.location;

        res.json({
            user: filteredUser,
            // Include relationship context for frontend
            relationshipContext: viewerId ? {
                relationshipLevel,
                isAuthenticated: true
            } : {
                relationshipLevel: 'public',
                isAuthenticated: false
            }
        });
    } catch (error) {
        console.error('Get user profile error:', error);
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

// 🎯 OPTIMIZED: Get complete user profile (batches 5-6 API calls into 1)
// Replaces: /users/:id + /posts/user/:id + /users/:id/followers + /users/:id/following + /users/follow-status/:id
router.get('/:userId/complete', async (req: AuthRequest, res) => {
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
            prisma.user.findUnique({
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
            prisma.post.findMany({
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
            prisma.follow.count({
                where: { followingId: userId }
            }),
            
            // Following count (actual count for accuracy) 
            prisma.follow.count({
                where: { followerId: userId }
            }),
            
            // Relationship status with current user (if authenticated)
            currentUserId ? Promise.all([
                // Check if current user follows this user
                prisma.follow.findFirst({
                    where: {
                        followerId: currentUserId,
                        followingId: userId
                    }
                }),
                // Check if this user follows current user
                prisma.follow.findFirst({
                    where: {
                        followerId: userId,
                        followingId: currentUserId
                    }
                }),
                // Check friendship status
                prisma.friendship.findFirst({
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
            } else if (friendship.status === 'PENDING') {
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
    } catch (error) {
        console.error('Get complete user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get public profile by username
router.get('/by-username/:username', async (req, res) => {
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

// Rate limiting for background image uploads
const backgroundUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 uploads per hour
  message: {
    error: 'Too many background image upload attempts',
    message: 'Please wait before uploading another background image'
  }
});

// Upload background image
router.post('/background-image', requireAuth, backgroundUploadLimiter, async (req: AuthRequest, res) => {
    const upload = PhotoService.getMulterConfig();
    
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
            const photoData = await PhotoService.uploadPhoto(req.file, {
                userId: req.user!.id,
                photoType: 'COVER', // Use COVER type for background images
                purpose: 'PERSONAL',
                maxWidth: 1920,
                maxHeight: 1080
            });

            // Update user's background image
            const updatedUser = await prisma.user.update({
                where: { id: req.user!.id },
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

        } catch (error) {
            console.error('Background image update error:', error);
            res.status(500).json({ error: 'Failed to update background image' });
        }
    });
});

// Remove background image
router.delete('/background-image', requireAuth, async (req: AuthRequest, res) => {
    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.user!.id },
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

    } catch (error) {
        console.error('Background image removal error:', error);
        res.status(500).json({ error: 'Failed to remove background image' });
    }
});

// Friend status endpoint for backward compatibility
router.get('/friend-status/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!.id;
        
        // Use FollowService for follow status (no friendship table yet)
        const followStatus = await FollowService.getFollowStatus(currentUserId, userId);
        
        res.json({
            isFriend: false, // No friendship system yet
            isPending: false,
            status: 'none',
            isFollowing: followStatus.isFollowing
        });
    } catch (error) {
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
router.post('/activity', requireAuth, async (req: AuthRequest, res) => {
    try {
        res.json({ success: true, message: 'Activity recorded' });
    } catch (error) {
        console.error('Activity tracking error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});

// Get user profile privacy settings
router.get('/profile-privacy', requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                profilePrivacySettings: true,
                maritalStatus: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Return privacy settings or default values
        const defaultPrivacySettings = {
            bio: 'public',
            website: 'public',
            city: 'followers',
            state: 'followers',
            maritalStatus: 'friends',
            phoneNumber: 'private',
        };

        const privacySettings = {
            ...defaultPrivacySettings,
            ...(user.profilePrivacySettings as Record<string, any> || {})
        };

        res.json({
            success: true,
            data: {
                privacySettings,
                maritalStatus: user.maritalStatus
            }
        });
    } catch (error) {
        console.error('Error fetching profile privacy settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile privacy settings'
        });
    }
});

// Update user profile privacy settings
router.put('/profile-privacy', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { privacySettings, maritalStatus } = req.body;

        if (!privacySettings) {
            return res.status(400).json({
                success: false,
                error: 'Privacy settings are required'
            });
        }

        // Validate privacy levels
        const validPrivacyLevels = ['public', 'followers', 'friends', 'private'];
        const allowedFields = ['bio', 'website', 'city', 'state', 'maritalStatus', 'phoneNumber'];

        // Validate field names and privacy levels
        for (const [field, level] of Object.entries(privacySettings)) {
            if (!allowedFields.includes(field)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid field: ${field}`
                });
            }
            if (!validPrivacyLevels.includes(level as string)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid privacy level: ${level} for field ${field}`
                });
            }
        }

        // Get current privacy settings
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profilePrivacySettings: true }
        });

        const currentPrivacySettings = (user?.profilePrivacySettings as Record<string, any>) || {};
        const updatedPrivacySettings = {
            ...currentPrivacySettings,
            ...privacySettings
        };

        // Update user privacy settings and marital status
        const updateData: any = {
            profilePrivacySettings: updatedPrivacySettings
        };

        if (maritalStatus !== undefined) {
            updateData.maritalStatus = maritalStatus;
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        console.log(`Updated profile privacy settings for user ${userId}:`, privacySettings);

        res.json({
            success: true,
            data: {
                privacySettings: updatedPrivacySettings,
                maritalStatus
            }
        });
    } catch (error) {
        console.error('Error updating profile privacy settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile privacy settings'
        });
    }
});

// Get user notification preferences
router.get('/notification-preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
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
            ...(user.notificationPreferences as Record<string, any> || {})
        };

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification preferences'
        });
    }
});

// Update user notification preferences
router.put('/notification-preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { notificationPreferences: true }
        });

        const currentPreferences = (user?.notificationPreferences as Record<string, any>) || {};
        const updatedPreferences = {
            ...currentPreferences,
            ...updates
        };

        // Update user preferences
        await prisma.user.update({
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
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update notification preferences'
        });
    }
});

// Get user activity log
router.get('/activity/me', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const {
            types,
            search,
            offset = '0',
            limit = '20'
        } = req.query;

        // Parse activity types if provided
        let activityTypes;
        if (types && typeof types === 'string') {
            activityTypes = types.split(',').filter(type =>
                Object.values(ActivityType).includes(type as any)
            );
        }

        const activities = await ActivityTracker.getUserActivity(userId, {
            types: activityTypes,
            search: search as string,
            offset: parseInt(offset as string),
            limit: Math.min(parseInt(limit as string), 50), // Max 50 items
            includeTarget: true
        });

        // Get counts for filter UI
        const counts = await ActivityTracker.getActivityCounts(userId);

        res.json({
            success: true,
            data: {
                activities,
                counts,
                pagination: {
                    offset: parseInt(offset as string),
                    limit: parseInt(limit as string),
                    hasMore: activities.length === parseInt(limit as string)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log'
        });
    }
});

// Get public user activity log (for public profiles - future)
router.get('/activity/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            types,
            offset = '0',
            limit = '20'
        } = req.query;

        // For public activity, only show certain types and no deleted content
        const publicActivityTypes = ['POST_CREATED', 'COMMENT_CREATED', 'LIKE_ADDED', 'FOLLOW_ADDED'];

        let activityTypes = publicActivityTypes;
        if (types && typeof types === 'string') {
            const requestedTypes = types.split(',').filter(type =>
                publicActivityTypes.includes(type)
            );
            if (requestedTypes.length > 0) {
                activityTypes = requestedTypes;
            }
        }

        const activities = await ActivityTracker.getUserActivity(userId, {
            types: activityTypes as any,
            offset: parseInt(offset as string),
            limit: Math.min(parseInt(limit as string), 20), // Lower limit for public
            includeTarget: true
        });

        // Filter out deleted content for public view
        const publicActivities = activities.filter(activity => {
            // Only show non-deleted activities in public view
            if (!activity.metadata || typeof activity.metadata !== 'object') {
                return true;
            }
            return !('deletedReason' in activity.metadata) &&
                   !('originalContent' in activity.metadata);
        });

        res.json({
            success: true,
            data: {
                activities: publicActivities,
                pagination: {
                    offset: parseInt(offset as string),
                    limit: parseInt(limit as string),
                    hasMore: publicActivities.length === parseInt(limit as string)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching public user activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log'
        });
    }
});

export default router;