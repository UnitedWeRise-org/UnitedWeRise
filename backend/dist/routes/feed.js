"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const probabilityFeedService_1 = require("../services/probabilityFeedService");
const engagementScoringService_1 = require("../services/engagementScoringService");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * /api/feed:
 *   get:
 *     tags: [Feed]
 *     summary: Get personalized feed using probability cloud algorithm
 *     description: Generates a personalized feed using electron-cloud probability sampling based on user preferences, following relationships, and engagement patterns. Includes custom weight support for A/B testing.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of posts to skip (pagination)
 *       - in: query
 *         name: weights
 *         schema:
 *           type: string
 *         description: JSON string of custom algorithm weights for A/B testing (optional)
 *     responses:
 *       200:
 *         description: Personalized feed generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
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
 *                       likesCount:
 *                         type: integer
 *                       commentsCount:
 *                         type: integer
 *                       isLiked:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 algorithm:
 *                   type: string
 *                   example: probability-cloud
 *                 weights:
 *                   type: object
 *                   description: Weights used for feed generation
 *                 stats:
 *                   type: object
 *                   description: Feed generation statistics
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        // Parse custom weights if provided (for A/B testing or user preferences)
        const customWeights = req.query.weights ? JSON.parse(req.query.weights) : undefined;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Generate larger feed and slice for pagination
        // We need to fetch more than just limit+offset to ensure randomization
        const fetchLimit = limitNum + offsetNum + 50; // Get extra posts for proper randomization
        const feedResult = await probabilityFeedService_1.ProbabilityFeedService.generateFeed(userId, fetchLimit, customWeights);
        // Apply offset and limit to the generated feed
        const paginatedPosts = feedResult.posts.slice(offsetNum, offsetNum + limitNum);
        // Add user's like status to each post (use paginated posts)
        const postIds = paginatedPosts.map(p => p.id);
        const userLikes = await prisma_1.prisma.like.findMany({
            where: {
                userId,
                postId: { in: postIds }
            },
            select: { postId: true }
        });
        const likedPostIds = new Set(userLikes.map(like => like.postId));
        const postsWithLikeStatus = paginatedPosts.map(post => ({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            isLiked: likedPostIds.has(post.id),
            _count: undefined
        }));
        // DIAGNOSTIC: Log photo data being sent to frontend
        console.log(`📸 FEED API - Sending ${postsWithLikeStatus.length} posts`);
        const postsWithPhotos = postsWithLikeStatus.filter(p => p.photos && p.photos.length > 0);
        console.log(`📸 FEED API - ${postsWithPhotos.length} posts have photos`);
        if (postsWithPhotos.length > 0) {
            console.log(`📸 FEED API - Sample post with photos:`, {
                postId: postsWithPhotos[0].id,
                photoCount: postsWithPhotos[0].photos.length,
                photoUrls: postsWithPhotos[0].photos.map(p => p.url)
            });
        }
        res.json({
            posts: postsWithLikeStatus,
            algorithm: feedResult.algorithm,
            weights: feedResult.weights,
            stats: feedResult.stats,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: postsWithLikeStatus.length,
                hasMore: postsWithLikeStatus.length === limitNum // If we got full limit, likely more available
            }
        });
    }
    catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/feed/following:
 *   get:
 *     tags: [Feed]
 *     summary: Get posts from followed users only
 *     description: Returns chronological feed of posts only from users the current user follows. Returns empty feed if not following anyone.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of posts to skip (pagination)
 *     responses:
 *       200:
 *         description: Following feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
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
 *                           verified:
 *                             type: boolean
 *                           userBadges:
 *                             type: array
 *                       photos:
 *                         type: array
 *                       likesCount:
 *                         type: integer
 *                       commentsCount:
 *                         type: integer
 *                       isLiked:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/following', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Get list of users this user follows
        const follows = await prisma_1.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        const followedUserIds = follows.map(f => f.followingId);
        // If not following anyone, return empty feed
        if (followedUserIds.length === 0) {
            return res.json({
                posts: [],
                pagination: {
                    limit: limitNum,
                    offset: offsetNum,
                    count: 0,
                    hasMore: false
                }
            });
        }
        // Get posts from followed users
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                authorId: { in: followedUserIds },
                isDeleted: false,
                feedVisible: true
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
                        userBadges: {
                            where: { isDisplayed: true },
                            take: 5,
                            orderBy: { displayOrder: 'asc' },
                            select: {
                                badge: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        imageUrl: true
                                    }
                                },
                                earnedAt: true,
                                displayOrder: true
                            }
                        }
                    }
                },
                photos: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: offsetNum,
            take: limitNum
        });
        // Add user's like status to each post
        const postIds = posts.map(p => p.id);
        const userLikes = await prisma_1.prisma.like.findMany({
            where: {
                userId,
                postId: { in: postIds }
            },
            select: { postId: true }
        });
        const likedPostIds = new Set(userLikes.map(like => like.postId));
        const postsWithLikeStatus = posts.map(post => ({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            isLiked: likedPostIds.has(post.id),
            _count: undefined
        }));
        res.json({
            posts: postsWithLikeStatus,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: postsWithLikeStatus.length,
                hasMore: postsWithLikeStatus.length === limitNum
            }
        });
    }
    catch (error) {
        console.error('Following feed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/feed/trending:
 *   get:
 *     tags: [Feed]
 *     summary: Get trending posts (most engaged in last 24 hours)
 *     description: Returns posts with highest engagement scores from the last 24 hours. Uses engagement scoring algorithm combining likes, comments, shares, and time decay. Public endpoint (no auth required).
 *     parameters:
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
 *         description: Number of posts to skip (pagination)
 *     responses:
 *       200:
 *         description: Trending posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
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
 *                       engagementScore:
 *                         type: number
 *                         description: Calculated engagement score
 *                       likesCount:
 *                         type: integer
 *                       dislikesCount:
 *                         type: integer
 *                       agreesCount:
 *                         type: integer
 *                       disagreesCount:
 *                         type: integer
 *                       commentsCount:
 *                         type: integer
 *                       sharesCount:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                 algorithm:
 *                   type: string
 *                   example: engagement-scoring
 *                 error:
 *                   type: string
 *                   description: Error message if fallback response (empty posts)
 */
router.get('/trending', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = Math.max(1, parseInt(limit.toString()) || 20);
        const offsetNum = Math.max(0, parseInt(offset.toString()) || 0);
        // Check if any posts exist first
        const totalPosts = await prisma_1.prisma.post.count();
        if (totalPosts === 0) {
            return res.json({
                posts: [],
                pagination: {
                    limit: limitNum,
                    offset: offsetNum,
                    count: 0
                }
            });
        }
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const trendingPosts = await prisma_1.prisma.post.findMany({
            where: {
                createdAt: {
                    gte: oneDayAgo
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
                        userBadges: {
                            where: { isDisplayed: true },
                            take: 5,
                            orderBy: { displayOrder: 'asc' },
                            select: {
                                badge: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        imageUrl: true
                                    }
                                },
                                earnedAt: true,
                                displayOrder: true
                            }
                        }
                    }
                },
                photos: true,
                comments: {
                    select: {
                        likesCount: true,
                        dislikesCount: true,
                        agreesCount: true,
                        disagreesCount: true
                    }
                }
            },
            orderBy: [
                { createdAt: 'desc' }
            ],
            take: limitNum * 3 // Get more posts to calculate engagement scores
        });
        // Calculate engagement scores for all posts
        const postsWithScores = trendingPosts.map(post => {
            // Calculate comment engagement metrics
            const commentEngagement = engagementScoringService_1.EngagementScoringService.calculateCommentEngagement(post.comments || []);
            const engagementMetrics = {
                likesCount: post.likesCount || 0,
                dislikesCount: post.dislikesCount || 0,
                agreesCount: post.agreesCount || 0,
                disagreesCount: post.disagreesCount || 0,
                commentsCount: post.commentsCount || 0,
                sharesCount: post.sharesCount || 0,
                viewsCount: 0, // Views not implemented yet
                communityNotesCount: 0,
                reportsCount: 0,
                commentEngagement
            };
            const engagementResult = engagementScoringService_1.EngagementScoringService.calculateScore(engagementMetrics, new Date(post.createdAt), 70 // Default reputation
            );
            return {
                ...post,
                engagementScore: engagementResult.score
            };
        });
        // Sort by engagement score and apply pagination
        const sortedPosts = postsWithScores
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(offsetNum, offsetNum + limitNum);
        const formattedPosts = sortedPosts;
        res.json({
            posts: formattedPosts,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: formattedPosts.length
            },
            algorithm: 'engagement-scoring'
        });
    }
    catch (error) {
        console.error('Get trending posts error:', error);
        // Return safe fallback instead of 500 error
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = Math.max(1, parseInt(limit.toString()) || 20);
        const offsetNum = Math.max(0, parseInt(offset.toString()) || 0);
        res.json({
            posts: [],
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: 0
            },
            error: 'Trending posts temporarily unavailable'
        });
    }
});
/**
 * @swagger
 * /api/feed/filters:
 *   get:
 *     tags: [Feed]
 *     summary: Get user's saved feed filters (Phase 2 stub)
 *     description: Returns user's custom feed filter configurations. Currently returns empty array - Phase 2 feature not yet implemented.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Feed filters retrieved successfully (empty for Phase 1)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 filters:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: []
 *                 message:
 *                   type: string
 *                   example: Filter system coming soon in Phase 2!
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/filters', auth_1.requireAuth, async (req, res) => {
    try {
        // Phase 2 feature - return empty array for now
        res.json({
            success: true,
            filters: [],
            message: 'Filter system coming soon in Phase 2!'
        });
    }
    catch (error) {
        console.error('Get feed filters error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve filters'
        });
    }
});
/**
 * @swagger
 * /api/feed/filters:
 *   post:
 *     tags: [Feed]
 *     summary: Create new feed filter (Phase 2 stub)
 *     description: Creates a custom feed filter configuration. Not yet implemented - returns 501 Not Implemented.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Filter configuration (schema not yet defined)
 *     responses:
 *       501:
 *         description: Not implemented - Phase 2 feature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Filter creation not yet available - Coming soon in Phase 2!
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/filters', auth_1.requireAuth, async (req, res) => {
    try {
        // Phase 2 feature - not yet implemented
        res.status(501).json({
            success: false,
            error: 'Filter creation not yet available - Coming soon in Phase 2!'
        });
    }
    catch (error) {
        console.error('Create feed filter error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create filter'
        });
    }
});
exports.default = router;
//# sourceMappingURL=feed.js.map