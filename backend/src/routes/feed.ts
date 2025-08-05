import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get news feed (posts from followed users)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0 } = req.query;

    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());

    // Get posts from users that the current user follows
    const feedPosts = await prisma.post.findMany({
      where: {
        author: {
          followers: {
            some: {
              followerId: userId
            }
          }
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
        likes: {
          where: { userId },
          select: { id: true }
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

    const formattedPosts = feedPosts.map(post => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: feedPosts.length
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending posts (most liked in last 24 hours)
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());

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
        { likesCount: 'desc' },
        { commentsCount: 'desc' },
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
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;