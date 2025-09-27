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
// Get personalized feed using probability cloud algorithm
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
// Get trending posts (most liked in last 24 hours)
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
                photos: {
                    where: {
                        isActive: true,
                        photoType: 'POST_MEDIA'
                    },
                    select: {
                        id: true,
                        url: true,
                        thumbnailUrl: true,
                        width: true,
                        height: true,
                        mimeType: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true
                    }
                },
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
                commentsCount: post._count.comments || 0,
                sharesCount: post._count.shares || 0,
                viewsCount: 0, // Views not implemented yet
                communityNotesCount: 0,
                reportsCount: 0,
                commentEngagement
            };
            const engagementResult = engagementScoringService_1.EngagementScoringService.calculateScore(engagementMetrics, new Date(post.createdAt), 70 // Default reputation
            );
            return {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post._count.shares,
                engagementScore: engagementResult.score,
                _count: undefined
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
exports.default = router;
//# sourceMappingURL=feed.js.map