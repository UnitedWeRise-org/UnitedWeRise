"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const probabilityFeedService_1 = require("../services/probabilityFeedService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get personalized feed using probability cloud algorithm
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;
        // Parse custom weights if provided (for A/B testing or user preferences)
        const customWeights = req.query.weights ? JSON.parse(req.query.weights) : undefined;
        const limitNum = parseInt(limit.toString());
        // Generate feed using probability-based algorithm
        const feedResult = await probabilityFeedService_1.ProbabilityFeedService.generateFeed(userId, limitNum, customWeights);
        // Add user's like status to each post
        const postIds = feedResult.posts.map(p => p.id);
        const userLikes = await prisma.like.findMany({
            where: {
                userId,
                postId: { in: postIds }
            },
            select: { postId: true }
        });
        const likedPostIds = new Set(userLikes.map(like => like.postId));
        const postsWithLikeStatus = feedResult.posts.map(post => ({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            isLiked: likedPostIds.has(post.id),
            _count: undefined
        }));
        res.json({
            posts: postsWithLikeStatus,
            algorithm: feedResult.algorithm,
            weights: feedResult.weights,
            stats: feedResult.stats,
            pagination: {
                limit: limitNum,
                count: postsWithLikeStatus.length
            }
        });
    }
    catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get trending posts (most liked in last 24 hours)
router.get('/trending', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = Math.max(1, parseInt(limit.toString()) || 20);
        const offsetNum = Math.max(0, parseInt(offset.toString()) || 0);
        // Check if any posts exist first
        const totalPosts = await prisma.post.count();
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
        const trendingPosts = await prisma.post.findMany({
            where: {
                createdAt: {
                    gte: oneDayAgo
                }
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        verified: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: [
                { createdAt: 'desc' }
            ],
            take: limitNum,
            skip: offsetNum
        });
        const formattedPosts = trendingPosts.map(post => ({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            _count: undefined
        }));
        res.json({
            posts: formattedPosts,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: trendingPosts.length
            }
        });
    }
    catch (error) {
        console.error('Get trending posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=feed.js.map