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

        const post = await prisma.post.create({
            data: {
                content: mainContent,
                extendedContent,
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
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Build comment tree structure from flat array
        const commentMap = new Map();
        const topLevelComments = [];

        // First pass: create map of all comments
        allComments.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
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

export default router;