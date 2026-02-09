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
const activityTracker_1 = require("../services/activityTracker");
const client_1 = require("@prisma/client");
const logger_1 = require("../services/logger");
const safeJson_1 = require("../utils/safeJson");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [User]
 *     summary: Get current user's full profile
 *     description: Returns complete profile data for the authenticated user including private fields (email, address, preferences)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     website:
 *                       type: string
 *                     location:
 *                       type: string
 *                     verified:
 *                       type: boolean
 *                     isAdmin:
 *                       type: boolean
 *                     followersCount:
 *                       type: integer
 *                     followingCount:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     backgroundImage:
 *                       type: string
 *                     streetAddress:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zipCode:
 *                       type: string
 *                     politicalProfileType:
 *                       type: string
 *                     verificationStatus:
 *                       type: string
 *                     office:
 *                       type: string
 *                     officialTitle:
 *                       type: string
 *                     campaignWebsite:
 *                       type: string
 *                     notificationPreferences:
 *                       type: object
 *                     photoTaggingEnabled:
 *                       type: boolean
 *                     requireTagApproval:
 *                       type: boolean
 *                     allowTagsByFriendsOnly:
 *                       type: boolean
 *                     maritalStatus:
 *                       type: string
 *                     profilePrivacySettings:
 *                       type: object
 *                     candidateProfile:
 *                       type: object
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Get profile error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [User]
 *     summary: Update current user's profile
 *     description: Updates profile fields for the authenticated user (firstName, lastName, bio, website, location)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               website:
 *                 type: string
 *                 format: uri
 *               location:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 user:
 *                   type: object
 *       400:
 *         description: Validation error - invalid input
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Update profile error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags: [User]
 *     summary: Get user profile with privacy filtering
 *     description: Returns public or filtered profile based on viewer's relationship to user. Authentication optional - returns more data if authenticated and following/friends.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: User profile data (filtered by privacy settings)
 *                 relationshipContext:
 *                   type: object
 *                   properties:
 *                     relationshipLevel:
 *                       type: string
 *                       enum: [public, followers, friends]
 *                     isAuthenticated:
 *                       type: boolean
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const viewerId = req.user?.id; // Optional authentication
        // Get full user data including privacy settings
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
            ...(user.profilePrivacySettings || {})
        };
        // Check relationship status if viewer is authenticated
        let relationshipLevel = 'public';
        if (viewerId) {
            const [followStatus, friendshipStatus] = await Promise.all([
                // Check if viewer follows this user
                prisma_1.prisma.follow.findFirst({
                    where: {
                        followerId: viewerId,
                        followingId: userId
                    }
                }),
                // Check friendship status
                prisma_1.prisma.friendship.findFirst({
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
            }
            else if (followStatus) {
                relationshipLevel = 'followers';
            }
        }
        // Apply privacy filtering
        const filteredUser = {
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
        const canViewField = (fieldPrivacy) => {
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
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId, viewerId: req.user?.id }, 'Get user profile error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/follow/{userId}:
 *   post:
 *     tags: [User]
 *     summary: Follow a user
 *     description: Creates a follow relationship between current user and target user. Updates follower/following counts.
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
 *         description: Unauthorized - authentication required
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
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Follow user error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/follow/{userId}:
 *   delete:
 *     tags: [User]
 *     summary: Unfollow a user
 *     description: Removes follow relationship between current user and target user. Updates follower/following counts.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unfollow
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
 *                   example: Successfully unfollowed user
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request - not following user
 *       401:
 *         description: Unauthorized - authentication required
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
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Unfollow user error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/search:
 *   get:
 *     tags: [User]
 *     summary: Search users by username or name
 *     description: Searches users by username, firstName, or lastName (case-insensitive). Returns users with follow status for current user.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       bio:
 *                         type: string
 *                       verified:
 *                         type: boolean
 *                       followersCount:
 *                         type: integer
 *                       isFollowing:
 *                         type: boolean
 *                         description: Whether current user follows this user
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *       400:
 *         description: Bad request - search query required
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/search', auth_1.requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const { limit: limitNum, offset: offsetNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset);
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
        logger_1.logger.error({ err: error, searchQuery: req.query.q, currentUserId: req.user.id }, 'Search users error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/complete:
 *   get:
 *     tags: [User]
 *     summary: Get complete user profile (optimized - batches 5-6 API calls into 1)
 *     description: Returns complete profile data including user info, posts, follower/following counts, and relationship status with current user. Replaces multiple separate API calls for better performance.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve complete profile for
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Post pagination offset
 *     responses:
 *       200:
 *         description: Complete profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       description: User profile with counts
 *                     posts:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                         pagination:
 *                           type: object
 *                     relationship:
 *                       type: object
 *                       properties:
 *                         isFollowing:
 *                           type: boolean
 *                         isFollower:
 *                           type: boolean
 *                         friendshipStatus:
 *                           type: string
 *                           enum: [none, friends, request_sent, request_received]
 *                         canMessage:
 *                           type: boolean
 *                       description: Null if not authenticated
 *                     optimized:
 *                       type: boolean
 *                       example: true
 *                       description: Flag indicating this is the batched endpoint
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/complete', auth_1.optionalAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit: limitNum, offset: offsetNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset);
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
                    photos: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                            threadPosts: true
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
                    items: posts.map(post => ({
                        ...post,
                        likesCount: post._count?.likes || 0,
                        commentsCount: post._count?.comments || 0,
                        threadPostsCount: post._count?.threadPosts || 0,
                        _count: { threadPosts: post._count?.threadPosts || 0 }
                    })),
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
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user?.id }, 'Get complete user profile error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/by-username/{username}:
 *   get:
 *     tags: [User]
 *     summary: Get user profile by username
 *     description: Retrieves public user profile using username instead of ID. Includes candidate profile if exists.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username to look up
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/by-username/:username', async (req, res) => {
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
        // Check if user is a candidate
        const candidateProfile = await prisma_1.prisma.candidate.findUnique({
            where: { userId: user.id },
            select: {
                id: true,
                name: true,
                party: true,
                office: true,
                campaignWebsite: true,
                platformSummary: true,
                isVerified: true,
                keyIssues: true,
                isIncumbent: true,
                status: true
            }
        });
        // Attach candidate profile to user object if exists
        const userWithCandidate = {
            ...user,
            candidateProfile: candidateProfile || null
        };
        res.json({ user: userWithCandidate });
    }
    catch (error) {
        logger_1.logger.error({ err: error, username: req.params.username }, 'Get user profile error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/followers:
 *   get:
 *     tags: [User]
 *     summary: Get user's followers list
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
        const { limit: limitNum, offset: offsetNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset);
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
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get followers error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/following:
 *   get:
 *     tags: [User]
 *     summary: Get user's following list
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 following:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/following', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit: limitNum, offset: offsetNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset);
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
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get following error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/users/follow-status/{userId}:
 *   get:
 *     tags: [User]
 *     summary: Check follow status
 *     description: Returns whether current user follows the specified user
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
 *         description: Follow status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *       401:
 *         description: Unauthorized - authentication required
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
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Check follow status error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// TODO: Background image upload endpoint removed during PhotoService cleanup
// Will be reimplemented with new photo upload architecture
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
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Background image removal error');
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
        logger_1.logger.error({ err: error, userId: req.params.userId, currentUserId: req.user.id }, 'Friend status error');
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
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Activity tracking error');
        res.status(500).json({ error: 'Failed to track activity' });
    }
});
/**
 * @swagger
 * /api/users/profile-privacy:
 *   get:
 *     tags: [User]
 *     summary: Get profile privacy settings
 *     description: Returns current user's profile privacy settings for each field (bio, website, city, state, maritalStatus, phoneNumber)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Privacy settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     privacySettings:
 *                       type: object
 *                       description: Privacy level for each field (public, followers, friends, private)
 *                     maritalStatus:
 *                       type: string
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/profile-privacy', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
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
            ...(user.profilePrivacySettings || {})
        };
        res.json({
            success: true,
            data: {
                privacySettings,
                maritalStatus: user.maritalStatus
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Error fetching profile privacy settings');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile privacy settings'
        });
    }
});
/**
 * @swagger
 * /api/users/profile-privacy:
 *   put:
 *     tags: [User]
 *     summary: Update profile privacy settings
 *     description: Updates privacy levels for profile fields. Each field can be public, followers, friends, or private.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               privacySettings:
 *                 type: object
 *                 properties:
 *                   bio:
 *                     type: string
 *                     enum: [public, followers, friends, private]
 *                   website:
 *                     type: string
 *                     enum: [public, followers, friends, private]
 *                   city:
 *                     type: string
 *                     enum: [public, followers, friends, private]
 *                   state:
 *                     type: string
 *                     enum: [public, followers, friends, private]
 *                   maritalStatus:
 *                     type: string
 *                     enum: [public, followers, friends, private]
 *                   phoneNumber:
 *                     type: string
 *                     enum: [public, followers, friends, private]
 *               maritalStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid field or privacy level
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/profile-privacy', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
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
            if (!validPrivacyLevels.includes(level)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid privacy level: ${level} for field ${field}`
                });
            }
        }
        // Get current privacy settings
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { profilePrivacySettings: true }
        });
        const currentPrivacySettings = user?.profilePrivacySettings || {};
        const updatedPrivacySettings = {
            ...currentPrivacySettings,
            ...privacySettings
        };
        // Update user privacy settings and marital status
        const updateData = {
            profilePrivacySettings: updatedPrivacySettings
        };
        if (maritalStatus !== undefined) {
            updateData.maritalStatus = maritalStatus;
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        logger_1.logger.info({ userId, privacySettings }, 'Updated profile privacy settings');
        res.json({
            success: true,
            data: {
                privacySettings: updatedPrivacySettings,
                maritalStatus
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Error updating profile privacy settings');
        res.status(500).json({
            success: false,
            error: 'Failed to update profile privacy settings'
        });
    }
});
/**
 * @swagger
 * /api/users/notification-preferences:
 *   get:
 *     tags: [User]
 *     summary: Get notification preferences
 *     description: Returns current user's notification preferences for browser and email notifications
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Notification preference flags
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Error fetching notification preferences');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification preferences'
        });
    }
});
/**
 * @swagger
 * /api/users/notification-preferences:
 *   put:
 *     tags: [User]
 *     summary: Update notification preferences
 *     description: Updates current user's notification preferences. Only updates provided fields.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               browserNotifications:
 *                 type: boolean
 *               browserNotifyNewMessages:
 *                 type: boolean
 *               browserNotifyLikes:
 *                 type: boolean
 *               browserNotifyComments:
 *                 type: boolean
 *               emailNotifications:
 *                 type: boolean
 *               emailNotifyImportantMessages:
 *                 type: boolean
 *               emailNotifyWeeklyDigest:
 *                 type: boolean
 *               emailNotifySecurityAlerts:
 *                 type: boolean
 *               candidateInboxNotifications:
 *                 type: boolean
 *               candidateElectionReminders:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid preference key
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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
        logger_1.logger.info({ userId, updates }, 'Updated notification preferences');
        res.json({
            success: true,
            data: updatedPreferences
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Error updating notification preferences');
        res.status(500).json({
            success: false,
            error: 'Failed to update notification preferences'
        });
    }
});
/**
 * @swagger
 * /api/users/activity/me:
 *   get:
 *     tags: [User]
 *     summary: Get current user's activity log
 *     description: Returns paginated activity history for authenticated user with optional filtering by type and search
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated activity types to filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for activity content
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Activity log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                     counts:
 *                       type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/activity/me', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { types, search } = req.query;
        const { limit, offset } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset, 50 // Max 50 items for activity
        );
        // Parse activity types if provided
        let activityTypes;
        if (types && typeof types === 'string') {
            activityTypes = types.split(',').filter(type => Object.values(client_1.ActivityType).includes(type));
        }
        const activities = await activityTracker_1.ActivityTracker.getUserActivity(userId, {
            types: activityTypes,
            search: search,
            offset,
            limit,
            includeTarget: true
        });
        // Get counts for filter UI
        const counts = await activityTracker_1.ActivityTracker.getActivityCounts(userId);
        res.json({
            success: true,
            data: {
                activities,
                counts,
                pagination: {
                    offset,
                    limit,
                    hasMore: activities.length === limit
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Error fetching user activity');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log'
        });
    }
});
/**
 * @swagger
 * /api/users/me/preferences:
 *   patch:
 *     tags: [User]
 *     summary: Update user UI preferences
 *     description: Updates UI preferences (dismissed modals, theme choices, etc.). Merges with existing preferences.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dismissedModals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of feature IDs to mark as dismissed
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch('/me/preferences', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { dismissedModals } = req.body;
        // Fetch current preferences
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { uiPreferences: true }
        });
        // Merge with existing preferences
        const currentPrefs = user?.uiPreferences || {};
        const updatedPrefs = {
            ...currentPrefs,
        };
        // Handle dismissedModals - merge arrays, avoid duplicates
        if (dismissedModals && Array.isArray(dismissedModals)) {
            const existingDismissed = currentPrefs.dismissedModals || [];
            updatedPrefs.dismissedModals = [...new Set([...existingDismissed, ...dismissedModals])];
        }
        // Update in database
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { uiPreferences: updatedPrefs }
        });
        logger_1.logger.info({ userId, updatedPrefs }, 'User UI preferences updated');
        res.json({
            success: true,
            data: { uiPreferences: updatedPrefs }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Error updating user preferences');
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});
/**
 * @swagger
 * /api/users/activity/{userId}:
 *   get:
 *     tags: [User]
 *     summary: Get public user activity log
 *     description: Returns filtered public activity for specified user (only shows posts, comments, likes, follows - no deleted content)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated activity types (limited to public types)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 20
 *     responses:
 *       200:
 *         description: Public activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Internal server error
 */
router.get('/activity/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { types } = req.query;
        const { limit, offset } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset, 20 // Lower limit for public activity
        );
        // For public activity, only show certain types and no deleted content
        const publicActivityTypes = ['POST_CREATED', 'COMMENT_CREATED', 'LIKE_ADDED', 'FOLLOW_ADDED'];
        let activityTypes = publicActivityTypes;
        if (types && typeof types === 'string') {
            const requestedTypes = types.split(',').filter(type => publicActivityTypes.includes(type));
            if (requestedTypes.length > 0) {
                activityTypes = requestedTypes;
            }
        }
        const activities = await activityTracker_1.ActivityTracker.getUserActivity(userId, {
            types: activityTypes,
            offset,
            limit,
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
                    offset,
                    limit,
                    hasMore: publicActivities.length === limit
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Error fetching public user activity');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map