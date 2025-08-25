"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
/**
 * Feedback Management Routes
 *
 * API endpoints for managing site feedback detected through AI analysis
 * Provides admin dashboard capabilities and feedback response system
 */
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const feedbackAnalysisService_1 = require("../services/feedbackAnalysisService");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * Get all feedback posts for admin dashboard
 * GET /api/feedback
 */
router.get('/', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { type, category, priority, status = 'new', page = 1, limit = 20 } = req.query;
        const where = {
            containsFeedback: true
        };
        // Apply filters
        if (type)
            where.feedbackType = type;
        if (category)
            where.feedbackCategory = category;
        if (priority)
            where.feedbackPriority = priority;
        if (status)
            where.feedbackStatus = status;
        const offset = (Number(page) - 1) * Number(limit);
        const [posts, totalCount] = await Promise.all([
            prisma_1.prisma.post.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true
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
                    { feedbackPriority: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip: offset,
                take: Number(limit)
            }),
            prisma_1.prisma.post.count({ where })
        ]);
        // Add engagement metrics
        const feedbackPosts = posts.map(post => ({
            id: post.id,
            content: post.content,
            author: post.author,
            createdAt: post.createdAt,
            feedbackType: post.feedbackType,
            feedbackCategory: post.feedbackCategory,
            feedbackPriority: post.feedbackPriority,
            feedbackConfidence: post.feedbackConfidence,
            feedbackSummary: post.feedbackSummary,
            feedbackStatus: post.feedbackStatus,
            engagement: {
                likes: post._count.likes,
                comments: post._count.comments
            }
        }));
        res.json({
            feedback: feedbackPosts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / Number(limit))
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching feedback posts:', error);
        res.status(500).json({ error: 'Failed to fetch feedback posts' });
    }
});
/**
 * Get feedback statistics for dashboard
 * GET /api/feedback/stats
 */
router.get('/stats', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { timeframe = 'week' } = req.query;
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (timeframe) {
            case 'day':
                startDate.setDate(now.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }
        // Get feedback counts by type, category, priority, and status
        const [totalFeedback, byType, byCategory, byPriority, byStatus, recentFeedback] = await Promise.all([
            // Total feedback count
            prisma_1.prisma.post.count({
                where: {
                    containsFeedback: true,
                    createdAt: { gte: startDate }
                }
            }),
            // Group by feedback type
            prisma_1.prisma.post.groupBy({
                by: ['feedbackType'],
                where: {
                    containsFeedback: true,
                    createdAt: { gte: startDate }
                },
                _count: true
            }),
            // Group by category
            prisma_1.prisma.post.groupBy({
                by: ['feedbackCategory'],
                where: {
                    containsFeedback: true,
                    createdAt: { gte: startDate }
                },
                _count: true
            }),
            // Group by priority
            prisma_1.prisma.post.groupBy({
                by: ['feedbackPriority'],
                where: {
                    containsFeedback: true,
                    createdAt: { gte: startDate }
                },
                _count: true
            }),
            // Group by status
            prisma_1.prisma.post.groupBy({
                by: ['feedbackStatus'],
                where: {
                    containsFeedback: true,
                    createdAt: { gte: startDate }
                },
                _count: true
            }),
            // Recent feedback trend (daily counts)
            prisma_1.prisma.$queryRaw `
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM "Post" 
                WHERE "contain_feedback" = true 
                AND created_at >= ${startDate}
                GROUP BY DATE(created_at)
                ORDER BY date
            `
        ]);
        // Calculate average confidence
        const avgConfidenceResult = await prisma_1.prisma.post.aggregate({
            where: {
                containsFeedback: true,
                createdAt: { gte: startDate }
            },
            _avg: {
                feedbackConfidence: true
            }
        });
        res.json({
            timeframe,
            totalFeedback,
            averageConfidence: avgConfidenceResult._avg.feedbackConfidence || 0,
            breakdown: {
                byType: byType.reduce((acc, item) => {
                    acc[item.feedbackType || 'unknown'] = item._count;
                    return acc;
                }, {}),
                byCategory: byCategory.reduce((acc, item) => {
                    acc[item.feedbackCategory || 'unknown'] = item._count;
                    return acc;
                }, {}),
                byPriority: byPriority.reduce((acc, item) => {
                    acc[item.feedbackPriority || 'unknown'] = item._count;
                    return acc;
                }, {}),
                byStatus: byStatus.reduce((acc, item) => {
                    acc[item.feedbackStatus || 'unknown'] = item._count;
                    return acc;
                }, {})
            },
            trend: recentFeedback
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching feedback stats:', error);
        res.status(500).json({ error: 'Failed to fetch feedback statistics' });
    }
});
/**
 * Update feedback status (acknowledge, in progress, resolved, etc.)
 * PUT /api/feedback/:id/status
 */
router.put('/:id/status', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTo, adminNotes } = req.body;
        const validStatuses = ['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }
        // Update the post feedback status
        const updatedPost = await prisma_1.prisma.post.update({
            where: {
                id,
                containsFeedback: true
            },
            data: {
                feedbackStatus: status
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true
                    }
                }
            }
        });
        // Log the status change for audit trail
        logger_1.default.info(`Feedback post ${id} status changed to ${status} by admin ${req.user.id}`);
        // TODO: Optionally notify the original poster of status change
        // This could integrate with your existing notification system
        res.json({
            message: 'Feedback status updated successfully',
            post: updatedPost
        });
    }
    catch (error) {
        logger_1.default.error('Error updating feedback status:', error);
        res.status(500).json({ error: 'Failed to update feedback status' });
    }
});
/**
 * Manually analyze a post for feedback (for testing/verification)
 * POST /api/feedback/analyze
 */
router.post('/analyze', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { content, postId } = req.body;
        if (!content && !postId) {
            return res.status(400).json({ error: 'Either content or postId is required' });
        }
        let analysisContent = content;
        // If postId provided, fetch the post content
        if (postId && !content) {
            const post = await prisma_1.prisma.post.findUnique({
                where: { id: postId },
                select: { content: true }
            });
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            analysisContent = post.content;
        }
        // Perform feedback analysis
        const analysis = await feedbackAnalysisService_1.feedbackAnalysisService.analyzePost(analysisContent);
        res.json({
            analysis,
            content: analysisContent
        });
    }
    catch (error) {
        logger_1.default.error('Error analyzing content for feedback:', error);
        res.status(500).json({ error: 'Failed to analyze content' });
    }
});
/**
 * Batch re-analyze existing posts for feedback (admin utility)
 * POST /api/feedback/batch-analyze
 */
router.post('/batch-analyze', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.body;
        // Get posts that haven't been analyzed for feedback yet
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                containsFeedback: null // Not yet analyzed
            },
            select: {
                id: true,
                content: true
            },
            take: Number(limit),
            skip: Number(offset),
            orderBy: { createdAt: 'desc' }
        });
        if (posts.length === 0) {
            return res.json({ message: 'No posts to analyze', analyzed: 0 });
        }
        // Batch analyze posts
        const analyses = await feedbackAnalysisService_1.feedbackAnalysisService.analyzeBatch(posts);
        // Update posts with feedback analysis results
        const updatePromises = Array.from(analyses.entries()).map(([postId, analysis]) => {
            if (analysis.isFeedback && analysis.confidence > 0.6) {
                return prisma_1.prisma.post.update({
                    where: { id: postId },
                    data: {
                        containsFeedback: true,
                        feedbackType: analysis.type,
                        feedbackCategory: analysis.category,
                        feedbackPriority: analysis.priority,
                        feedbackConfidence: analysis.confidence,
                        feedbackSummary: analysis.summary,
                        feedbackStatus: 'new'
                    }
                });
            }
            else {
                return prisma_1.prisma.post.update({
                    where: { id: postId },
                    data: {
                        containsFeedback: false
                    }
                });
            }
        });
        await Promise.allSettled(updatePromises);
        const feedbackFound = Array.from(analyses.values()).filter(a => a.isFeedback).length;
        res.json({
            message: `Analyzed ${posts.length} posts`,
            analyzed: posts.length,
            feedbackFound,
            confidenceThreshold: 0.6
        });
    }
    catch (error) {
        logger_1.default.error('Error in batch feedback analysis:', error);
        res.status(500).json({ error: 'Failed to perform batch analysis' });
    }
});
exports.default = router;
//# sourceMappingURL=feedback.js.map