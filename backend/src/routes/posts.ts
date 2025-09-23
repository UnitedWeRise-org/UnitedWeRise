import { prisma } from '../lib/prisma';
import { createNotification } from './notifications';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validatePost, validateComment } from '../middleware/validation';
import { postLimiter } from '../middleware/rateLimiting';
import { checkUserSuspension, moderateContent, contentFilter, addContentWarnings } from '../middleware/moderation';
import { azureOpenAI } from '../services/azureOpenAIService';
import { feedbackAnalysisService } from '../services/feedbackAnalysisService';
import { reputationService } from '../services/reputationService';
import { ActivityTracker } from '../services/activityTracker';
import { PostGeographicService } from '../services/postGeographicService';
import { PostManagementService } from '../services/postManagementService';
import { EngagementScoringService } from '../services/engagementScoringService';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

// Get posts with geographic data for map display
router.get('/map-data', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { scope = 'national', count = 9 } = req.query;
        const userId = req.user!.id;

        // Get user's H3 index for jurisdiction filtering
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { h3Index: true }
        });

        const posts = await PostGeographicService.getPostsForMap(
            scope as 'national' | 'state' | 'local',
            user?.h3Index || undefined,
            parseInt(count as string)
        );

        if (typeof console !== 'undefined') {
            console.log(`Map data request: ${posts.length} posts found for ${scope} scope`);
        }

        res.json({
            success: true,
            data: posts,
            scope,
            hasRealPosts: posts.length > 0,
            fallbackNeeded: posts.length < 2
        });

    } catch (error) {
        console.error('Error fetching map data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch map data',
            fallbackNeeded: true
        });
    }
});

// Create a new post
router.post('/', requireAuth, checkUserSuspension, postLimiter, contentFilter, validatePost, moderateContent('POST'), async (req: AuthRequest, res) => {
    try {
        const { content, imageUrl, mediaId, tags } = req.body;
        const userId = req.user!.id;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Post content is required' });
        }

        // Validate media attachment if provided
        let mediaPhoto = null;
        if (mediaId) {
            mediaPhoto = await prisma.photo.findUnique({
                where: { id: mediaId }
            });

            if (!mediaPhoto || mediaPhoto.userId !== userId || !mediaPhoto.isActive) {
                return res.status(400).json({ error: 'Invalid media attachment' });
            }

            if (mediaPhoto.photoType !== 'POST_MEDIA') {
                return res.status(400).json({ error: 'Only POST_MEDIA type photos can be attached to posts' });
            }
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
        let embedding: number[] = [];
        try {
            const embeddingResult = await azureOpenAI.generateEmbedding(content.trim());
            embedding = embeddingResult.embedding;
        } catch (error) {
            console.warn('Failed to generate embedding for post:', error);
            // Continue without embedding rather than failing the post creation
        }

        // Reputation-based content analysis
        let reputationImpact = { penalties: [], totalPenalty: 0 };
        try {
            // This will analyze content and apply penalties automatically
            reputationImpact = await reputationService.analyzeAndApplyPenalties(
                content.trim(),
                userId,
                'temp-post-id' // Will update with actual post ID after creation
            );
        } catch (error) {
            console.warn('Failed to analyze post for reputation impact:', error);
        }

        // Quick synchronous feedback check (instant, non-blocking)
        const quickCheck = feedbackAnalysisService.performQuickKeywordCheck(content.trim());
        const feedbackData = quickCheck.isPotentialFeedback ? {
            containsFeedback: null, // Will be determined asynchronously
            feedbackStatus: 'pending_analysis'
        } : {
            containsFeedback: false // Definitely not feedback based on quick check
        };

        // Get user's current reputation for post attribution
        const userReputation = await reputationService.getUserReputation(userId);

        // Validate and set tags with proper defaults and permissions
        const requestedTags = tags || ["Public Post"];
        
        // Validate permissions for special tags by fetching full user record
        const fullUser = await prisma.user.findUnique({
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
        const geographicData = await PostGeographicService.generatePostGeographicData(userId);

        const post = await prisma.post.create({
            data: {
                content: mainContent,
                extendedContent,
                imageUrl,
                authorId: userId,
                embedding,
                authorReputation: userReputation.current,
                tags: requestedTags,
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
                        comments: true
                    }
                }
            }
        });

        // Link media to post if provided
        if (mediaId && mediaPhoto) {
            try {
                await prisma.photo.update({
                    where: { id: mediaId },
                    data: { postId: post.id }
                });
                console.log(`📷 Media linked to post: ${mediaId} → ${post.id}`);
            } catch (error) {
                console.error('Failed to link media to post:', error);
                // Non-critical error - don't fail the post creation
            }
        }

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
            } catch (error) {
                console.warn('Failed to update reputation event with post ID:', error);
            }
        }

        // Track post creation activity
        try {
            await ActivityTracker.trackPostCreated(userId, post.id, content.trim());
        } catch (error) {
            console.error('Failed to track post creation activity:', error);
            // Don't fail the post creation if activity tracking fails
        }

        // Async feedback analysis - runs in background without blocking response
        if (quickCheck.isPotentialFeedback) {
            // Fire and forget - don't await
            feedbackAnalysisService.analyzePostAsync(post.id, content.trim(), userId)
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
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get user's own posts (personal feed)
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
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
    } catch (error) {
        console.error('Get personal posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single post
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.headers.authorization ?
            (req as any).user?.id : null; // Try to get user ID if authenticated

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
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Like/Unlike a post
router.post('/:postId/like', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user!.id;

        // Check if post exists
        const post = await prisma.post.findUnique({
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

            // Track unlike activity
            try {
                await ActivityTracker.trackLikeRemoved(userId, postId, post.content);
            } catch (error) {
                console.error('Failed to track unlike activity:', error);
                // Don't fail the unlike action if activity tracking fails
            }

            res.json({ message: 'Post unliked successfully', liked: false });
        } else {
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
                await createNotification(
                    'LIKE',
                    userId,
                    post.authorId,
                    `${req.user!.username} liked your post`,
                    postId
                );
            }

            // Check if this qualifies as a quality post for reputation reward
            const totalLikes = await prisma.like.count({
                where: { postId }
            });

            // Award reputation for quality posts (5+ likes)
            if (totalLikes >= 5) {
                try {
                    await reputationService.awardReputation(
                        post.authorId,
                        'quality_post',
                        postId
                    );
                } catch (error) {
                    console.warn('Failed to award reputation for quality post:', error);
                }
            }

            // Track like activity
            try {
                await ActivityTracker.trackLikeAdded(userId, postId, post.content);
            } catch (error) {
                console.error('Failed to track like activity:', error);
                // Don't fail the like action if activity tracking fails
            }

            res.json({ message: 'Post liked successfully', liked: true });
        }
    } catch (error) {
        console.error('Like/unlike post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Enhanced reaction system (sentiment: LIKE/DISLIKE, stance: AGREE/DISAGREE)
router.post('/:postId/reaction', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const { reactionType, reactionValue } = req.body;
        const userId = req.user!.id;

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
        const post = await prisma.post.findUnique({
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
        const existingReaction = await prisma.reaction.findUnique({
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
                await prisma.$transaction([
                    prisma.reaction.delete({
                        where: {
                            userId_postId: {
                                userId,
                                postId
                            }
                        }
                    }),
                    // Update post counts based on what was removed
                    prisma.post.update({
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
                    await ActivityTracker.trackReactionChanged(
                        userId,
                        postId,
                        post.content,
                        reactionType,
                        existingReaction[reactionType as keyof typeof existingReaction] as string || '',
                        null
                    );
                } catch (error) {
                    console.error('Failed to track reaction removal:', error);
                }
            }

            res.json({ message: 'Reaction removed successfully' });
        } else {
            // Add or update reaction
            const reactionData = {
                userId,
                postId,
                ...(reactionType === 'sentiment' ? { sentiment: reactionValue } : {}),
                ...(reactionType === 'stance' ? { stance: reactionValue } : {})
            };

            if (existingReaction) {
                // Update existing reaction
                const oldValue = existingReaction[reactionType as keyof typeof existingReaction] as string;

                await prisma.$transaction([
                    prisma.reaction.update({
                        where: {
                            userId_postId: {
                                userId,
                                postId
                            }
                        },
                        data: reactionData
                    }),
                    // Update post counts - decrement old, increment new
                    prisma.post.update({
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
                    await ActivityTracker.trackReactionChanged(
                        userId,
                        postId,
                        post.content,
                        reactionType,
                        oldValue,
                        reactionValue
                    );
                } catch (error) {
                    console.error('Failed to track reaction change:', error);
                }
            } else {
                // Create new reaction
                await prisma.$transaction([
                    prisma.reaction.create({
                        data: reactionData
                    }),
                    // Update post counts
                    prisma.post.update({
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
                        await createNotification(
                            'REACTION',
                            userId,
                            post.authorId,
                            `${req.user!.username} reacted to your post`,
                            postId
                        );
                    } catch (error) {
                        console.warn('Failed to create reaction notification:', error);
                    }
                }

                // Track new reaction
                try {
                    await ActivityTracker.trackReactionChanged(
                        userId,
                        postId,
                        post.content,
                        reactionType,
                        null,
                        reactionValue
                    );
                } catch (error) {
                    console.error('Failed to track new reaction:', error);
                }
            }

            res.json({ message: 'Reaction updated successfully', reactionType, reactionValue });
        }
    } catch (error) {
        console.error('Enhanced reaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Share a post (simple share or quote share)
router.post('/:postId/share', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const { shareType, content } = req.body;
        const userId = req.user!.id;

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
        const post = await prisma.post.findUnique({
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
        const existingShare = await prisma.share.findUnique({
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
        await prisma.$transaction([
            prisma.share.create({
                data: {
                    userId,
                    postId,
                    shareType,
                    content: shareType === 'QUOTE' ? content.trim() : null
                }
            }),
            prisma.post.update({
                where: { id: postId },
                data: { sharesCount: { increment: 1 } }
            })
        ]);

        // Create notification if not sharing own post
        if (post.authorId !== userId) {
            try {
                await createNotification(
                    'REACTION', // Using REACTION type for shares for now
                    userId,
                    post.authorId,
                    shareType === 'QUOTE'
                        ? `${req.user!.username} shared your post with a quote`
                        : `${req.user!.username} shared your post`,
                    postId
                );
            } catch (error) {
                console.warn('Failed to create share notification:', error);
            }
        }

        // Track share activity
        try {
            await ActivityTracker.trackShareAdded(
                userId,
                postId,
                post.content.substring(0, 100),
                shareType,
                content?.substring(0, 100)
            );
        } catch (error) {
            console.error('Failed to track share activity:', error);
        }

        res.json({
            message: shareType === 'QUOTE' ? 'Post shared with quote successfully' : 'Post shared successfully',
            shareType,
            hasContent: !!content
        });
    } catch (error) {
        console.error('Share post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// React to a comment (sentiment: LIKE/DISLIKE, stance: AGREE/DISAGREE)
router.post('/comments/:commentId/reaction', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { commentId } = req.params;
        const { reactionType, reactionValue } = req.body;
        const userId = req.user!.id;

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
        const comment = await prisma.comment.findUnique({
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
        const existingReaction = await prisma.reaction.findUnique({
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
                await prisma.$transaction([
                    prisma.reaction.delete({
                        where: {
                            userId_commentId: {
                                userId,
                                commentId
                            }
                        }
                    }),
                    // Update comment counts based on what was removed
                    prisma.comment.update({
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
                    await ActivityTracker.trackReactionChanged(
                        userId,
                        comment.postId,
                        comment.content,
                        reactionType,
                        existingReaction[reactionType as keyof typeof existingReaction] as string || '',
                        null
                    );
                } catch (error) {
                    console.error('Failed to track comment reaction removal:', error);
                }
            }

            res.json({ message: 'Comment reaction removed successfully' });
        } else {
            // Add or update reaction
            const reactionData = {
                userId,
                commentId,
                ...(reactionType === 'sentiment' ? { sentiment: reactionValue } : {}),
                ...(reactionType === 'stance' ? { stance: reactionValue } : {})
            };

            if (existingReaction) {
                // Update existing reaction
                const oldValue = existingReaction[reactionType as keyof typeof existingReaction] as string;

                await prisma.$transaction([
                    prisma.reaction.update({
                        where: {
                            userId_commentId: {
                                userId,
                                commentId
                            }
                        },
                        data: reactionData
                    }),
                    // Update comment counts - decrement old, increment new
                    prisma.comment.update({
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
                    await ActivityTracker.trackReactionChanged(
                        userId,
                        comment.postId,
                        comment.content,
                        reactionType,
                        oldValue,
                        reactionValue
                    );
                } catch (error) {
                    console.error('Failed to track comment reaction change:', error);
                }
            } else {
                // Create new reaction
                await prisma.$transaction([
                    prisma.reaction.create({
                        data: reactionData
                    }),
                    // Update comment counts
                    prisma.comment.update({
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
                        await createNotification(
                            'REACTION',
                            userId,
                            comment.userId,
                            `${req.user!.username} reacted to your comment`,
                            comment.postId,
                            commentId
                        );
                    } catch (error) {
                        console.warn('Failed to create comment reaction notification:', error);
                    }
                }

                // Track new reaction
                try {
                    await ActivityTracker.trackReactionChanged(
                        userId,
                        comment.postId,
                        comment.content,
                        reactionType,
                        null,
                        reactionValue
                    );
                } catch (error) {
                    console.error('Failed to track new comment reaction:', error);
                }
            }

            res.json({ message: 'Comment reaction updated successfully', reactionType, reactionValue });
        }
    } catch (error) {
        console.error('Comment reaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add comment to post
router.post('/:postId/comments', requireAuth, checkUserSuspension, contentFilter, validateComment, moderateContent('COMMENT'), async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const { content, parentId } = req.body;
        const userId = req.user!.id;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        // Check if post exists
        const post = await prisma.post.findUnique({
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
            const parentComment = await prisma.comment.findUnique({
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

            console.log('🔍 Threading Debug:', {
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
            } else {
                // Calculate depth - allow 3 visual layers (0=top-level, 1=nested, 2=flattened)
                // If parent is already at flattened level (depth 2+), keep replies at depth 2
                if (parentComment.depth >= 2) {
                    depth = 2; // Keep all flattened replies at depth 2
                } else {
                    depth = parentComment.depth + 1; // Normal increment for depth 0→1, 1→2
                }
            }
        }

        // Create comment and update post comment count
        
        const comment = await prisma.$transaction(async (tx) => {
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

        console.log(`✅ Comment created successfully: ID=${comment.id}, depth=${comment.depth}, parentId=${comment.parentId}`);

        // Track comment creation activity
        try {
            await ActivityTracker.trackCommentCreated(userId, comment.id, content.trim(), postId, post.content);
        } catch (error) {
            console.error('Failed to track comment creation activity:', error);
            // Don't fail the comment creation if activity tracking fails
        }

        // Create notification if not commenting on own post
        if (post.authorId !== userId) {
            await createNotification(
                'COMMENT',
                userId,
                post.authorId,
                `${req.user!.username} commented on your post`,
                postId,
                comment.id
            );
        }

        res.status(201).json({
            message: 'Comment added successfully',
            comment
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get comments for a post
router.get('/:postId/comments', addContentWarnings, async (req, res) => {
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

        // Get ALL comments for the post (flat query - no depth limits)
        const allComments = await prisma.comment.findMany({
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
                reactions: (req as any).user ? {
                    where: {
                        userId: (req as any).user.id // Include user's reactions if authenticated
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
            } else {
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
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get posts by a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const currentUserId = req.headers.authorization ?
            (req as any).user?.id : null; // Try to get user ID if authenticated

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
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Comment summarization endpoint for Post Focus View
router.post('/:postId/comments/summarize', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        
        // Get all comments for the post
        const comments = await prisma.comment.findMany({
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
        const commentContent = comments.map((comment, index) => 
            `Comment ${index + 1} by ${comment.user.username}: ${comment.content}`
        ).join('\n\n');

        try {
            const summary = await azureOpenAI.generateCompletion(
                `Summarize this comment thread about a political post. Focus on the main points of discussion, key agreements/disagreements, and overall sentiment. Keep it concise but comprehensive:\n\n${commentContent}`,
                {
                    temperature: 0.3,
                    maxTokens: 300,
                    systemMessage: "You are a helpful AI assistant that summarizes political discussion threads objectively, highlighting key points and diverse viewpoints without taking sides."
                }
            );

            res.json({
                summary,
                totalCharacters,
                totalComments: comments.length,
                belowThreshold: false
            });

        } catch (aiError) {
            console.error('AI summarization failed:', aiError);
            res.json({ 
                summary: null,
                totalCharacters,
                totalComments: comments.length,
                aiError: 'AI summarization temporarily unavailable'
            });
        }

    } catch (error) {
        console.error('Comment summarization error:', error);
        res.status(500).json({ error: 'Failed to summarize comments' });
    }
});

// ========================================
// POST MANAGEMENT ENDPOINTS
// ========================================

/**
 * Edit a post with full history tracking
 */
router.put('/:postId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user!.id;
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
        const canEdit = await PostManagementService.canEditPost(postId, userId);
        if (!canEdit) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own posts'
            });
        }

        // Perform the edit
        const result = await PostManagementService.editPost(postId, userId, {
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

    } catch (error) {
        console.error('Post edit error:', error);

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
 * Delete a post with archival
 */
router.delete('/:postId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user!.id;
        const { deleteReason } = req.body;

        // Check permissions
        const canDelete = await PostManagementService.canDeletePost(postId, userId);
        if (!canDelete) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own posts'
            });
        }

        // Perform the deletion
        const result = await PostManagementService.deletePost(postId, userId, {
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

    } catch (error) {
        console.error('Post delete error:', error);

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
 * Get post edit history
 */
router.get('/:postId/history', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user!.id;

        const history = await PostManagementService.getPostHistory(postId, userId);

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Post history error:', error);

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
 * Get archived post content (for deleted posts)
 */
router.get('/:postId/archive', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user!.id;

        const archive = await PostManagementService.getArchivedPost(postId, userId);

        res.json({
            success: true,
            data: archive
        });

    } catch (error) {
        console.error('Post archive error:', error);

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
 * Update Post Management Service configuration (admin only)
 */
router.put('/config/management', requireAuth, async (req: AuthRequest, res) => {
    try {
        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { isAdmin: true }
        });

        if (!user?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const {
            maxEditHistoryVersions,
            enableSoftDelete,
            requireEditReasons,
            archiveCommentsOnDelete
        } = req.body;

        // Update configuration
        PostManagementService.updateConfig({
            maxEditHistoryVersions,
            enableSoftDelete,
            requireEditReasons,
            archiveCommentsOnDelete
        });

        const newConfig = PostManagementService.getConfig();

        res.json({
            success: true,
            message: 'Post management configuration updated',
            data: newConfig
        });

    } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update configuration'
        });
    }
});

/**
 * Get current Post Management Service configuration (admin only)
 */
router.get('/config/management', requireAuth, async (req: AuthRequest, res) => {
    try {
        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { isAdmin: true }
        });

        if (!user?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const config = PostManagementService.getConfig();

        res.json({
            success: true,
            data: config
        });

    } catch (error) {
        console.error('Config retrieval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve configuration'
        });
    }
});

// Get trending comments for a post
router.get('/:postId/trending-comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const { limit = 5, minScore = 1.0, timeWindow = 24 } = req.query;

        // Validate query parameters
        const limitNum = Math.max(1, Math.min(20, parseInt(limit.toString()) || 5));
        const minScoreNum = Math.max(0, parseFloat(minScore.toString()) || 1.0);
        const timeWindowNum = Math.max(1, Math.min(168, parseInt(timeWindow.toString()) || 24)); // Max 1 week

        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Get all comments for the post with engagement data
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
            replyCount: (comment as any)._count.replies,
            createdAt: comment.createdAt,
            content: comment.content,
            author: {
                reputation: 70 // Default reputation for simplicity
            }
        }));

        // Find trending comments using EngagementScoringService
        const trendingResult = EngagementScoringService.findTrendingComments(
            commentsForAnalysis,
            {
                limit: limitNum,
                minScore: minScoreNum,
                timeWindow: timeWindowNum
            }
        );

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
                author: (originalComment as any)?.user,
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

    } catch (error) {
        console.error('Trending comments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve trending comments'
        });
    }
});

export default router;