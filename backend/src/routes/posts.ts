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

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

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

        if (content.length > 500) {
            return res.status(400).json({ error: 'Post content must be 500 characters or less' });
        }

        // Generate embedding for AI topic clustering using Azure OpenAI
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

        const post = await prisma.post.create({
            data: {
                content: content.trim(),
                imageUrl,
                authorId: userId,
                embedding,
                authorReputation: userReputation.current,
                tags: requestedTags,
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
    } catch (error) {
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

            res.json({ message: 'Post liked successfully', liked: true });
        }
    } catch (error) {
        console.error('Like/unlike post error:', error);
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
            select: { id: true, authorId: true }
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
                console.log('✅ Keeping reply to author continuation at depth 0');
            } else {
                // Calculate depth - allow 3 visual layers (0=top-level, 1=nested, 2=flattened)
                // Frontend displays depth >= 2 as flattened, so cap at depth 2
                depth = Math.min(parentComment.depth + 1, 2);
                console.log(`📊 Normal threading: parent depth ${parentComment.depth} → new depth ${depth}`);
            }
        }

        // Create comment and update post comment count
        console.log(`🏗️ Creating comment with depth: ${depth}, parentId: ${parentId || 'null'}`);
        
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

        // Get all comments for the post with nested structure
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
                replies: {
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
                        replies: {
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
                            orderBy: { createdAt: 'asc' }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Filter to only top-level comments (parentId is null)
        const topLevelComments = comments.filter(comment => comment.parentId === null);

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
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;