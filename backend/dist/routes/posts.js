"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notifications_1 = require("./notifications");
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const moderation_1 = require("../middleware/moderation");
const azureOpenAIService_1 = require("../services/azureOpenAIService");
const feedbackAnalysisService_1 = require("../services/feedbackAnalysisService");
const reputationService_1 = require("../services/reputationService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Create a new post
router.post('/', auth_1.requireAuth, moderation_1.checkUserSuspension, rateLimiting_1.postLimiter, moderation_1.contentFilter, validation_1.validatePost, (0, moderation_1.moderateContent)('POST'), async (req, res) => {
    try {
        const { content, imageUrl } = req.body;
        const userId = req.user.id;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Post content is required' });
        }
        if (content.length > 500) {
            return res.status(400).json({ error: 'Post content must be 500 characters or less' });
        }
        // Generate embedding for AI topic clustering using Azure OpenAI
        let embedding = [];
        try {
            const embeddingResult = await azureOpenAIService_1.azureOpenAI.generateEmbedding(content.trim());
            embedding = embeddingResult.embedding;
        }
        catch (error) {
            console.warn('Failed to generate embedding for post:', error);
            // Continue without embedding rather than failing the post creation
        }
        // Reputation-based content analysis
        let reputationImpact = { penalties: [], totalPenalty: 0 };
        try {
            // This will analyze content and apply penalties automatically
            reputationImpact = await reputationService_1.reputationService.analyzeAndApplyPenalties(content.trim(), userId, 'temp-post-id' // Will update with actual post ID after creation
            );
        }
        catch (error) {
            console.warn('Failed to analyze post for reputation impact:', error);
        }
        // Quick synchronous feedback check (instant, non-blocking)
        const quickCheck = feedbackAnalysisService_1.feedbackAnalysisService.performQuickKeywordCheck(content.trim());
        const feedbackData = quickCheck.isPotentialFeedback ? {
            containsFeedback: null, // Will be determined asynchronously
            feedbackStatus: 'pending_analysis'
        } : {
            containsFeedback: false // Definitely not feedback based on quick check
        };
        // Get user's current reputation for post attribution
        const userReputation = await reputationService_1.reputationService.getUserReputation(userId);
        const post = await prisma.post.create({
            data: {
                content: content.trim(),
                imageUrl,
                authorId: userId,
                embedding,
                authorReputation: userReputation.current,
                ...feedbackData
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
            }
        });
        // Update reputation event with actual post ID if penalties were applied
        if (reputationImpact.totalPenalty < 0) {
            try {
                await prisma.reputationEvent.updateMany({
                    where: {
                        userId: userId,
                        postId: 'temp-post-id',
                        createdAt: { gte: new Date(Date.now() - 5000) } // Last 5 seconds
                    },
                    data: { postId: post.id }
                });
            }
            catch (error) {
                console.warn('Failed to update reputation event with post ID:', error);
            }
        }
        // Async feedback analysis - runs in background without blocking response
        if (quickCheck.isPotentialFeedback) {
            // Fire and forget - don't await
            feedbackAnalysisService_1.feedbackAnalysisService.analyzePostAsync(post.id, content.trim(), userId)
                .then(() => {
                console.log(`Async feedback analysis completed for post ${post.id}`);
            })
                .catch(error => {
                console.error(`Async feedback analysis failed for post ${post.id}:`, error);
            });
        }
        res.status(201).json({
            message: 'Post created successfully',
            post: {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                _count: undefined,
                reputationImpact: reputationImpact.penalties.length > 0 ? {
                    penalties: reputationImpact.penalties,
                    totalPenalty: reputationImpact.totalPenalty
                } : undefined
            }
        });
    }
    catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's own posts (personal feed)
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        const posts = await prisma.post.findMany({
            where: { authorId: userId },
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
            orderBy: { createdAt: 'desc' },
            take: limitNum,
            skip: offsetNum
        });
        const formattedPosts = posts.map(post => ({
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
                count: posts.length
            }
        });
    }
    catch (error) {
        console.error('Get personal posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single post
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await prisma.post.findUnique({
            where: { id: postId },
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
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({
            post: {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                _count: undefined
            }
        });
    }
    catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Like/Unlike a post
router.post('/:postId/like', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Check if already liked
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            }
        });
        if (existingLike) {
            // Unlike the post
            await prisma.$transaction([
                prisma.like.delete({
                    where: {
                        userId_postId: {
                            userId,
                            postId
                        }
                    }
                }),
                prisma.post.update({
                    where: { id: postId },
                    data: { likesCount: { decrement: 1 } }
                })
            ]);
            res.json({ message: 'Post unliked successfully', liked: false });
        }
        else {
            // Like the post
            await prisma.$transaction([
                prisma.like.create({
                    data: {
                        userId,
                        postId
                    }
                }),
                prisma.post.update({
                    where: { id: postId },
                    data: { likesCount: { increment: 1 } }
                })
            ]);
            // Create notification if not liking own post
            if (post.authorId !== userId) {
                await (0, notifications_1.createNotification)('LIKE', userId, post.authorId, `${req.user.username} liked your post`, postId);
            }
            // Check if this qualifies as a quality post for reputation reward
            const totalLikes = await prisma.like.count({
                where: { postId }
            });
            // Award reputation for quality posts (5+ likes)
            if (totalLikes >= 5) {
                try {
                    await reputationService_1.reputationService.awardReputation(post.authorId, 'quality_post', postId);
                }
                catch (error) {
                    console.warn('Failed to award reputation for quality post:', error);
                }
            }
            res.json({ message: 'Post liked successfully', liked: true });
        }
    }
    catch (error) {
        console.error('Like/unlike post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add comment to post
router.post('/:postId/comments', auth_1.requireAuth, moderation_1.checkUserSuspension, moderation_1.contentFilter, validation_1.validateComment, (0, moderation_1.moderateContent)('COMMENT'), async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment content is required' });
        }
        if (content.length > 300) {
            return res.status(400).json({ error: 'Comment must be 300 characters or less' });
        }
        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Create comment and update post comment count
        const comment = await prisma.$transaction(async (tx) => {
            const newComment = await tx.comment.create({
                data: {
                    content: content.trim(),
                    userId,
                    postId
                },
                include: {
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
                }
            });
            await tx.post.update({
                where: { id: postId },
                data: { commentsCount: { increment: 1 } }
            });
            return newComment;
        });
        // Create notification if not commenting on own post
        if (post.authorId !== userId) {
            await (0, notifications_1.createNotification)('COMMENT', userId, post.authorId, `${req.user.username} commented on your post`, postId, comment.id);
        }
        res.status(201).json({
            message: 'Comment added successfully',
            comment
        });
    }
    catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get comments for a post
router.get('/:postId/comments', moderation_1.addContentWarnings, async (req, res) => {
    try {
        const { postId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const comments = await prisma.comment.findMany({
            where: { postId },
            include: {
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
            orderBy: { createdAt: 'asc' },
            take: limitNum,
            skip: offsetNum
        });
        res.json({
            comments,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: comments.length
            }
        });
    }
    catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get posts by a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Verify user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });
        if (!userExists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const posts = await prisma.post.findMany({
            where: { authorId: userId },
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
            orderBy: { createdAt: 'desc' },
            take: limitNum,
            skip: offsetNum
        });
        const postsWithCounts = posts.map(post => ({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            _count: undefined
        }));
        res.json({
            posts: postsWithCounts,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: posts.length
            }
        });
    }
    catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map