"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const topicAggregationService_1 = require("../services/topicAggregationService");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
/**
 * Get trending topics with dual-vector stance analysis
 */
router.get('/topics', async (req, res) => {
    try {
        const { scope = 'national', limit = 7 } = req.query;
        // Get user's location if authenticated
        let userState;
        let userCity;
        if (req.user) {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { state: true, city: true }
            });
            userState = user?.state || undefined;
            userCity = user?.city || undefined;
        }
        // Aggregate topics based on scope
        const topics = await topicAggregationService_1.TopicAggregationService.aggregateTopics({
            geographicScope: scope,
            userState,
            userCity,
            maxTopics: Number(limit)
        });
        res.json({
            success: true,
            scope,
            topics: topics.map(topic => ({
                id: topic.id,
                title: topic.title,
                support: {
                    percentage: topic.supportVector.percentage,
                    summary: topic.supportVector.summary,
                    postCount: topic.supportVector.posts.length
                },
                oppose: {
                    percentage: topic.opposeVector.percentage,
                    summary: topic.opposeVector.summary,
                    postCount: topic.opposeVector.posts.length
                },
                totalPosts: topic.totalPosts,
                score: topic.score,
                geographicScope: topic.geographicScope,
                state: topic.state,
                city: topic.city
            }))
        });
    }
    catch (error) {
        console.error('Error fetching trending topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending topics'
        });
    }
});
/**
 * Get posts for a specific topic using dual-vector matching
 */
router.get('/topics/:topicId/posts', auth_1.requireAuth, async (req, res) => {
    try {
        const { topicId } = req.params;
        const { page = 1, limit = 20, stance = 'all' } = req.query;
        // This would typically fetch from cache or regenerate the topic
        // For now, we'll fetch recent posts that match the topic
        // Get user's location
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { state: true, city: true }
        });
        // Get the topic data (would be from cache in production)
        const topics = await topicAggregationService_1.TopicAggregationService.aggregateTopics({
            userState: user?.state || undefined,
            userCity: user?.city || undefined
        });
        const topic = topics.find(t => t.id === topicId);
        if (!topic) {
            return res.status(404).json({
                success: false,
                error: 'Topic not found'
            });
        }
        // Filter posts based on stance preference
        let posts = [];
        if (stance === 'support' || stance === 'all') {
            posts = posts.concat(topic.supportVector.posts);
        }
        if (stance === 'oppose' || stance === 'all') {
            posts = posts.concat(topic.opposeVector.posts);
        }
        if (stance === 'neutral' || stance === 'all') {
            posts = posts.concat(topic.neutralPosts || []);
        }
        // Sort by similarity and recency
        posts.sort((a, b) => {
            const simDiff = (b.similarity || 0) - (a.similarity || 0);
            if (Math.abs(simDiff) > 0.1)
                return simDiff;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
        // Paginate
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedPosts = posts.slice(startIndex, endIndex);
        // Fetch full post data with author info
        const postIds = paginatedPosts.map(p => p.id);
        const fullPosts = await prisma.post.findMany({
            where: { id: { in: postIds } },
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
                likes: {
                    where: { userId: req.user.id },
                    select: { id: true }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
        res.json({
            success: true,
            topic: {
                id: topic.id,
                title: topic.title,
                supportSummary: topic.supportVector.summary,
                opposeSummary: topic.opposeVector.summary,
                supportPercentage: topic.supportVector.percentage,
                opposePercentage: topic.opposeVector.percentage
            },
            posts: fullPosts.map(post => ({
                ...post,
                isLiked: post.likes.length > 0,
                likeCount: post._count.likes,
                commentCount: post._count.comments,
                stance: topic.supportVector.posts.some(p => p.id === post.id) ? 'support' :
                    topic.opposeVector.posts.some(p => p.id === post.id) ? 'oppose' : 'neutral'
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: posts.length,
                hasMore: endIndex < posts.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching topic posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch topic posts'
        });
    }
});
/**
 * Get topics for map display (rotating subset)
 */
router.get('/map-topics', async (req, res) => {
    try {
        const { count = 3 } = req.query;
        // Get user's location if authenticated
        let userState;
        let userCity;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            // Validate token and get user (simplified for brevity)
            // In production, use the auth middleware
        }
        const topics = await topicAggregationService_1.TopicAggregationService.getMapTopics(userState, userCity, Number(count));
        res.json({
            success: true,
            topics: topics.map(topic => ({
                id: topic.id,
                title: topic.title,
                supportPercentage: topic.supportVector.percentage,
                opposePercentage: topic.opposeVector.percentage,
                geographicScope: topic.geographicScope
            }))
        });
    }
    catch (error) {
        console.error('Error fetching map topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch map topics'
        });
    }
});
/**
 * Force refresh topics (admin only)
 */
router.post('/refresh', auth_1.requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        // Clear cache and regenerate topics
        const topics = await topicAggregationService_1.TopicAggregationService.aggregateTopics({
            maxTopics: 20
        });
        res.json({
            success: true,
            message: 'Topics refreshed successfully',
            topicCount: topics.length
        });
    }
    catch (error) {
        console.error('Error refreshing topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh topics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=trendingTopics.js.map