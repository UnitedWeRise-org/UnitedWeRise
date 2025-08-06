import { createNotification } from './notifications';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validatePost, validateComment } from '../middleware/validation';
import { postLimiter } from '../middleware/rateLimiting';
import { checkUserSuspension, moderateContent, contentFilter, addContentWarnings } from '../middleware/moderation';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new post
router.post('/', requireAuth, checkUserSuspension, postLimiter, contentFilter, validatePost, moderateContent('POST'), async (req: AuthRequest, res) => {
    try {
        const { content, imageUrl } = req.body;
        const userId = req.user!.id;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Post content is required' });
        }

        if (content.length > 500) {
            return res.status(400).json({ error: 'Post content must be 500 characters or less' });
        }

        const post = await prisma.post.create({
            data: {
                content: content.trim(),
                imageUrl,
                authorId: userId,
                embedding: [] // Empty for now, will populate with AI later
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

        res.status(201).json({
            message: 'Post created successfully',
            post: {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                _count: undefined
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
        const { content } = req.body;
        const userId = req.user!.id;

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