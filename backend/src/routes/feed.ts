import { prisma } from '../lib/prisma';
import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ProbabilityFeedService } from '../services/probabilityFeedService';
import { EngagementScoringService } from '../services/engagementScoringService';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

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

    // DIAGNOSTIC: Log photo data being sent to frontend
    console.log(`📸 FEED API - Sending ${postsWithLikeStatus.length} posts`);
    const postsWithPhotos = postsWithLikeStatus.filter(p => p.photos && p.photos.length > 0);
    console.log(`📸 FEED API - ${postsWithPhotos.length} posts have photos`);
    if (postsWithPhotos.length > 0) {
      console.log(`📸 FEED API - Sample post with photos:`, {
        postId: postsWithPhotos[0].id,
        photoCount: postsWithPhotos[0].photos.length,
        photoUrls: postsWithPhotos[0].photos.map(p => p.url)
      });
    }

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
        photos: true,
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
      const commentEngagement = EngagementScoringService.calculateCommentEngagement(post.comments || []);

      const engagementMetrics = {
        likesCount: post.likesCount || 0,
        dislikesCount: post.dislikesCount || 0,
        agreesCount: post.agreesCount || 0,
        disagreesCount: post.disagreesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        viewsCount: 0, // Views not implemented yet
        communityNotesCount: 0,
        reportsCount: 0,
        commentEngagement
      };

      const engagementResult = EngagementScoringService.calculateScore(
        engagementMetrics,
        new Date(post.createdAt),
        70 // Default reputation
      );

      return {
        ...post,
        engagementScore: engagementResult.score
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
  } catch (error) {
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

export default router;