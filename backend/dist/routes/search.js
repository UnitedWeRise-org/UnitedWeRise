"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../services/logger");
const safeJson_1 = require("../utils/safeJson");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * /api/search/unified:
 *   get:
 *     tags: [Search]
 *     summary: Unified search endpoint (optimized)
 *     description: Searches across multiple content types (users, posts, officials, videos, topics) in a single API call. Replaces multiple separate API calls with one batched operation for improved performance.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: healthcare
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *           default: all
 *         description: Comma-separated list of content types to search (users,posts,officials,videos,topics) or 'all'
 *         example: users,posts,videos
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results per content type
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 query:
 *                   type: string
 *                   description: Search query that was executed (lowercase)
 *                 data:
 *                   type: object
 *                   description: Search results grouped by content type
 *                   properties:
 *                     users:
 *                       type: array
 *                       description: Matching users (sorted by followers count)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                             nullable: true
 *                           bio:
 *                             type: string
 *                             nullable: true
 *                           verified:
 *                             type: boolean
 *                           followersCount:
 *                             type: integer
 *                           state:
 *                             type: string
 *                             nullable: true
 *                           zipCode:
 *                             type: string
 *                             nullable: true
 *                           city:
 *                             type: string
 *                             nullable: true
 *                           office:
 *                             type: string
 *                             nullable: true
 *                           politicalProfileType:
 *                             type: string
 *                             nullable: true
 *                           isFollowing:
 *                             type: boolean
 *                             description: Whether current user follows this user
 *                     posts:
 *                       type: array
 *                       description: Matching posts (sorted by recency)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           author:
 *                             type: object
 *                           photos:
 *                             type: array
 *                           _count:
 *                             type: object
 *                             properties:
 *                               comments:
 *                                 type: integer
 *                               likes:
 *                                 type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     officials:
 *                       type: array
 *                       description: Matching officials and candidates (combined from User model and Candidate model, deduplicated)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                             nullable: true
 *                           bio:
 *                             type: string
 *                             nullable: true
 *                           verified:
 *                             type: boolean
 *                           politicalProfileType:
 *                             type: string
 *                           office:
 *                             type: string
 *                             nullable: true
 *                           officialTitle:
 *                             type: string
 *                             nullable: true
 *                           state:
 *                             type: string
 *                             nullable: true
 *                           city:
 *                             type: string
 *                             nullable: true
 *                           followersCount:
 *                             type: integer
 *                           candidateId:
 *                             type: string
 *                             nullable: true
 *                             description: Candidate ID if from Candidate model
 *                           candidateStatus:
 *                             type: string
 *                             nullable: true
 *                           isExternallySourced:
 *                             type: boolean
 *                             nullable: true
 *                     videos:
 *                       type: array
 *                       description: Matching video snippets (by caption or hashtag)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           caption:
 *                             type: string
 *                             nullable: true
 *                           hashtags:
 *                             type: array
 *                             items:
 *                               type: string
 *                           thumbnailUrl:
 *                             type: string
 *                             nullable: true
 *                           hlsManifestUrl:
 *                             type: string
 *                             nullable: true
 *                           viewCount:
 *                             type: integer
 *                           likeCount:
 *                             type: integer
 *                           engagementScore:
 *                             type: number
 *                           publishedAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                                 nullable: true
 *                               verified:
 *                                 type: boolean
 *                     topics:
 *                       type: array
 *                       description: Matching topics extracted from posts
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           postCount:
 *                             type: integer
 *                             description: Approximate post count (currently returns 1)
 *                           id:
 *                             type: string
 *                             description: Topic identifier (lowercase with dashes)
 *                 optimized:
 *                   type: boolean
 *                   description: Flag indicating this is the batched endpoint
 *                   example: true
 *       400:
 *         description: Validation error - search query is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Search query is required
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// 🎯 OPTIMIZED: Unified search endpoint (replaces 4 separate API calls)
// Replaces: /search/users + /search/posts + /search/officials + /search/topics
router.get('/unified', auth_1.requireAuth, async (req, res) => {
    try {
        const { q, types = 'all' } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const { limit: limitNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        const currentUserId = req.user.id;
        const searchTypes = types.toString().split(',');
        const includeAll = searchTypes.includes('all');
        // Prepare search promises based on requested types
        const searchPromises = [];
        const resultTypes = [];
        // Search Users
        if (includeAll || searchTypes.includes('users')) {
            resultTypes.push('users');
            searchPromises.push(prisma_1.prisma.user.findMany({
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
                    office: true,
                    politicalProfileType: true,
                    followers: {
                        where: { followerId: currentUserId },
                        select: { id: true }
                    }
                },
                take: limitNum,
                orderBy: [
                    { followersCount: 'desc' },
                    { username: 'asc' }
                ]
            }));
        }
        // Search Posts
        if (includeAll || searchTypes.includes('posts')) {
            resultTypes.push('posts');
            searchPromises.push(prisma_1.prisma.post.findMany({
                where: {
                    content: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    },
                    tags: { hasSome: ["Public Post", "Candidate Post", "Official Post"] }
                },
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
                            likes: true
                        }
                    }
                },
                take: limitNum,
                orderBy: [
                    { createdAt: 'desc' }
                ]
            }));
        }
        // Search Officials/Representatives (both User model and Candidate model)
        if (includeAll || searchTypes.includes('officials')) {
            resultTypes.push('officials');
            // Combined search for both User-based and Candidate model results
            searchPromises.push(Promise.all([
                // Search User-based officials and candidates
                prisma_1.prisma.user.findMany({
                    where: {
                        AND: [
                            {
                                politicalProfileType: {
                                    in: ['ELECTED_OFFICIAL', 'CANDIDATE']
                                }
                            },
                            {
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
                                    },
                                    {
                                        office: {
                                            contains: searchTerm,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        officialTitle: {
                                            contains: searchTerm,
                                            mode: 'insensitive'
                                        }
                                    }
                                ]
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
                        politicalProfileType: true,
                        office: true,
                        officialTitle: true,
                        state: true,
                        city: true,
                        followersCount: true
                    },
                    take: Math.ceil(limitNum / 2),
                    orderBy: [
                        { followersCount: 'desc' },
                        { username: 'asc' }
                    ]
                }),
                // Search Candidate model candidates
                prisma_1.prisma.candidate.findMany({
                    where: {
                        AND: [
                            { status: 'ACTIVE' },
                            { isWithdrawn: false },
                            {
                                OR: [
                                    {
                                        name: {
                                            contains: searchTerm,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        user: {
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
                                        }
                                    },
                                    {
                                        office: {
                                            OR: [
                                                {
                                                    title: {
                                                        contains: searchTerm,
                                                        mode: 'insensitive'
                                                    }
                                                },
                                                {
                                                    state: {
                                                        contains: searchTerm,
                                                        mode: 'insensitive'
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                                bio: true,
                                verified: true,
                                followersCount: true
                            }
                        },
                        office: {
                            select: {
                                title: true,
                                level: true,
                                state: true,
                                district: true
                            }
                        }
                    },
                    take: Math.ceil(limitNum / 2),
                    orderBy: [
                        { createdAt: 'desc' }
                    ]
                })
            ]).then(([users, candidates]) => {
                // Convert Candidate model results to match User model format
                const convertedCandidates = candidates.map(candidate => ({
                    id: candidate.user.id, // Use user ID for consistency
                    username: candidate.user.username,
                    firstName: candidate.user.firstName,
                    lastName: candidate.user.lastName,
                    avatar: candidate.user.avatar,
                    bio: candidate.user.bio,
                    verified: candidate.user.verified || candidate.isVerified,
                    politicalProfileType: 'CANDIDATE',
                    office: candidate.office?.title || 'Office Unknown',
                    officialTitle: candidate.office?.title || 'Office Unknown',
                    state: candidate.office?.state || 'Unknown',
                    city: null,
                    followersCount: candidate.user.followersCount,
                    candidateId: candidate.id, // Add candidate ID for reference
                    candidateStatus: candidate.status,
                    isExternallySourced: candidate.isExternallySourced || false
                }));
                // Combine and deduplicate by user ID
                const combined = [...users, ...convertedCandidates];
                const seen = new Set();
                const deduplicated = combined.filter(item => {
                    if (seen.has(item.id))
                        return false;
                    seen.add(item.id);
                    return true;
                });
                // Sort by followers and return top results
                return deduplicated
                    .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
                    .slice(0, limitNum);
            }));
        }
        // Search Videos (caption text search)
        if (includeAll || searchTypes.includes('videos')) {
            resultTypes.push('videos');
            searchPromises.push(prisma_1.prisma.video.findMany({
                where: {
                    videoType: 'REEL',
                    publishStatus: 'PUBLISHED',
                    isActive: true,
                    encodingStatus: 'READY',
                    moderationStatus: 'APPROVED',
                    deletedAt: null,
                    OR: [
                        {
                            caption: {
                                contains: searchTerm,
                                mode: 'insensitive'
                            }
                        },
                        {
                            hashtags: { hasSome: [searchTerm] }
                        }
                    ]
                },
                select: {
                    id: true,
                    caption: true,
                    hashtags: true,
                    thumbnailUrl: true,
                    hlsManifestUrl: true,
                    viewCount: true,
                    likeCount: true,
                    commentCount: true,
                    engagementScore: true,
                    publishedAt: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            verified: true
                        }
                    }
                },
                take: limitNum,
                orderBy: [
                    { engagementScore: 'desc' },
                    { publishedAt: 'desc' }
                ]
            }));
        }
        // Search Topics (simplified for now - topics are stored as JSON array)
        if (includeAll || searchTypes.includes('topics')) {
            resultTypes.push('topics');
            searchPromises.push(prisma_1.prisma.post.findMany({
                where: {
                    content: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    },
                    tags: { hasSome: ["Public Post", "Candidate Post", "Official Post"] }
                },
                select: {
                    topics: true,
                    id: true
                },
                take: limitNum * 2, // Get more to extract unique topics
                orderBy: {
                    createdAt: 'desc'
                }
            }));
        }
        // Execute all searches in parallel
        const results = await Promise.all(searchPromises);
        // Process results
        const response = {
            success: true,
            query: searchTerm,
            data: {},
            optimized: true // Flag to indicate this is the batched endpoint
        };
        let resultIndex = 0;
        if (includeAll || searchTypes.includes('users')) {
            const users = results[resultIndex++];
            response.data.users = users.map((user) => ({
                ...user,
                isFollowing: user.followers.length > 0,
                followers: undefined // Remove the followers array from response
            }));
        }
        if (includeAll || searchTypes.includes('posts')) {
            response.data.posts = results[resultIndex++];
        }
        if (includeAll || searchTypes.includes('officials')) {
            response.data.officials = results[resultIndex++];
        }
        if (includeAll || searchTypes.includes('videos')) {
            response.data.videos = results[resultIndex++];
        }
        if (includeAll || searchTypes.includes('topics')) {
            const topicPosts = results[resultIndex++];
            // Extract unique topics from posts
            const topicsSet = new Set();
            const topics = [];
            topicPosts.forEach((post) => {
                if (post.topics && Array.isArray(post.topics)) {
                    post.topics.forEach((topic) => {
                        if (topic.toLowerCase().includes(searchTerm) && !topicsSet.has(topic.toLowerCase())) {
                            topicsSet.add(topic.toLowerCase());
                            topics.push({
                                name: topic,
                                postCount: 1, // Would need aggregation for accurate count
                                id: topic.toLowerCase().replace(/\s+/g, '-')
                            });
                        }
                    });
                }
            });
            response.data.topics = topics.slice(0, limitNum);
        }
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error({ error, query: req.query.q, types: req.query.types }, 'Unified search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/search/users:
 *   get:
 *     tags: [Search]
 *     summary: Search users (legacy endpoint)
 *     description: Searches for users by username, first name, or last name. Legacy endpoint - prefer using /unified for better performance.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: john
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Users found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   description: Matching users sorted by followers count
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
 *                         nullable: true
 *                       bio:
 *                         type: string
 *                         nullable: true
 *                       verified:
 *                         type: boolean
 *                       followersCount:
 *                         type: integer
 *                       state:
 *                         type: string
 *                         nullable: true
 *                       zipCode:
 *                         type: string
 *                         nullable: true
 *                       city:
 *                         type: string
 *                         nullable: true
 *                       office:
 *                         type: string
 *                         nullable: true
 *                       politicalProfileType:
 *                         type: string
 *                         nullable: true
 *                       isFollowing:
 *                         type: boolean
 *                         description: Whether current user follows this user
 *       400:
 *         description: Validation error - search query is required
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// Legacy individual search endpoints for backward compatibility
router.get('/users', auth_1.requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const { limit: limitNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
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
                office: true,
                politicalProfileType: true,
                followers: {
                    where: { followerId: currentUserId },
                    select: { id: true }
                }
            },
            take: limitNum,
            orderBy: [
                { followersCount: 'desc' },
                { username: 'asc' }
            ]
        });
        const usersWithFollowStatus = users.map(user => ({
            ...user,
            isFollowing: user.followers.length > 0,
            followers: undefined
        }));
        res.json({ users: usersWithFollowStatus });
    }
    catch (error) {
        logger_1.logger.error({ error, query: req.query.q }, 'User search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/search/posts:
 *   get:
 *     tags: [Search]
 *     summary: Search posts (legacy endpoint)
 *     description: Searches for posts by content text. Legacy endpoint - prefer using /unified for better performance.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: healthcare
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Posts found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   description: Matching posts sorted by recency
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
 *                         type: object
 *                       photos:
 *                         type: array
 *                       _count:
 *                         type: object
 *                         properties:
 *                           comments:
 *                             type: integer
 *                           likes:
 *                             type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Validation error - search query is required
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/posts', auth_1.requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const { limit: limitNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                content: {
                    contains: searchTerm,
                    mode: 'insensitive'
                },
                tags: { hasSome: ["Public Post", "Candidate Post", "Official Post"] }
            },
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
                        likes: true
                    }
                }
            },
            take: limitNum,
            orderBy: [
                { createdAt: 'desc' }
            ]
        });
        res.json({ posts });
    }
    catch (error) {
        logger_1.logger.error({ error, query: req.query.q }, 'Post search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/search/officials:
 *   get:
 *     tags: [Search]
 *     summary: Search officials and candidates (legacy endpoint)
 *     description: Searches for elected officials and candidates by name, username, office, or title. Legacy endpoint - prefer using /unified for better performance.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: senator
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Officials found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 officials:
 *                   type: array
 *                   description: Matching officials and candidates sorted by followers count
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
 *                         nullable: true
 *                       bio:
 *                         type: string
 *                         nullable: true
 *                       verified:
 *                         type: boolean
 *                       politicalProfileType:
 *                         type: string
 *                         enum: [ELECTED_OFFICIAL, CANDIDATE]
 *                       office:
 *                         type: string
 *                         nullable: true
 *                       officialTitle:
 *                         type: string
 *                         nullable: true
 *                       state:
 *                         type: string
 *                         nullable: true
 *                       city:
 *                         type: string
 *                         nullable: true
 *                       followersCount:
 *                         type: integer
 *       400:
 *         description: Validation error - search query is required
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/officials', auth_1.requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const { limit: limitNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        const officials = await prisma_1.prisma.user.findMany({
            where: {
                AND: [
                    {
                        politicalProfileType: {
                            in: ['ELECTED_OFFICIAL', 'CANDIDATE']
                        }
                    },
                    {
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
                            },
                            {
                                office: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                officialTitle: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            }
                        ]
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
                politicalProfileType: true,
                office: true,
                officialTitle: true,
                state: true,
                city: true,
                followersCount: true
            },
            take: limitNum,
            orderBy: [
                { followersCount: 'desc' },
                { username: 'asc' }
            ]
        });
        res.json({ officials });
    }
    catch (error) {
        logger_1.logger.error({ error, query: req.query.q }, 'Officials search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/search/topics:
 *   get:
 *     tags: [Search]
 *     summary: Search topics (legacy endpoint)
 *     description: Searches for topics by extracting and filtering from post topics arrays. Legacy endpoint - prefer using /unified for better performance.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: climate
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Topics found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topics:
 *                   type: array
 *                   description: Matching unique topics extracted from posts
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Topic name
 *                       postCount:
 *                         type: integer
 *                         description: Approximate post count (currently returns 1)
 *                       id:
 *                         type: string
 *                         description: Topic identifier (lowercase with dashes)
 *                         example: climate-change
 *       400:
 *         description: Validation error - search query is required
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/topics', auth_1.requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString().toLowerCase();
        const { limit: limitNum } = (0, safeJson_1.safePaginationParams)(req.query.limit, undefined);
        // Search for posts containing the topic term
        const topicPosts = await prisma_1.prisma.post.findMany({
            where: {
                content: {
                    contains: searchTerm,
                    mode: 'insensitive'
                },
                tags: { hasSome: ["Public Post", "Candidate Post", "Official Post"] }
            },
            select: {
                topics: true,
                id: true
            },
            take: limitNum * 2,
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Extract unique topics
        const topicsSet = new Set();
        const topics = [];
        topicPosts.forEach((post) => {
            if (post.topics && Array.isArray(post.topics)) {
                post.topics.forEach((topic) => {
                    if (topic.toLowerCase().includes(searchTerm) && !topicsSet.has(topic.toLowerCase())) {
                        topicsSet.add(topic.toLowerCase());
                        topics.push({
                            name: topic,
                            postCount: 1,
                            id: topic.toLowerCase().replace(/\s+/g, '-')
                        });
                    }
                });
            }
        });
        res.json({ topics: topics.slice(0, limitNum) });
    }
    catch (error) {
        logger_1.logger.error({ error, query: req.query.q }, 'Topics search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map