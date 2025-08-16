import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ProbabilityFeedService } from '../services/probabilityFeedService';

const router = express.Router();
const prisma = new PrismaClient();

// Get personalized feed using probability cloud algorithm
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;
    
    // Parse custom weights if provided (for A/B testing or user preferences)
    const customWeights = req.query.weights ? JSON.parse(req.query.weights as string) : undefined;

    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());

    // Generate larger feed and slice for pagination
    // We need to fetch more than just limit+offset to ensure randomization
    const fetchLimit = limitNum + offsetNum + 50; // Get extra posts for proper randomization
    const feedResult = await ProbabilityFeedService.generateFeed(
      userId, 
      fetchLimit,
      customWeights
    );

    // Apply offset and limit to the generated feed
    const paginatedPosts = feedResult.posts.slice(offsetNum, offsetNum + limitNum);

    // Add user's like status to each post (use paginated posts)
    const postIds = paginatedPosts.map(p => p.id);
    const userLikes = await prisma.like.findMany({
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
  } catch (error) {
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
    const totalPosts = await prisma.post.count();
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