import { prisma } from '../lib/prisma';
import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ProbabilityFeedService } from '../services/probabilityFeedService';
import { EngagementScoringService } from '../services/engagementScoringService';
import { SlotRollService } from '../services/slotRollService';
import { logger } from '../services/logger';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

/**
 * Helper function to filter posts by audience based on friendship status
 * @param posts Array of posts with audience field
 * @param friendIds Set of friend user IDs
 * @returns Filtered posts respecting audience settings
 */
function filterPostsByAudience<T extends { authorId: string; audience?: string | null }>(
  posts: T[],
  friendIds: Set<string>
): T[] {
  return posts.filter(post => {
    const audience = post.audience || 'PUBLIC';

    // PUBLIC posts are visible to everyone
    if (audience === 'PUBLIC') return true;

    // FRIENDS_ONLY posts only visible to friends of the author
    if (audience === 'FRIENDS_ONLY') {
      return friendIds.has(post.authorId);
    }

    // NON_FRIENDS posts only visible to non-friends
    if (audience === 'NON_FRIENDS') {
      return !friendIds.has(post.authorId);
    }

    return true; // Default to visible for unknown audience types
  });
}

/**
 * Get friend IDs for a user (both directions of friendship)
 */
async function getFriendIds(userId: string): Promise<Set<string>> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { recipientId: userId }],
      status: 'ACCEPTED'
    },
    select: { requesterId: true, recipientId: true }
  });

  const friendIds = new Set<string>();
  for (const f of friendships) {
    if (f.requesterId === userId) {
      friendIds.add(f.recipientId);
    } else {
      friendIds.add(f.requesterId);
    }
  }
  return friendIds;
}

/**
 * @swagger
 * /api/feed:
 *   get:
 *     tags: [Feed]
 *     summary: Get personalized feed using probability cloud algorithm
 *     description: Generates a personalized feed using electron-cloud probability sampling based on user preferences, following relationships, and engagement patterns. Includes custom weight support for A/B testing.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of posts to skip (pagination)
 *       - in: query
 *         name: weights
 *         schema:
 *           type: string
 *         description: JSON string of custom algorithm weights for A/B testing (optional)
 *     responses:
 *       200:
 *         description: Personalized feed generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
 *                         type: object
 *                       photos:
 *                         type: array
 *                       likesCount:
 *                         type: integer
 *                       commentsCount:
 *                         type: integer
 *                       isLiked:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 algorithm:
 *                   type: string
 *                   example: probability-cloud
 *                 weights:
 *                   type: object
 *                   description: Weights used for feed generation
 *                 stats:
 *                   type: object
 *                   description: Feed generation statistics
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    // Parse custom weights if provided (for A/B testing or user preferences)
    const customWeights = req.query.weights ? JSON.parse(req.query.weights as string) : undefined;

    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());

    // Get friend IDs for audience filtering
    const friendIds = await getFriendIds(userId);

    // Generate larger feed and slice for pagination
    // We need to fetch more than just limit+offset to ensure randomization
    // Fetch extra posts to account for audience filtering
    const fetchLimit = (limitNum + offsetNum + 50) * 1.5; // Get extra posts for audience filtering
    const feedResult = await ProbabilityFeedService.generateFeed(
      userId,
      Math.ceil(fetchLimit),
      customWeights
    );

    // Apply audience filtering based on friendship status
    const audienceFilteredPosts = filterPostsByAudience(feedResult.posts, friendIds);

    // Apply offset and limit to the filtered feed
    const paginatedPosts = audienceFilteredPosts.slice(offsetNum, offsetNum + limitNum);

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
    logger.debug({
      totalPosts: postsWithLikeStatus.length,
      postsWithPhotos: postsWithLikeStatus.filter(p => p.photos && p.photos.length > 0).length,
      samplePost: postsWithLikeStatus.find(p => p.photos?.length > 0) ? {
        postId: postsWithLikeStatus.find(p => p.photos?.length > 0)!.id,
        photoCount: postsWithLikeStatus.find(p => p.photos?.length > 0)!.photos.length
      } : null
    }, 'Feed API photo data');

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
    logger.error({ error, userId: req.user?.id }, 'Feed error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/feed/following:
 *   get:
 *     tags: [Feed]
 *     summary: Get posts from followed, subscribed, and friend users with priority boosting
 *     description: |
 *       Returns feed of posts from users the current user follows, subscribes to, or is friends with.
 *       Posts are sorted using a hybrid algorithm combining recency with relationship priority:
 *       - Subscriptions: 2x priority boost (highest)
 *       - Friends: 1.5x priority boost
 *       - Follows: 1.0x (base priority)
 *       Uses 24-hour half-life decay for recency scoring.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of posts to skip (pagination)
 *     responses:
 *       200:
 *         description: Following feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           verified:
 *                             type: boolean
 *                           userBadges:
 *                             type: array
 *                       photos:
 *                         type: array
 *                       likesCount:
 *                         type: integer
 *                       commentsCount:
 *                         type: integer
 *                       isLiked:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/following', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());

    // Fetch all relationship types in parallel for efficiency
    const [follows, subscriptions, friendships] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      }),
      prisma.subscription.findMany({
        where: { subscriberId: userId },
        select: { subscribedId: true }
      }),
      prisma.friendship.findMany({
        where: {
          OR: [{ requesterId: userId }, { recipientId: userId }],
          status: 'ACCEPTED'
        },
        select: { requesterId: true, recipientId: true }
      })
    ]);

    // Create sets for quick lookup
    const followedIds = new Set(follows.map(f => f.followingId));
    const subscribedIds = new Set(subscriptions.map(s => s.subscribedId));
    const friendIds = new Set(friendships.map(f =>
      f.requesterId === userId ? f.recipientId : f.requesterId
    ));

    // Combine all user IDs (union)
    const allRelatedIds = new Set([...followedIds, ...subscribedIds, ...friendIds]);

    // If no relationships, return empty feed with helpful message
    if (allRelatedIds.size === 0) {
      return res.json({
        posts: [],
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          count: 0,
          hasMore: false
        },
        message: 'Follow, subscribe to, or become friends with users to see their posts here!'
      });
    }

    // Fetch more posts than needed for proper scoring and pagination
    const fetchLimit = limitNum + offsetNum + 50;

    // Get posts from all related users
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: Array.from(allRelatedIds) },
        isDeleted: false,
        feedVisible: true
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
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: fetchLimit
    });

    // Calculate relationship multiplier for each author
    const getRelationshipMultiplier = (authorId: string): number => {
      // Subscriptions get highest priority (2x)
      if (subscribedIds.has(authorId)) return 2.0;
      // Friends get elevated priority (1.5x)
      if (friendIds.has(authorId)) return 1.5;
      // Regular follows get base priority (1.0x)
      return 1.0;
    };

    // Calculate recency score with 24-hour half-life decay
    const calculateRecencyScore = (createdAt: Date): number => {
      const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const halfLife = 24; // 24-hour half-life
      return Math.pow(0.5, ageInHours / halfLife);
    };

    // Calculate combined score for each post
    const postsWithScores = posts.map(post => {
      const recencyScore = calculateRecencyScore(new Date(post.createdAt));
      const relationshipMultiplier = getRelationshipMultiplier(post.authorId);
      const combinedScore = recencyScore * relationshipMultiplier;

      return {
        ...post,
        _feedScore: combinedScore,
        _relationshipMultiplier: relationshipMultiplier
      };
    });

    // Sort by combined score (descending) and apply pagination
    const sortedPosts = postsWithScores
      .sort((a, b) => b._feedScore - a._feedScore)
      .slice(offsetNum, offsetNum + limitNum);

    // Add user's like status to each post
    const postIds = sortedPosts.map(p => p.id);
    const userLikes = await prisma.like.findMany({
      where: {
        userId,
        postId: { in: postIds }
      },
      select: { postId: true }
    });

    const likedPostIds = new Set(userLikes.map(like => like.postId));

    // Format posts for response (remove internal scoring fields)
    const postsWithLikeStatus = sortedPosts.map(post => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: likedPostIds.has(post.id),
      _count: undefined,
      _feedScore: undefined,
      _relationshipMultiplier: undefined
    }));

    res.json({
      posts: postsWithLikeStatus,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: postsWithLikeStatus.length,
        hasMore: postsWithLikeStatus.length === limitNum
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Following feed error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/feed/trending:
 *   get:
 *     tags: [Feed]
 *     summary: Get trending posts (most engaged in last 24 hours)
 *     description: Returns posts with highest engagement scores from the last 24 hours. Uses engagement scoring algorithm combining likes, comments, shares, and time decay. Public endpoint (no auth required).
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
 *         description: Number of posts to skip (pagination)
 *     responses:
 *       200:
 *         description: Trending posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
 *                         type: object
 *                       photos:
 *                         type: array
 *                       engagementScore:
 *                         type: number
 *                         description: Calculated engagement score
 *                       likesCount:
 *                         type: integer
 *                       dislikesCount:
 *                         type: integer
 *                       agreesCount:
 *                         type: integer
 *                       disagreesCount:
 *                         type: integer
 *                       commentsCount:
 *                         type: integer
 *                       sharesCount:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                 algorithm:
 *                   type: string
 *                   example: engagement-scoring
 *                 error:
 *                   type: string
 *                   description: Error message if fallback response (empty posts)
 */
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
    logger.error({ error }, 'Get trending posts error');
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

/**
 * @swagger
 * /api/feed/filters:
 *   get:
 *     tags: [Feed]
 *     summary: Get user's saved feed filters (Phase 2 stub)
 *     description: Returns user's custom feed filter configurations. Currently returns empty array - Phase 2 feature not yet implemented.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Feed filters retrieved successfully (empty for Phase 1)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 filters:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: []
 *                 message:
 *                   type: string
 *                   example: Filter system coming soon in Phase 2!
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/filters', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Phase 2 feature - return empty array for now
    res.json({
      success: true,
      filters: [],
      message: 'Filter system coming soon in Phase 2!'
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get feed filters error');
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve filters'
    });
  }
});

/**
 * @swagger
 * /api/feed/filters:
 *   post:
 *     tags: [Feed]
 *     summary: Create new feed filter (Phase 2 stub)
 *     description: Creates a custom feed filter configuration. Not yet implemented - returns 501 Not Implemented.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Filter configuration (schema not yet defined)
 *     responses:
 *       501:
 *         description: Not implemented - Phase 2 feature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Filter creation not yet available - Coming soon in Phase 2!
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/filters', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Phase 2 feature - not yet implemented
    res.status(501).json({
      success: false,
      error: 'Filter creation not yet available - Coming soon in Phase 2!'
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Create feed filter error');
    res.status(500).json({
      success: false,
      error: 'Failed to create filter'
    });
  }
});

/**
 * @swagger
 * /api/feed/public:
 *   get:
 *     tags: [Feed]
 *     summary: Get public feed for logged-out users using slot-roll algorithm
 *     description: |
 *       Returns a public feed using per-slot probability-based selection:
 *       - Each slot rolls 0-99 independently
 *       - 0-29 (30%) = RANDOM pool (time decay + reputation only)
 *       - 30-99 (70%) = TRENDING pool (engagement + time decay + reputation)
 *
 *       This ensures diverse content exposure while favoring engaging posts.
 *       Nothing is guaranteed - variance is intentional for organic discovery.
 *
 *       For infinite scroll, pass excludeIds to avoid duplicate posts.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *         description: Number of posts to return (max 50)
 *       - in: query
 *         name: excludeIds
 *         schema:
 *           type: string
 *         description: Comma-separated post IDs to exclude (for infinite scroll pagination)
 *     responses:
 *       200:
 *         description: Public feed generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 posts:
 *                   type: array
 *                 algorithm:
 *                   type: string
 *                   example: slot-roll-public
 *                 stats:
 *                   type: object
 *                   properties:
 *                     poolDistribution:
 *                       type: object
 *                     expectedDistribution:
 *                       type: object
 *       500:
 *         description: Internal server error
 */
router.get('/public', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit?.toString() || '15'), 50);

    // Parse excludeIds for infinite scroll pagination
    const excludeIds = req.query.excludeIds
      ? (req.query.excludeIds as string).split(',').filter(id => id.trim())
      : [];

    const feedResult = await SlotRollService.generateFeed(null, { slots: limit, excludeIds });

    // Transform posts for response (remove internal scoring fields)
    const posts = feedResult.posts.map(({ post, pool }) => ({
      id: post.id,
      content: post.content,
      author: post.author,
      photos: post.photos,
      likesCount: post._count?.likes || 0,
      commentsCount: post._count?.comments || 0,
      sharesCount: post._count?.shares || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      _pool: pool // Include pool type for debugging/analytics
    }));

    res.json({
      success: true,
      posts,
      algorithm: 'slot-roll-public',
      stats: {
        totalSlots: feedResult.stats.totalSlots,
        filledSlots: feedResult.stats.filledSlots,
        poolDistribution: feedResult.stats.poolDistribution,
        expectedDistribution: feedResult.stats.expectedDistribution
      }
    });
  } catch (error) {
    logger.error({ error }, 'Public feed error');
    res.status(500).json({
      success: false,
      error: 'Failed to generate public feed'
    });
  }
});

/**
 * @swagger
 * /api/feed/slot-roll:
 *   get:
 *     tags: [Feed]
 *     summary: Get personalized feed using slot-roll algorithm (authenticated)
 *     description: |
 *       Returns a personalized feed using per-slot probability-based selection:
 *       - Each slot rolls 0-99 independently
 *       - 0-9 (10%) = RANDOM pool (anti-echo-chamber)
 *       - 10-19 (10%) = TRENDING pool (cross-sectional content)
 *       - 20-99 (80%) = PERSONALIZED pool (vector matching + social graph)
 *
 *       This ensures diverse content exposure while heavily favoring personalized content.
 *       Nothing is guaranteed - variance is intentional for organic discovery.
 *
 *       For infinite scroll, pass excludeIds to avoid duplicate posts.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *         description: Number of posts to return (max 50)
 *       - in: query
 *         name: excludeIds
 *         schema:
 *           type: string
 *         description: Comma-separated post IDs to exclude (for infinite scroll pagination)
 *     responses:
 *       200:
 *         description: Personalized feed generated successfully
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/slot-roll', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit?.toString() || '15'), 50);

    // Parse excludeIds for infinite scroll pagination
    const excludeIds = req.query.excludeIds
      ? (req.query.excludeIds as string).split(',').filter(id => id.trim())
      : [];

    // Get friend IDs for audience filtering
    const friendIds = await getFriendIds(userId);

    const feedResult = await SlotRollService.generateFeed(userId, { slots: limit, excludeIds });

    // Filter by audience and add like status
    const audienceFilteredPosts = feedResult.posts.filter(({ post }) => {
      const audience = post.audience || 'PUBLIC';
      if (audience === 'PUBLIC') return true;
      if (audience === 'FRIENDS_ONLY') return friendIds.has(post.authorId);
      if (audience === 'NON_FRIENDS') return !friendIds.has(post.authorId);
      return true;
    });

    const postIds = audienceFilteredPosts.map(({ post }) => post.id);
    const userLikes = await prisma.like.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true }
    });
    const likedPostIds = new Set(userLikes.map(like => like.postId));

    const posts = audienceFilteredPosts.map(({ post, pool }) => ({
      id: post.id,
      content: post.content,
      author: post.author,
      photos: post.photos,
      likesCount: post._count?.likes || 0,
      commentsCount: post._count?.comments || 0,
      sharesCount: post._count?.shares || 0,
      isLiked: likedPostIds.has(post.id),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      _pool: pool
    }));

    res.json({
      success: true,
      posts,
      algorithm: 'slot-roll-personalized',
      stats: {
        totalSlots: feedResult.stats.totalSlots,
        filledSlots: feedResult.stats.filledSlots,
        poolDistribution: feedResult.stats.poolDistribution,
        expectedDistribution: feedResult.stats.expectedDistribution
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Slot-roll feed error');
    res.status(500).json({
      success: false,
      error: 'Failed to generate feed'
    });
  }
});

export default router;