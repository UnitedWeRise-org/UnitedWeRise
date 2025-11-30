"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const notifications_1 = require("./notifications");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const moderation_1 = require("../middleware/moderation");
const azureOpenAIService_1 = require("../services/azureOpenAIService");
const feedbackAnalysisService_1 = require("../services/feedbackAnalysisService");
const reputationService_1 = require("../services/reputationService");
const activityTracker_1 = require("../services/activityTracker");
const postGeographicService_1 = require("../services/postGeographicService");
const postManagementService_1 = require("../services/postManagementService");
const engagementScoringService_1 = require("../services/engagementScoringService");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * /api/posts/map-data:
 *   get:
 *     tags: [Post]
 *     summary: Get posts with geographic data for map display
 *     description: Returns posts filtered by geographic scope (national, state, or local) for map visualization
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [national, state, local]
 *           default: national
 *         description: Geographic scope for post filtering
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 9
 *         description: Maximum number of posts to return
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 scope:
 *                   type: string
 *                   example: national
 *                 hasRealPosts:
 *                   type: boolean
 *                 fallbackNeeded:
 *                   type: boolean
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/map-data', auth_1.requireAuth, async (req, res) => {
    try {
        const { scope = 'national', count = 9 } = req.query;
        const userId = req.user.id;
        // Get user's H3 index for jurisdiction filtering
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { h3Index: true }
        });
        const posts = await postGeographicService_1.PostGeographicService.getPostsForMap(scope, user?.h3Index || undefined, parseInt(count));
        logger_1.logger.info({ postCount: posts.length, scope, userId }, 'Map data request');
        res.json({
            success: true,
            data: posts,
            scope,
            hasRealPosts: posts.length > 0,
            fallbackNeeded: posts.length < 2
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, scope: req.query.scope, userId: req.user.id }, 'Error fetching map data');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch map data',
            fallbackNeeded: true
        });
    }
});
/**
 * @swagger
 * /api/posts:
 *   post:
 *     tags: [Post]
 *     summary: Create a new post
 *     description: Creates a new post with content moderation, geographic tagging, AI embedding, and reputation tracking. Automatically splits long content into main and extended sections.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: Post content (automatically split if >500 chars)
 *                 example: "This is my post about civic engagement..."
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of attached image (optional)
 *               mediaId:
 *                 type: string
 *                 description: ID of single uploaded photo to attach
 *               mediaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of photo IDs to attach to post
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Public Post, Official Post, Candidate Post, Volunteer Post]
 *                 description: Post tags (default "Public Post"). "Official Post" requires ELECTED_OFFICIAL profile, "Candidate Post" requires CANDIDATE profile
 *                 example: ["Public Post"]
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post created successfully
 *                 post:
 *                   type: object
 *                   description: Created post with engagement counts
 *       400:
 *         description: Validation error - missing content or invalid data
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - insufficient permissions for requested tag type or user is suspended
 *       404:
 *         description: User not found
 *       429:
 *         description: Rate limit exceeded - too many posts
 *       500:
 *         description: Internal server error
 */
router.post('/', auth_1.requireAuth, moderation_1.checkUserSuspension, rateLimiting_1.postLimiter, moderation_1.contentFilter, validation_1.validatePost, (0, moderation_1.moderateContent)('POST'), async (req, res) => {
    try {
        const { content, imageUrl, mediaId, tags, audience } = req.body;
        const userId = req.user.id;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Post content is required' });
        }
        // Validate audience if provided (default is PUBLIC)
        const validAudiences = ['PUBLIC', 'NON_FRIENDS', 'FRIENDS_ONLY'];
        const postAudience = audience && validAudiences.includes(audience) ? audience : 'PUBLIC';
        // Handle photo attachments - accept both singular mediaId and array mediaIds
        const photoIds = [];
        if (mediaId) {
            photoIds.push(mediaId);
        }
        if (req.body.mediaIds && Array.isArray(req.body.mediaIds)) {
            photoIds.push(...req.body.mediaIds);
        }
        // Handle content length - split into content and extendedContent if needed
        let mainContent = content.trim();
        let extendedContent = null;
        if (content.length > 500) {
            // Find a good break point near 500 characters (prefer sentence or word boundaries)
            let breakPoint = 500;
            // Look for sentence endings near 500 chars
            for (let i = 450; i < Math.min(500, content.length); i++) {
                if (content[i] === '.' || content[i] === '!' || content[i] === '?') {
                    if (i + 1 < content.length && content[i + 1] === ' ') {
                        breakPoint = i + 1;
                        break;
                    }
                }
            }
            // If no sentence break found, look for word boundaries
            if (breakPoint === 500) {
                for (let i = 480; i < Math.min(500, content.length); i++) {
                    if (content[i] === ' ') {
                        breakPoint = i;
                        break;
                    }
                }
            }
            mainContent = content.substring(0, breakPoint).trim();
            extendedContent = content.substring(breakPoint).trim();
        }
        // Generate embedding for AI topic clustering using Azure OpenAI (use full original content)
        let embedding = [];
        try {
            const embeddingResult = await azureOpenAIService_1.azureOpenAI.generateEmbedding(content.trim());
            embedding = embeddingResult.embedding;
        }
        catch (error) {
            logger_1.logger.warn({ err: error }, 'Failed to generate embedding for post');
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
            logger_1.logger.warn({ err: error, userId }, 'Failed to analyze post for reputation impact');
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
        // Validate and set tags with proper defaults and permissions
        const requestedTags = tags || ["Public Post"];
        // Validate permissions for special tags by fetching full user record
        const fullUser = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, politicalProfileType: true }
        });
        if (!fullUser) {
            return res.status(404).json({ error: "User not found" });
        }
        for (const tag of requestedTags) {
            if (tag === "Official Post" && fullUser.politicalProfileType !== 'ELECTED_OFFICIAL') {
                return res.status(403).json({ error: "Only elected officials can create Official Posts" });
            }
            if (tag === "Candidate Post" && fullUser.politicalProfileType !== 'CANDIDATE') {
                return res.status(403).json({ error: "Only registered candidates can create Candidate Posts" });
            }
            // "Public Post" and "Volunteer Post" are allowed for everyone
        }
        // Generate geographic data for post (graceful fallback if user has no address)
        const geographicData = await postGeographicService_1.PostGeographicService.generatePostGeographicData(userId);
        const post = await prisma_1.prisma.post.create({
            data: {
                content: mainContent,
                extendedContent,
                imageUrl,
                authorId: userId,
                embedding,
                authorReputation: userReputation.current,
                tags: requestedTags,
                audience: postAudience,
                ...feedbackData,
                // Include geographic data if available (null values are handled gracefully)
                ...(geographicData && {
                    h3Index: geographicData.h3Index,
                    latitude: geographicData.latitude,
                    longitude: geographicData.longitude,
                    originalH3Index: geographicData.originalH3Index,
                    privacyDisplaced: geographicData.privacyDisplaced
                })
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
                photos: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
        // Link photos to post if photoIds provided
        if (photoIds.length > 0) {
            await prisma_1.prisma.photo.updateMany({
                where: {
                    id: { in: photoIds },
                    userId: userId // Verify user owns these photos
                },
                data: {
                    postId: post.id
                }
            });
            // Refresh post with photos
            const updatedPost = await prisma_1.prisma.post.findUnique({
                where: { id: post.id },
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
                    photos: true,
                    _count: {
                        select: {
                            likes: true,
                            comments: true
                        }
                    }
                }
            });
            if (updatedPost) {
                // Replace post with updated version that includes photos
                Object.assign(post, updatedPost);
            }
        }
        // Posts now use imageUrl field directly instead of Photo relations
        // Update reputation event with actual post ID if penalties were applied
        if (reputationImpact.totalPenalty < 0) {
            try {
                await prisma_1.prisma.reputationEvent.updateMany({
                    where: {
                        userId: userId,
                        postId: 'temp-post-id',
                        createdAt: { gte: new Date(Date.now() - 5000) } // Last 5 seconds
                    },
                    data: { postId: post.id }
                });
            }
            catch (error) {
                logger_1.logger.warn({ err: error, postId: post.id }, 'Failed to update reputation event with post ID');
            }
        }
        // Track post creation activity
        try {
            await activityTracker_1.ActivityTracker.trackPostCreated(userId, post.id, content.trim());
        }
        catch (error) {
            logger_1.logger.error({ err: error, postId: post.id, userId: req.user.id }, 'Failed to track post creation activity');
            // Don't fail the post creation if activity tracking fails
        }
        // Async feedback analysis - runs in background without blocking response
        if (quickCheck.isPotentialFeedback) {
            // Fire and forget - don't await
            feedbackAnalysisService_1.feedbackAnalysisService.analyzePostAsync(post.id, content.trim(), userId)
                .then(() => {
                logger_1.logger.info({ postId: post.id }, 'Async feedback analysis completed');
            })
                .catch(error => {
                logger_1.logger.error({ err: error, postId: post.id }, 'Async feedback analysis failed');
            });
        }
        // Notify subscribers who have opted into new post notifications (async, don't block response)
        (async () => {
            try {
                // Find all subscribers who want notifications when this user posts
                const subscribersToNotify = await prisma_1.prisma.subscription.findMany({
                    where: {
                        subscribedId: userId,
                        notifyOnNewPosts: true
                    },
                    select: { subscriberId: true }
                });
                if (subscribersToNotify.length > 0) {
                    const authorName = post.author.firstName && post.author.lastName
                        ? `${post.author.firstName} ${post.author.lastName}`
                        : post.author.username;
                    // Create notifications for each subscriber (batch notification)
                    const notificationPromises = subscribersToNotify.map(sub => (0, notifications_1.createNotification)('NEW_POST', userId, sub.subscriberId, `${authorName} posted something new`, post.id));
                    await Promise.allSettled(notificationPromises);
                    logger_1.logger.info({ postId: post.id, notifiedCount: subscribersToNotify.length }, 'Subscription notifications sent');
                }
            }
            catch (error) {
                logger_1.logger.error({ err: error, postId: post.id }, 'Failed to send subscription notifications');
            }
        })();
        res.status(201).json({
            message: 'Post created successfully',
            post: {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                dislikesCount: 0,
                agreesCount: 0,
                disagreesCount: 0,
                userSentiment: null,
                userStance: null,
                isLiked: false,
                isShared: false,
                userShareType: null,
                userShareContent: null,
                _count: undefined,
                reputationImpact: reputationImpact.penalties.length > 0 ? {
                    penalties: reputationImpact.penalties,
                    totalPenalty: reputationImpact.totalPenalty
                } : undefined
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Create post error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/me:
 *   get:
 *     tags: [Post]
 *     summary: Get current user's own posts
 *     description: Returns authenticated user's posts with reaction and share data
 *     security:
 *       - cookieAuth: []
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
 *         description: Number of posts to skip for pagination
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        const posts = await prisma_1.prisma.post.findMany({
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
                photos: true,
                reactions: {
                    where: { userId },
                    select: {
                        sentiment: true,
                        stance: true
                    }
                },
                shares: {
                    where: { userId },
                    select: {
                        shareType: true,
                        content: true
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
        const formattedPosts = posts.map(post => {
            const userReaction = post.reactions[0] || null;
            const userShare = post.shares[0] || null;
            return {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                dislikesCount: post.dislikesCount || 0,
                agreesCount: post.agreesCount || 0,
                disagreesCount: post.disagreesCount || 0,
                userSentiment: userReaction?.sentiment || null,
                userStance: userReaction?.stance || null,
                isLiked: userReaction?.sentiment === 'LIKE',
                isShared: !!userShare,
                userShareType: userShare?.shareType || null,
                userShareContent: userShare?.content || null,
                reactions: undefined,
                shares: undefined,
                _count: undefined
            };
        });
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
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Get personal posts error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/saved:
 *   get:
 *     tags: [Post]
 *     summary: Get user's saved posts
 *     description: Retrieve all posts saved by the authenticated user with pagination and sorting options
 *     security:
 *       - cookieAuth: []
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
 *         description: Number of posts to skip for pagination
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, oldest, popular]
 *           default: recent
 *         description: Sort order (recent=most recently saved, oldest=first saved, popular=most likes)
 *     responses:
 *       200:
 *         description: Saved posts retrieved successfully
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/saved', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const sort = req.query.sort || 'recent';
        // Build orderBy based on sort parameter
        let orderBy = { savedAt: 'desc' }; // Default: most recent
        if (sort === 'oldest') {
            orderBy = { savedAt: 'asc' };
        }
        else if (sort === 'popular') {
            orderBy = { post: { likesCount: 'desc' } };
        }
        // Get saved posts with full post data
        const savedPosts = await prisma_1.prisma.savedPost.findMany({
            where: {
                userId
            },
            include: {
                post: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatar: true,
                                verified: true,
                                politicalProfileType: true
                            }
                        },
                        photos: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                url: true,
                                thumbnailUrl: true
                            }
                        }
                    }
                }
            },
            orderBy,
            take: limit,
            skip: offset
        });
        // Get total count
        const total = await prisma_1.prisma.savedPost.count({
            where: { userId }
        });
        // Extract posts from saved posts
        const posts = savedPosts.map(sp => sp.post);
        res.json({
            success: true,
            data: {
                posts,
                total,
                hasMore: (offset + limit) < total
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Get saved posts error');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve saved posts'
        });
    }
});
/**
 * @swagger
 * /api/posts/{postId}:
 *   get:
 *     tags: [Post]
 *     summary: Get single post by ID
 *     description: Retrieves a specific post with user's reaction data if authenticated
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post unique identifier
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   type: object
 *                   description: Post with engagement data and user reactions
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.headers.authorization ?
            req.user?.id : null; // Try to get user ID if authenticated
        const post = await prisma_1.prisma.post.findUnique({
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
                photos: true,
                reactions: userId ? {
                    where: { userId },
                    select: {
                        sentiment: true,
                        stance: true
                    }
                } : false,
                shares: userId ? {
                    where: { userId },
                    select: {
                        shareType: true,
                        content: true
                    }
                } : false,
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
        const userReaction = post.reactions && post.reactions[0] ? post.reactions[0] : null;
        const userShare = post.shares && post.shares[0] ? post.shares[0] : null;
        res.json({
            post: {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                dislikesCount: post.dislikesCount || 0,
                agreesCount: post.agreesCount || 0,
                disagreesCount: post.disagreesCount || 0,
                userSentiment: userReaction?.sentiment || null,
                userStance: userReaction?.stance || null,
                isLiked: userReaction?.sentiment === 'LIKE',
                isShared: !!userShare,
                userShareType: userShare?.shareType || null,
                userShareContent: userShare?.content || null,
                reactions: undefined,
                shares: undefined,
                _count: undefined
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.postId }, 'Get post error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/like:
 *   post:
 *     tags: [Post]
 *     summary: Like or unlike a post
 *     description: Toggles like status on a post. Awards reputation to post author when reaching 5+ likes.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to like/unlike
 *     responses:
 *       200:
 *         description: Like status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post liked successfully
 *                 liked:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/:postId/like', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        // Check if post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                authorId: true,
                content: true
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Check if already liked
        const existingLike = await prisma_1.prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            }
        });
        if (existingLike) {
            // Unlike the post
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.like.delete({
                    where: {
                        userId_postId: {
                            userId,
                            postId
                        }
                    }
                }),
                prisma_1.prisma.post.update({
                    where: { id: postId },
                    data: { likesCount: { decrement: 1 } }
                })
            ]);
            // Track unlike activity
            try {
                await activityTracker_1.ActivityTracker.trackLikeRemoved(userId, postId, post.content);
            }
            catch (error) {
                logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Failed to track unlike activity');
                // Don't fail the unlike action if activity tracking fails
            }
            res.json({ message: 'Post unliked successfully', liked: false });
        }
        else {
            // Like the post
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.like.create({
                    data: {
                        userId,
                        postId
                    }
                }),
                prisma_1.prisma.post.update({
                    where: { id: postId },
                    data: { likesCount: { increment: 1 } }
                })
            ]);
            // Create notification if not liking own post
            if (post.authorId !== userId) {
                await (0, notifications_1.createNotification)('LIKE', userId, post.authorId, `${req.user.username} liked your post`, postId);
            }
            // Check if this qualifies as a quality post for reputation reward
            const totalLikes = await prisma_1.prisma.like.count({
                where: { postId }
            });
            // Award reputation for quality posts (5+ likes)
            if (totalLikes >= 5) {
                try {
                    await reputationService_1.reputationService.awardReputation(post.authorId, 'quality_post', postId);
                }
                catch (error) {
                    logger_1.logger.warn({ err: error, postId: req.params.id, authorId: post.authorId }, 'Failed to award reputation for quality post');
                }
            }
            // Track like activity
            try {
                await activityTracker_1.ActivityTracker.trackLikeAdded(userId, postId, post.content);
            }
            catch (error) {
                logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Failed to track like activity');
                // Don't fail the like action if activity tracking fails
            }
            res.json({ message: 'Post liked successfully', liked: true });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Like/unlike post error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/reaction:
 *   post:
 *     tags: [Post]
 *     summary: Add or update reaction to a post
 *     description: Enhanced reaction system allowing sentiment (LIKE/DISLIKE) and stance (AGREE/DISAGREE) reactions. Pass reactionValue as null to remove reaction.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to react to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reactionType
 *               - reactionValue
 *             properties:
 *               reactionType:
 *                 type: string
 *                 enum: [sentiment, stance]
 *                 description: Type of reaction
 *               reactionValue:
 *                 type: string
 *                 enum: [LIKE, DISLIKE, AGREE, DISAGREE, null]
 *                 nullable: true
 *                 description: Reaction value (null to remove reaction)
 *     responses:
 *       200:
 *         description: Reaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reactionType:
 *                   type: string
 *                 reactionValue:
 *                   type: string
 *       400:
 *         description: Invalid reaction type or value
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/:postId/reaction', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const { reactionType, reactionValue } = req.body;
        const userId = req.user.id;
        // Validate reaction type and value
        if (!reactionType || !['sentiment', 'stance'].includes(reactionType)) {
            return res.status(400).json({ error: 'Invalid reaction type. Must be "sentiment" or "stance"' });
        }
        const validSentiments = ['LIKE', 'DISLIKE'];
        const validStances = ['AGREE', 'DISAGREE'];
        if (reactionType === 'sentiment' && reactionValue && !validSentiments.includes(reactionValue)) {
            return res.status(400).json({ error: 'Invalid sentiment. Must be LIKE or DISLIKE' });
        }
        if (reactionType === 'stance' && reactionValue && !validStances.includes(reactionValue)) {
            return res.status(400).json({ error: 'Invalid stance. Must be AGREE or DISAGREE' });
        }
        // Check if post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                authorId: true,
                content: true
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Find existing reaction for this user and post
        const existingReaction = await prisma_1.prisma.reaction.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            }
        });
        if (reactionValue === null) {
            // Remove reaction
            if (existingReaction) {
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.reaction.delete({
                        where: {
                            userId_postId: {
                                userId,
                                postId
                            }
                        }
                    }),
                    // Update post counts based on what was removed
                    prisma_1.prisma.post.update({
                        where: { id: postId },
                        data: {
                            ...(existingReaction.sentiment === 'LIKE' && { likesCount: { decrement: 1 } }),
                            ...(existingReaction.sentiment === 'DISLIKE' && { dislikesCount: { decrement: 1 } }),
                            ...(existingReaction.stance === 'AGREE' && { agreesCount: { decrement: 1 } }),
                            ...(existingReaction.stance === 'DISAGREE' && { disagreesCount: { decrement: 1 } })
                        }
                    })
                ]);
                // Track reaction removal
                try {
                    await activityTracker_1.ActivityTracker.trackReactionChanged(userId, postId, post.content, reactionType, existingReaction[reactionType] || '', null);
                }
                catch (error) {
                    logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Failed to track reaction removal');
                }
            }
            res.json({ message: 'Reaction removed successfully' });
        }
        else {
            // Add or update reaction
            const reactionData = {
                userId,
                postId,
                ...(reactionType === 'sentiment' ? { sentiment: reactionValue } : {}),
                ...(reactionType === 'stance' ? { stance: reactionValue } : {})
            };
            if (existingReaction) {
                // Update existing reaction
                const oldValue = existingReaction[reactionType];
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.reaction.update({
                        where: {
                            userId_postId: {
                                userId,
                                postId
                            }
                        },
                        data: reactionData
                    }),
                    // Update post counts - decrement old, increment new
                    prisma_1.prisma.post.update({
                        where: { id: postId },
                        data: {
                            // Decrement old reaction counts
                            ...(oldValue === 'LIKE' && { likesCount: { decrement: 1 } }),
                            ...(oldValue === 'DISLIKE' && { dislikesCount: { decrement: 1 } }),
                            ...(oldValue === 'AGREE' && { agreesCount: { decrement: 1 } }),
                            ...(oldValue === 'DISAGREE' && { disagreesCount: { decrement: 1 } }),
                            // Increment new reaction counts
                            ...(reactionValue === 'LIKE' && { likesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISLIKE' && { dislikesCount: { increment: 1 } }),
                            ...(reactionValue === 'AGREE' && { agreesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISAGREE' && { disagreesCount: { increment: 1 } })
                        }
                    })
                ]);
                // Track reaction change
                try {
                    await activityTracker_1.ActivityTracker.trackReactionChanged(userId, postId, post.content, reactionType, oldValue, reactionValue);
                }
                catch (error) {
                    logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id, reactionType: req.body.reactionType }, 'Failed to track reaction change');
                }
            }
            else {
                // Create new reaction
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.reaction.create({
                        data: reactionData
                    }),
                    // Update post counts
                    prisma_1.prisma.post.update({
                        where: { id: postId },
                        data: {
                            ...(reactionValue === 'LIKE' && { likesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISLIKE' && { dislikesCount: { increment: 1 } }),
                            ...(reactionValue === 'AGREE' && { agreesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISAGREE' && { disagreesCount: { increment: 1 } })
                        }
                    })
                ]);
                // Create notification if not reacting to own post
                if (post.authorId !== userId) {
                    try {
                        await (0, notifications_1.createNotification)('REACTION', userId, post.authorId, `${req.user.username} reacted to your post`, postId);
                    }
                    catch (error) {
                        logger_1.logger.warn({ err: error, postId: req.params.id, userId: req.user.id, reactionType: req.body.reactionType }, 'Failed to create reaction notification');
                    }
                }
                // Track new reaction
                try {
                    await activityTracker_1.ActivityTracker.trackReactionChanged(userId, postId, post.content, reactionType, null, reactionValue);
                }
                catch (error) {
                    logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id, reactionType: req.body.reactionType }, 'Failed to track new reaction');
                }
            }
            res.json({ message: 'Reaction updated successfully', reactionType, reactionValue });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Enhanced reaction error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/share:
 *   post:
 *     tags: [Post]
 *     summary: Share a post
 *     description: Share a post (simple share) or share with commentary (quote share). Cannot share own posts.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to share
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shareType
 *             properties:
 *               shareType:
 *                 type: string
 *                 enum: [SIMPLE, QUOTE]
 *                 description: Share type
 *               content:
 *                 type: string
 *                 maxLength: 500
 *                 description: Quote content (required for QUOTE shares)
 *     responses:
 *       200:
 *         description: Post shared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 shareType:
 *                   type: string
 *                 hasContent:
 *                   type: boolean
 *       400:
 *         description: Invalid share type, missing quote content, or attempting to share own post
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/:postId/share', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const { shareType, content } = req.body;
        const userId = req.user.id;
        // Validate share type
        if (!shareType || !['SIMPLE', 'QUOTE'].includes(shareType)) {
            return res.status(400).json({ error: 'Invalid share type. Must be SIMPLE or QUOTE' });
        }
        // Validate quote content if it's a quote share
        if (shareType === 'QUOTE') {
            if (!content || content.trim().length === 0) {
                return res.status(400).json({ error: 'Quote content is required for quote shares' });
            }
            if (content.length > 500) {
                return res.status(400).json({ error: 'Quote content must be 500 characters or less' });
            }
        }
        // Check if post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                authorId: true,
                content: true
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Prevent sharing own posts
        if (post.authorId === userId) {
            return res.status(400).json({ error: 'You cannot share your own posts' });
        }
        // Check if user already shared this post
        const existingShare = await prisma_1.prisma.share.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            }
        });
        if (existingShare) {
            return res.status(400).json({ error: 'You have already shared this post' });
        }
        // Create share record and update post count
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.share.create({
                data: {
                    userId,
                    postId,
                    shareType,
                    content: shareType === 'QUOTE' ? content.trim() : null
                }
            }),
            prisma_1.prisma.post.update({
                where: { id: postId },
                data: { sharesCount: { increment: 1 } }
            })
        ]);
        // Create notification if not sharing own post
        if (post.authorId !== userId) {
            try {
                await (0, notifications_1.createNotification)('REACTION', // Using REACTION type for shares for now
                userId, post.authorId, shareType === 'QUOTE'
                    ? `${req.user.username} shared your post with a quote`
                    : `${req.user.username} shared your post`, postId);
            }
            catch (error) {
                logger_1.logger.warn({ err: error, postId: req.params.id, userId: req.user.id }, 'Failed to create share notification');
            }
        }
        // Track share activity
        try {
            await activityTracker_1.ActivityTracker.trackShareAdded(userId, postId, post.content.substring(0, 100), shareType, content?.substring(0, 100));
        }
        catch (error) {
            logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Failed to track share activity');
        }
        res.json({
            message: shareType === 'QUOTE' ? 'Post shared with quote successfully' : 'Post shared successfully',
            shareType,
            hasContent: !!content
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Share post error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/comments/{commentId}/reaction:
 *   post:
 *     tags: [Post]
 *     summary: Add or update reaction to a comment
 *     description: React to a comment with sentiment (LIKE/DISLIKE) or stance (AGREE/DISAGREE). Pass reactionValue as null to remove reaction.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID to react to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reactionType
 *               - reactionValue
 *             properties:
 *               reactionType:
 *                 type: string
 *                 enum: [sentiment, stance]
 *               reactionValue:
 *                 type: string
 *                 enum: [LIKE, DISLIKE, AGREE, DISAGREE, null]
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Comment reaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reactionType:
 *                   type: string
 *                 reactionValue:
 *                   type: string
 *       400:
 *         description: Invalid reaction type or value
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.post('/comments/:commentId/reaction', auth_1.requireAuth, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { reactionType, reactionValue } = req.body;
        const userId = req.user.id;
        // Validate reaction type and value
        if (!reactionType || !['sentiment', 'stance'].includes(reactionType)) {
            return res.status(400).json({ error: 'Invalid reaction type. Must be "sentiment" or "stance"' });
        }
        const validSentiments = ['LIKE', 'DISLIKE'];
        const validStances = ['AGREE', 'DISAGREE'];
        if (reactionType === 'sentiment' && reactionValue && !validSentiments.includes(reactionValue)) {
            return res.status(400).json({ error: 'Invalid sentiment. Must be LIKE or DISLIKE' });
        }
        if (reactionType === 'stance' && reactionValue && !validStances.includes(reactionValue)) {
            return res.status(400).json({ error: 'Invalid stance. Must be AGREE or DISAGREE' });
        }
        // Check if comment exists
        const comment = await prisma_1.prisma.comment.findUnique({
            where: { id: commentId },
            select: {
                id: true,
                userId: true,
                content: true,
                postId: true
            }
        });
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        // Find existing reaction for this user and comment
        const existingReaction = await prisma_1.prisma.reaction.findUnique({
            where: {
                userId_commentId: {
                    userId,
                    commentId
                }
            }
        });
        if (reactionValue === null) {
            // Remove reaction
            if (existingReaction) {
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.reaction.delete({
                        where: {
                            userId_commentId: {
                                userId,
                                commentId
                            }
                        }
                    }),
                    // Update comment counts based on what was removed
                    prisma_1.prisma.comment.update({
                        where: { id: commentId },
                        data: {
                            ...(existingReaction.sentiment === 'LIKE' && { likesCount: { decrement: 1 } }),
                            ...(existingReaction.sentiment === 'DISLIKE' && { dislikesCount: { decrement: 1 } }),
                            ...(existingReaction.stance === 'AGREE' && { agreesCount: { decrement: 1 } }),
                            ...(existingReaction.stance === 'DISAGREE' && { disagreesCount: { decrement: 1 } })
                        }
                    })
                ]);
                // Track reaction removal
                try {
                    await activityTracker_1.ActivityTracker.trackReactionChanged(userId, comment.postId, comment.content, reactionType, existingReaction[reactionType] || '', null);
                }
                catch (error) {
                    logger_1.logger.error({ err: error, commentId: req.params.commentId, userId: req.user.id }, 'Failed to track comment reaction removal');
                }
            }
            res.json({ message: 'Comment reaction removed successfully' });
        }
        else {
            // Add or update reaction
            const reactionData = {
                userId,
                commentId,
                ...(reactionType === 'sentiment' ? { sentiment: reactionValue } : {}),
                ...(reactionType === 'stance' ? { stance: reactionValue } : {})
            };
            if (existingReaction) {
                // Update existing reaction
                const oldValue = existingReaction[reactionType];
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.reaction.update({
                        where: {
                            userId_commentId: {
                                userId,
                                commentId
                            }
                        },
                        data: reactionData
                    }),
                    // Update comment counts - decrement old, increment new
                    prisma_1.prisma.comment.update({
                        where: { id: commentId },
                        data: {
                            // Decrement old reaction counts
                            ...(oldValue === 'LIKE' && { likesCount: { decrement: 1 } }),
                            ...(oldValue === 'DISLIKE' && { dislikesCount: { decrement: 1 } }),
                            ...(oldValue === 'AGREE' && { agreesCount: { decrement: 1 } }),
                            ...(oldValue === 'DISAGREE' && { disagreesCount: { decrement: 1 } }),
                            // Increment new reaction counts
                            ...(reactionValue === 'LIKE' && { likesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISLIKE' && { dislikesCount: { increment: 1 } }),
                            ...(reactionValue === 'AGREE' && { agreesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISAGREE' && { disagreesCount: { increment: 1 } })
                        }
                    })
                ]);
                // Track reaction change
                try {
                    await activityTracker_1.ActivityTracker.trackReactionChanged(userId, comment.postId, comment.content, reactionType, oldValue, reactionValue);
                }
                catch (error) {
                    logger_1.logger.error({ err: error, commentId: req.params.commentId, userId: req.user.id, reactionType: req.body.reactionType }, 'Failed to track comment reaction change');
                }
            }
            else {
                // Create new reaction
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.reaction.create({
                        data: reactionData
                    }),
                    // Update comment counts
                    prisma_1.prisma.comment.update({
                        where: { id: commentId },
                        data: {
                            ...(reactionValue === 'LIKE' && { likesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISLIKE' && { dislikesCount: { increment: 1 } }),
                            ...(reactionValue === 'AGREE' && { agreesCount: { increment: 1 } }),
                            ...(reactionValue === 'DISAGREE' && { disagreesCount: { increment: 1 } })
                        }
                    })
                ]);
                // Create notification if not reacting to own comment
                if (comment.userId !== userId) {
                    try {
                        await (0, notifications_1.createNotification)('REACTION', userId, comment.userId, `${req.user.username} reacted to your comment`, comment.postId, commentId);
                    }
                    catch (error) {
                        logger_1.logger.warn({ err: error, commentId: req.params.commentId, userId: req.user.id, reactionType: req.body.reactionType }, 'Failed to create comment reaction notification');
                    }
                }
                // Track new reaction
                try {
                    await activityTracker_1.ActivityTracker.trackReactionChanged(userId, comment.postId, comment.content, reactionType, null, reactionValue);
                }
                catch (error) {
                    logger_1.logger.error({ err: error, commentId: req.params.commentId, userId: req.user.id, reactionType: req.body.reactionType }, 'Failed to track new comment reaction');
                }
            }
            res.json({ message: 'Comment reaction updated successfully', reactionType, reactionValue });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, commentId: req.params.commentId, userId: req.user.id }, 'Comment reaction error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   post:
 *     tags: [Post]
 *     summary: Add a comment to a post
 *     description: Create a comment on a post with depth-based threading. Supports nested replies up to 3 visual layers. Author continuations (author commenting on own post) have higher character limits.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Comment content (max 2000 chars for normal comments, 5000 for author continuations)
 *               parentId:
 *                 type: string
 *                 description: Parent comment ID for nested replies (optional)
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 comment:
 *                   type: object
 *                   description: Created comment with user data
 *       400:
 *         description: Validation error - missing content or exceeds character limit
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is suspended
 *       404:
 *         description: Post or parent comment not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/:postId/comments', auth_1.requireAuth, moderation_1.checkUserSuspension, moderation_1.contentFilter, validation_1.validateComment, (0, moderation_1.moderateContent)('COMMENT'), async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, parentId } = req.body;
        const userId = req.user.id;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment content is required' });
        }
        // Check if post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, authorId: true, content: true }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Different character limits based on context
        const isAuthorContinuation = post.authorId === userId && !parentId; // Author's direct reply to own post
        const maxLength = isAuthorContinuation ? 5000 : 2000;
        if (content.length > maxLength) {
            return res.status(400).json({
                error: `Comment must be ${maxLength} characters or less`
            });
        }
        // If parentId is provided, validate parent comment and calculate depth
        let depth = 0;
        if (parentId) {
            const parentComment = await prisma_1.prisma.comment.findUnique({
                where: { id: parentId },
                select: { depth: true, postId: true, userId: true, parentId: true }
            });
            if (!parentComment) {
                return res.status(404).json({ error: 'Parent comment not found' });
            }
            if (parentComment.postId !== postId) {
                return res.status(400).json({ error: 'Parent comment does not belong to this post' });
            }
            // Special case: If parent is an author continuation (author's direct comment on own post),
            // keep replies at layer 0 to treat them as same level as the continuation
            const isParentAuthorContinuation = parentComment.userId === post.authorId &&
                parentComment.parentId === null &&
                parentComment.depth === 0;
            logger_1.logger.debug({
                parentComment: {
                    userId: parentComment.userId,
                    parentId: parentComment.parentId,
                    depth: parentComment.depth
                },
                post: {
                    authorId: post.authorId
                },
                isParentAuthorContinuation,
                currentUser: userId
            });
            if (isParentAuthorContinuation) {
                depth = 0; // Keep at layer 0 (same as continuation)
            }
            else {
                // Calculate depth - allow 3 visual layers (0=top-level, 1=nested, 2=flattened)
                // If parent is already at flattened level (depth 2+), keep replies at depth 2
                if (parentComment.depth >= 2) {
                    depth = 2; // Keep all flattened replies at depth 2
                }
                else {
                    depth = parentComment.depth + 1; // Normal increment for depth 0→1, 1→2
                }
            }
        }
        // Create comment and update post comment count
        const comment = await prisma_1.prisma.$transaction(async (tx) => {
            const newComment = await tx.comment.create({
                data: {
                    content: content.trim(),
                    userId,
                    postId,
                    parentId: parentId || null,
                    depth
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
        logger_1.logger.debug({ commentId: comment.id, depth: comment.depth, parentId: comment.parentId }, '✅ Comment created successfully');
        // Track comment creation activity
        try {
            await activityTracker_1.ActivityTracker.trackCommentCreated(userId, comment.id, content.trim(), postId, post.content);
        }
        catch (error) {
            logger_1.logger.error({ err: error, commentId: comment.id, postId: req.params.id, userId: req.user.id }, 'Failed to track comment creation activity');
            // Don't fail the comment creation if activity tracking fails
        }
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
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Add comment error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     tags: [Post]
 *     summary: Get comments for a post
 *     description: Retrieves all comments for a post in threaded tree structure with user reactions if authenticated
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Pagination limit (currently returns all comments)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Top-level comments with nested replies in tree structure
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.get('/:postId/comments', moderation_1.addContentWarnings, async (req, res) => {
    try {
        const { postId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Check if post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Get ALL comments for the post (flat query - no depth limits)
        const allComments = await prisma_1.prisma.comment.findMany({
            where: { postId },
            include: {
                user: {
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
                reactions: req.user ? {
                    where: {
                        userId: req.user.id // Include user's reactions if authenticated
                    }
                } : false
            },
            orderBy: { createdAt: 'asc' }
        });
        // Build comment tree structure from flat array
        const commentMap = new Map();
        const topLevelComments = [];
        // First pass: create map of all comments with reaction data
        allComments.forEach(comment => {
            // Extract user reactions from the reactions array (if user is authenticated)
            const userReaction = comment.reactions?.[0]; // There should be at most one reaction per user per comment
            // Create enhanced comment object with reaction data
            const enhancedComment = {
                ...comment,
                replies: [],
                // User's current reactions
                userSentiment: userReaction?.sentiment || null,
                userStance: userReaction?.stance || null,
                // Reaction counts are already in the comment model from schema
                // likesCount, dislikesCount, agreesCount, disagreesCount
            };
            // Remove the reactions array as it's no longer needed
            delete enhancedComment.reactions;
            commentMap.set(comment.id, enhancedComment);
        });
        // Second pass: build parent-child relationships
        allComments.forEach(comment => {
            const commentWithReplies = commentMap.get(comment.id);
            if (comment.parentId) {
                const parent = commentMap.get(comment.parentId);
                if (parent) {
                    parent.replies.push(commentWithReplies);
                }
            }
            else {
                topLevelComments.push(commentWithReplies);
            }
        });
        res.json({
            comments: topLevelComments,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: topLevelComments.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id }, 'Get comments error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     tags: [Post]
 *     summary: Get posts by a specific user
 *     description: Retrieves all posts created by a specific user with engagement data
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: Number of posts to skip for pagination
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const currentUserId = req.headers.authorization ?
            req.user?.id : null; // Try to get user ID if authenticated
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Verify user exists
        const userExists = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });
        if (!userExists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const posts = await prisma_1.prisma.post.findMany({
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
                // Photo model removed - photos relation no longer exists
                reactions: currentUserId ? {
                    where: { userId: currentUserId },
                    select: {
                        sentiment: true,
                        stance: true
                    }
                } : false,
                shares: currentUserId ? {
                    where: { userId: currentUserId },
                    select: {
                        shareType: true,
                        content: true
                    }
                } : false,
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
        const postsWithCounts = posts.map(post => {
            const userReaction = post.reactions && post.reactions[0] ? post.reactions[0] : null;
            const userShare = post.shares && post.shares[0] ? post.shares[0] : null;
            return {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                dislikesCount: post.dislikesCount || 0,
                agreesCount: post.agreesCount || 0,
                disagreesCount: post.disagreesCount || 0,
                userSentiment: userReaction?.sentiment || null,
                userStance: userReaction?.stance || null,
                isLiked: userReaction?.sentiment === 'LIKE',
                isShared: !!userShare,
                userShareType: userShare?.shareType || null,
                userShareContent: userShare?.content || null,
                reactions: undefined,
                shares: undefined,
                _count: undefined
            };
        });
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
        logger_1.logger.error({ err: error, userId: req.params.userId }, 'Get user posts error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/comments/summarize:
 *   post:
 *     tags: [Post]
 *     summary: Generate AI summary of post comments
 *     description: Uses Azure OpenAI to summarize comment threads when total character count exceeds 10,000. Returns null if below threshold.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Summary generated or threshold check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                   nullable: true
 *                   description: AI-generated summary (null if below threshold or AI unavailable)
 *                 totalCharacters:
 *                   type: integer
 *                 totalComments:
 *                   type: integer
 *                 belowThreshold:
 *                   type: boolean
 *                   description: True if below 10,000 character threshold
 *                 aiError:
 *                   type: string
 *                   description: Error message if AI summarization failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:postId/comments/summarize', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        // Get all comments for the post
        const comments = await prisma_1.prisma.comment.findMany({
            where: { postId },
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        if (comments.length === 0) {
            return res.json({
                summary: null,
                totalCharacters: 0,
                totalComments: 0
            });
        }
        // Calculate total character count
        const totalCharacters = comments.reduce((sum, comment) => sum + comment.content.length, 0);
        // Only summarize if over threshold (10,000 characters)
        if (totalCharacters < 10000) {
            return res.json({
                summary: null,
                totalCharacters,
                totalComments: comments.length,
                belowThreshold: true
            });
        }
        // Create content for AI summarization
        const commentContent = comments.map((comment, index) => `Comment ${index + 1} by ${comment.user.username}: ${comment.content}`).join('\n\n');
        try {
            const summary = await azureOpenAIService_1.azureOpenAI.generateCompletion(`Summarize this comment thread about a political post. Focus on the main points of discussion, key agreements/disagreements, and overall sentiment. Keep it concise but comprehensive:\n\n${commentContent}`, {
                temperature: 0.3,
                maxTokens: 300,
                systemMessage: "You are a helpful AI assistant that summarizes political discussion threads objectively, highlighting key points and diverse viewpoints without taking sides."
            });
            res.json({
                summary,
                totalCharacters,
                totalComments: comments.length,
                belowThreshold: false
            });
        }
        catch (aiError) {
            logger_1.logger.error({ err: aiError, postId: req.params.id }, 'AI summarization failed');
            res.json({
                summary: null,
                totalCharacters,
                totalComments: comments.length,
                aiError: 'AI summarization temporarily unavailable'
            });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id }, 'Comment summarization error');
        res.status(500).json({ error: 'Failed to summarize comments' });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/comments/{commentId}/permanent:
 *   delete:
 *     tags: [Post]
 *     summary: Permanently delete a comment (admin only)
 *     description: Permanently removes a comment from the database. Unlike soft delete, this is irreversible. All related reactions and notifications are automatically cascade-deleted by Prisma. Admin-only endpoint.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID containing the comment
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID to permanently delete
 *     responses:
 *       200:
 *         description: Comment permanently deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment permanently deleted successfully
 *                 deletedComment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     postId:
 *                       type: string
 *       400:
 *         description: Validation error - comment does not belong to specified post
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:postId/comments/:commentId/permanent', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user.id;
        // Verify comment exists and belongs to the specified post
        const comment = await prisma_1.prisma.comment.findUnique({
            where: { id: commentId },
            select: {
                id: true,
                postId: true,
                userId: true,
                content: true,
                parentId: true
            }
        });
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        if (comment.postId !== postId) {
            return res.status(400).json({
                error: 'Comment does not belong to the specified post'
            });
        }
        // Perform permanent deletion
        // Note: Prisma CASCADE will automatically delete:
        // - Related reactions (Reaction.commentId with onDelete: Cascade)
        // - Child comments (Comment.parentId self-referential relation)
        // - Related notifications (if commentId foreign key has CASCADE)
        const deletedComment = await prisma_1.prisma.comment.delete({
            where: { id: commentId }
        });
        logger_1.logger.info({
            adminUser: req.user.username,
            commentId,
            postId,
            userId: comment.userId,
            content: comment.content
        }, '[ADMIN] Comment permanently deleted');
        res.json({
            message: 'Comment permanently deleted successfully',
            deletedComment: {
                id: deletedComment.id,
                content: deletedComment.content,
                userId: deletedComment.userId,
                postId: deletedComment.postId
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, commentId: req.params.commentId, postId: req.params.id }, 'Permanent comment deletion error');
        res.status(500).json({ error: 'Failed to permanently delete comment' });
    }
});
// ========================================
// POST MANAGEMENT ENDPOINTS
// ========================================
/**
 * @swagger
 * /api/posts/{postId}:
 *   put:
 *     tags: [Post]
 *     summary: Edit a post
 *     description: Update post content with full history tracking. Only post author can edit. Tracks all edits with optional edit reasons.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Updated post content
 *               extendedContent:
 *                 type: string
 *                 description: Extended content for longer posts
 *               editReason:
 *                 type: string
 *                 description: Optional reason for edit (recommended)
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     post:
 *                       type: object
 *                     previousContent:
 *                       type: string
 *                     editReason:
 *                       type: string
 *                     version:
 *                       type: integer
 *       400:
 *         description: Validation error - missing content or exceeds length
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not post owner
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.put('/:postId', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        const { content, editReason, extendedContent } = req.body;
        // Validate required fields
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Post content is required'
            });
        }
        // Check content length limits
        if (content.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Post content must be 2000 characters or less'
            });
        }
        // Check permissions
        const canEdit = await postManagementService_1.PostManagementService.canEditPost(postId, userId);
        if (!canEdit) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own posts'
            });
        }
        // Perform the edit
        const result = await postManagementService_1.PostManagementService.editPost(postId, userId, {
            content: content.trim(),
            editReason: editReason?.trim(),
            extendedContent: extendedContent?.trim()
        });
        res.json({
            success: true,
            message: 'Post updated successfully',
            data: {
                post: result.post,
                previousContent: result.previousContent,
                editReason: result.editReason,
                version: result.version
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Post edit error');
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Post not found'
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only edit your own posts'
                });
            }
            if (error.message.includes('required')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to update post'
        });
    }
});
/**
 * @swagger
 * /api/posts/{postId}:
 *   delete:
 *     tags: [Post]
 *     summary: Delete a post
 *     description: Soft delete a post with archival. Only post author can delete. Post content is archived for recovery.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to delete
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteReason:
 *                 type: string
 *                 description: Optional reason for deletion
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not post owner
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:postId', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        const { deleteReason } = req.body;
        // Check permissions
        const canDelete = await postManagementService_1.PostManagementService.canDeletePost(postId, userId);
        if (!canDelete) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own posts'
            });
        }
        // Perform the deletion
        const result = await postManagementService_1.PostManagementService.deletePost(postId, userId, {
            deleteReason: deleteReason?.trim()
        });
        res.json({
            success: true,
            message: 'Post deleted successfully',
            data: {
                postId,
                deleteReason: result.deleteReason,
                softDelete: result.softDelete,
                archiveCreated: true
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Post delete error');
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Post not found'
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only delete your own posts'
                });
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to delete post'
        });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/history:
 *   get:
 *     tags: [Post]
 *     summary: Get post edit history
 *     description: Retrieve complete edit history for a post. Only post author can view history.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Array of edit history records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not post owner
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.get('/:postId/history', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        const history = await postManagementService_1.PostManagementService.getPostHistory(postId, userId);
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id }, 'Post history error');
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Post not found'
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view history of your own posts'
                });
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve post history'
        });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/archive:
 *   get:
 *     tags: [Post]
 *     summary: Get archived post content
 *     description: Retrieve archived content for a deleted post. Only post author can view archives.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Deleted post ID
 *     responses:
 *       200:
 *         description: Archive retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Archived post content
 *       400:
 *         description: Post is not deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not post owner
 *       404:
 *         description: Post or archive not found
 *       500:
 *         description: Internal server error
 */
router.get('/:postId/archive', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        const archive = await postManagementService_1.PostManagementService.getArchivedPost(postId, userId);
        res.json({
            success: true,
            data: archive
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Post archive error');
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Post not found'
                });
            }
            if (error.message.includes('not deleted')) {
                return res.status(400).json({
                    success: false,
                    error: 'Post is not deleted'
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view archives of your own posts'
                });
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve post archive'
        });
    }
});
/**
 * @swagger
 * /api/posts/config/management:
 *   put:
 *     tags: [Admin]
 *     summary: Update post management configuration (admin only)
 *     description: Configure post management service settings including edit history retention and soft delete behavior
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxEditHistoryVersions:
 *                 type: integer
 *                 description: Maximum number of edit history versions to retain
 *               enableSoftDelete:
 *                 type: boolean
 *                 description: Enable soft delete (mark as deleted vs permanent deletion)
 *               requireEditReasons:
 *                 type: boolean
 *                 description: Require users to provide edit reasons
 *               archiveCommentsOnDelete:
 *                 type: boolean
 *                 description: Archive comments when post is deleted
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.put('/config/management', auth_1.requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { isAdmin: true }
        });
        if (!user?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { maxEditHistoryVersions, enableSoftDelete, requireEditReasons, archiveCommentsOnDelete } = req.body;
        // Update configuration
        postManagementService_1.PostManagementService.updateConfig({
            maxEditHistoryVersions,
            enableSoftDelete,
            requireEditReasons,
            archiveCommentsOnDelete
        });
        const newConfig = postManagementService_1.PostManagementService.getConfig();
        res.json({
            success: true,
            message: 'Post management configuration updated',
            data: newConfig
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Config update error');
        res.status(500).json({
            success: false,
            error: 'Failed to update configuration'
        });
    }
});
/**
 * @swagger
 * /api/posts/config/management:
 *   get:
 *     tags: [Admin]
 *     summary: Get post management configuration (admin only)
 *     description: Retrieve current post management service configuration
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/config/management', auth_1.requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { isAdmin: true }
        });
        if (!user?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const config = postManagementService_1.PostManagementService.getConfig();
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, userId: req.user.id }, 'Config retrieval error');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve configuration'
        });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/trending-comments:
 *   get:
 *     tags: [Post]
 *     summary: Get trending comments for a post
 *     description: Uses EngagementScoringService to identify trending comments based on engagement metrics, time decay, and author reputation
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           minimum: 1
 *           maximum: 20
 *         description: Maximum number of trending comments to return
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *           default: 1.0
 *           minimum: 0
 *         description: Minimum engagement score threshold
 *       - in: query
 *         name: timeWindow
 *         schema:
 *           type: integer
 *           default: 24
 *           minimum: 1
 *           maximum: 168
 *         description: Time window in hours for trending calculation
 *     responses:
 *       200:
 *         description: Trending comments retrieved successfully
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
 *                     trendingComments:
 *                       type: array
 *                       items:
 *                         type: object
 *                     stats:
 *                       type: object
 *                     postId:
 *                       type: string
 *                     algorithm:
 *                       type: string
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.get('/:postId/trending-comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const { limit = 5, minScore = 1.0, timeWindow = 24 } = req.query;
        // Validate query parameters
        const limitNum = Math.max(1, Math.min(20, parseInt(limit.toString()) || 5));
        const minScoreNum = Math.max(0, parseFloat(minScore.toString()) || 1.0);
        const timeWindowNum = Math.max(1, Math.min(168, parseInt(timeWindow.toString()) || 24)); // Max 1 week
        // Check if post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        // Get all comments for the post with engagement data
        const comments = await prisma_1.prisma.comment.findMany({
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
                },
                _count: {
                    select: {
                        replies: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Transform comments for trending analysis
        const commentsForAnalysis = comments.map(comment => ({
            id: comment.id,
            likesCount: comment.likesCount,
            dislikesCount: comment.dislikesCount,
            agreesCount: comment.agreesCount,
            disagreesCount: comment.disagreesCount,
            replyCount: comment._count.replies,
            createdAt: comment.createdAt,
            content: comment.content,
            author: {
                reputation: 70 // Default reputation for simplicity
            }
        }));
        // Find trending comments using EngagementScoringService
        const trendingResult = engagementScoringService_1.EngagementScoringService.findTrendingComments(commentsForAnalysis, {
            limit: limitNum,
            minScore: minScoreNum,
            timeWindow: timeWindowNum
        });
        // Enrich trending comments with full author data
        const enrichedTrendingComments = trendingResult.trendingComments.map(trendingComment => {
            const originalComment = comments.find(c => c.id === trendingComment.id);
            return {
                id: trendingComment.id,
                content: trendingComment.content,
                createdAt: trendingComment.createdAt,
                likesCount: trendingComment.likesCount,
                dislikesCount: trendingComment.dislikesCount,
                agreesCount: trendingComment.agreesCount,
                disagreesCount: trendingComment.disagreesCount,
                replyCount: trendingComment.replyCount,
                author: originalComment?.user,
                engagementScore: trendingComment.engagementData.score,
                engagementBreakdown: trendingComment.engagementData.breakdown
            };
        });
        res.json({
            success: true,
            data: {
                trendingComments: enrichedTrendingComments,
                stats: trendingResult.stats,
                postId,
                algorithm: 'comment-engagement-scoring'
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Trending comments error');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve trending comments'
        });
    }
});
// ==================== SAVED POSTS ENDPOINTS ====================
/**
 * @swagger
 * /api/posts/{postId}/save:
 *   post:
 *     tags: [Post]
 *     summary: Save a post for later
 *     description: Add a post to user's saved posts collection. Idempotent - updates timestamp if already saved.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to save
 *     responses:
 *       200:
 *         description: Post saved successfully
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
 *                     saved:
 *                       type: boolean
 *                     savedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/:postId/save', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        // Verify post exists
        const post = await prisma_1.prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        // Create or update saved post (upsert for idempotency)
        const savedPost = await prisma_1.prisma.savedPost.upsert({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            },
            update: {
                savedAt: new Date() // Update timestamp if already saved
            },
            create: {
                userId,
                postId
            }
        });
        res.json({
            success: true,
            data: {
                saved: true,
                savedAt: savedPost.savedAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Save post error');
        res.status(500).json({
            success: false,
            error: 'Failed to save post'
        });
    }
});
/**
 * @swagger
 * /api/posts/{postId}/save:
 *   delete:
 *     tags: [Post]
 *     summary: Remove a post from saved posts
 *     description: Remove a post from user's saved collection. Idempotent - no error if post wasn't saved.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to unsave
 *     responses:
 *       200:
 *         description: Post unsaved successfully
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
 *                     saved:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/:postId/save', auth_1.requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        // Delete saved post (idempotent - no error if doesn't exist)
        await prisma_1.prisma.savedPost.deleteMany({
            where: {
                userId,
                postId
            }
        });
        res.json({
            success: true,
            data: {
                saved: false
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Unsave post error');
        res.status(500).json({
            success: false,
            error: 'Failed to unsave post'
        });
    }
});
/**
 * @swagger
 * /api/posts/saved/check:
 *   post:
 *     tags: [Post]
 *     summary: Batch check saved status for multiple posts
 *     description: Check which posts from a list are saved by the current user (useful for UI state management)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postIds
 *             properties:
 *               postIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of post IDs to check
 *     responses:
 *       200:
 *         description: Saved status checked successfully
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
 *                     saved:
 *                       type: object
 *                       additionalProperties:
 *                         type: boolean
 *                       description: Map of postId to boolean saved status
 *       400:
 *         description: Validation error - postIds must be an array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/saved/check', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { postIds } = req.body;
        if (!Array.isArray(postIds)) {
            return res.status(400).json({
                success: false,
                error: 'postIds must be an array'
            });
        }
        // Get all saved posts for this user from the provided list
        const savedPosts = await prisma_1.prisma.savedPost.findMany({
            where: {
                userId,
                postId: {
                    in: postIds
                }
            },
            select: {
                postId: true
            }
        });
        // Build result object
        const saved = {};
        postIds.forEach(postId => {
            saved[postId] = savedPosts.some(sp => sp.postId === postId);
        });
        res.json({
            success: true,
            data: {
                saved
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, postId: req.params.id, userId: req.user.id }, 'Check saved status error');
        res.status(500).json({
            success: false,
            error: 'Failed to check saved status'
        });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map