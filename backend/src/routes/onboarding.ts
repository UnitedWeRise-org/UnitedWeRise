import { prisma } from '../lib/prisma';
import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { onboardingService } from '../services/onboardingService';
import { RepresentativeService } from '../services/representativeService';
import { metricsService } from '../services/metricsService';
import { logger } from '../services/logger';
import { EmbeddingService } from '../services/embeddingService';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

/**
 * @swagger
 * /api/onboarding/steps:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding steps for current user
 *     description: Returns all onboarding steps with completion status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding steps retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       required:
 *                         type: boolean
 *                       completed:
 *                         type: boolean
 *                       data:
 *                         type: object
 */
router.get('/steps', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const steps = await onboardingService.getOnboardingSteps(userId);
    res.json({
      steps,
      emailVerified: req.user!.emailVerified ?? false,
      onboardingCompleted: req.user!.onboardingCompleted ?? false
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get onboarding steps error');
    res.status(500).json({ error: 'Failed to get onboarding steps' });
  }
});

/**
 * @swagger
 * /api/onboarding/progress:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding progress for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding progress retrieved successfully
 */
router.get('/progress', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const progress = await onboardingService.getOnboardingProgress(userId);

    res.json({
      ...progress,
      emailVerified: req.user!.emailVerified ?? false
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get onboarding progress error');
    res.status(500).json({ error: 'Failed to get onboarding progress' });
  }
});

/**
 * @swagger
 * /api/onboarding/complete-step:
 *   post:
 *     tags: [Onboarding]
 *     summary: Complete an onboarding step
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepId
 *             properties:
 *               stepId:
 *                 type: string
 *               stepData:
 *                 type: object
 */
router.post('/complete-step', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { stepId, stepData } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'Step ID is required' });
    }

    const profile = await onboardingService.completeStep(userId, stepId, stepData);
    
    await onboardingService.trackOnboardingEvent(userId, 'step_completed', stepId, stepData);
    
    // If US location step completed, fetch and cache representatives
    if (stepId === 'location' && stepData?.zipCode && (!stepData.country || stepData.country === 'US')) {
      try {
        // Fetch representatives using RepresentativeService (with automatic caching)
        const address = stepData.address || stepData.zipCode;
        const state = stepData.state;

        await RepresentativeService.getRepresentativesByAddress(
          address,
          stepData.zipCode,
          state
        );

        logger.info({ zipCode: stepData.zipCode, state }, 'Representatives fetched and cached');
      } catch (error) {
        logger.error({ error }, 'Failed to fetch representatives');
        // Don't fail the onboarding step if rep fetching fails
      }
    }

    res.json({
      message: 'Step completed successfully',
      profile,
      progress: await onboardingService.getOnboardingProgress(userId)
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Complete onboarding step error');
    res.status(500).json({ error: 'Failed to complete step' });
  }
});

/**
 * @swagger
 * /api/onboarding/skip-step:
 *   post:
 *     tags: [Onboarding]
 *     summary: Skip a non-required onboarding step
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepId
 *             properties:
 *               stepId:
 *                 type: string
 */
router.post('/skip-step', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { stepId } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'Step ID is required' });
    }

    const profile = await onboardingService.skipStep(userId, stepId);
    
    await onboardingService.trackOnboardingEvent(userId, 'step_skipped', stepId);
    
    res.json({
      message: 'Step skipped successfully',
      profile,
      progress: await onboardingService.getOnboardingProgress(userId)
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Skip onboarding step error');
    if (error instanceof Error && error.message.includes('Cannot skip required step')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to skip step' });
  }
});

/**
 * @swagger
 * /api/onboarding/interests:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get available interest categories
 *     description: Returns interests grouped by category for onboarding UI.
 *       Also returns a flat list for backwards compatibility.
 *     responses:
 *       200:
 *         description: Interest categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       interests:
 *                         type: array
 *                         items:
 *                           type: string
 *                 interests:
 *                   type: array
 *                   description: Flat list of all interests (backwards compatible)
 *                   items:
 *                     type: string
 */
router.get('/interests', async (req, res) => {
  try {
    const categories = onboardingService.getCategorizedInterests();
    const interests = categories.flatMap(cat => cat.interests);
    res.json({ categories, interests });
  } catch (error) {
    logger.error({ error }, 'Get interests error');
    res.status(500).json({ error: 'Failed to get interests' });
  }
});

/**
 * @swagger
 * /api/onboarding/location/validate:
 *   post:
 *     tags: [Onboarding]
 *     summary: Validate location and get representative info
 *     description: |
 *       Two-path location validation:
 *       - **US users** (country omitted or "US"): Requires zipCode or address, returns representative preview.
 *       - **International users** (country != "US"): Requires city and ISO 3166-1 alpha-2 country code, returns confirmed location with empty representatives array.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zipCode:
 *                 type: string
 *                 description: US ZIP code (required for US path)
 *               address:
 *                 type: string
 *                 description: Full US address (optional, improves rep lookup accuracy)
 *               country:
 *                 type: string
 *                 description: ISO 3166-1 alpha-2 country code (e.g., "US", "GB"). Defaults to "US" if omitted.
 *               city:
 *                 type: string
 *                 description: City name (required for international path)
 *     responses:
 *       200:
 *         description: Location validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 location:
 *                   type: object
 *                   properties:
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zipCode:
 *                       type: string
 *                     country:
 *                       type: string
 *                     representatives:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalRepresentatives:
 *                       type: integer
 *                     isInternational:
 *                       type: boolean
 *       400:
 *         description: Validation error (missing fields or invalid country code)
 */
router.post('/location/validate', async (req, res) => {
  try {
    const { zipCode, address, country, city } = req.body;

    // International (non-US) users: validate city+country, skip representative lookup
    if (country && country !== 'US') {
      if (!city || (typeof city === 'string' && city.trim().length === 0)) {
        return res.status(400).json({ error: 'City is required for international locations' });
      }
      if (!/^[A-Z]{2}$/.test(country)) {
        return res.status(400).json({ error: 'Invalid country code' });
      }
      return res.json({
        message: 'Location validated successfully',
        location: {
          city: typeof city === 'string' ? city.trim() : city,
          country,
          representatives: [],
          totalRepresentatives: 0,
          isInternational: true
        }
      });
    }

    // US flow: require ZIP code or address
    if (!zipCode && !address) {
      return res.status(400).json({ error: 'ZIP code or address is required' });
    }

    // Use the address if provided, otherwise use ZIP code
    const locationQuery = address || zipCode;

    // Fetch representatives using RepresentativeService (Geocodio + Google Civic + cache)
    const result = await RepresentativeService.getRepresentativesByAddress(
      locationQuery,
      zipCode,
      undefined // state will be extracted from address
    );

    if (!result || !result.representatives) {
      return res.status(400).json({
        error: 'Unable to find representatives for this location. Please check your ZIP code or address.'
      });
    }

    // Convert to array if grouped by level
    let reps = Array.isArray(result.representatives)
      ? result.representatives
      : [
          ...(result.representatives.federal || []),
          ...(result.representatives.state || []),
          ...(result.representatives.local || [])
        ];

    if (reps.length === 0) {
      return res.status(400).json({
        error: 'Unable to find representatives for this location. Please check your ZIP code or address.'
      });
    }

    // Extract location info
    const locationInfo = {
      zipCode: result.location.zipCode || zipCode,
      city: result.location.city,
      state: result.location.state,
      address,
      representatives: reps.slice(0, 5).map(rep => ({
        name: rep.name,
        office: rep.office,
        party: rep.party,
        photoUrl: rep.photoUrl,
        level: rep.level
      })),
      totalRepresentatives: reps.length,
      source: result.source // 'cache', 'geocodio', 'google_civic', 'google_civic+geocodio'
    };

    res.json({
      message: 'Location validated successfully',
      location: locationInfo
    });
  } catch (error) {
    logger.error({ error }, 'Location validation error');
    res.status(400).json({
      error: 'Invalid location. Please check your ZIP code or address and try again.'
    });
  }
});

/**
 * @swagger
 * /api/onboarding/welcome:
 *   post:
 *     tags: [Onboarding]
 *     summary: Mark welcome step as viewed
 *     security:
 *       - bearerAuth: []
 */
router.post('/welcome', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const profile = await onboardingService.completeStep(userId, 'welcome', { 
      viewedAt: new Date().toISOString() 
    });
    
    await onboardingService.trackOnboardingEvent(userId, 'welcome_viewed');
    
    res.json({
      message: 'Welcome step completed',
      profile
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Welcome step error');
    res.status(500).json({ error: 'Failed to complete welcome step' });
  }
});

/**
 * @swagger
 * /api/onboarding/analytics:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding analytics (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding analytics retrieved successfully
 */
router.get('/analytics', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin (role info logged server-side only)
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const analytics = await onboardingService.getOnboardingAnalytics();
    
    res.json(analytics);
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get onboarding analytics error');
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * @swagger
 * /api/onboarding/suggested-follows:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get suggested accounts to follow based on user interests
 *     description: Uses the user's interest embedding to find active content creators
 *       who post about matching topics. Returns up to 10 suggestions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggested accounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       bio:
 *                         type: string
 *                       postCount:
 *                         type: number
 *                       topTags:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/suggested-follows', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's interest embedding
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { embedding: true, interests: true }
    });

    if (!user?.embedding || user.embedding.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Find posts similar to user's interest embedding
    const similarPosts = await EmbeddingService.findSimilarPosts(
      user.embedding,
      50,  // Get more posts to aggregate by author
      0.5  // Lower threshold for broader discovery
    );

    if (!similarPosts || similarPosts.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Aggregate by author — count how many similar posts each author has
    const authorScores = new Map<string, { score: number; count: number }>();
    for (const post of similarPosts) {
      const authorId = post.authorId;
      if (authorId === userId) continue; // Skip self
      const existing = authorScores.get(authorId) || { score: 0, count: 0 };
      existing.score += (post as any).similarity || 0.5;
      existing.count += 1;
      authorScores.set(authorId, existing);
    }

    // Sort by combined score (similarity * frequency)
    const topAuthorIds = Array.from(authorScores.entries())
      .sort((a, b) => (b[1].score * b[1].count) - (a[1].score * a[1].count))
      .slice(0, 10)
      .map(([id]) => id);

    if (topAuthorIds.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Fetch author profiles with post counts and recent tags
    const authors = await prisma.user.findMany({
      where: {
        id: { in: topAuthorIds },
        isSuspended: false
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        _count: { select: { posts: true } }
      }
    });

    // Get top tags for each author from recent posts
    const authorTags = await Promise.all(
      topAuthorIds.map(async (authorId) => {
        const recentPosts = await prisma.post.findMany({
          where: { authorId, deletedAt: null },
          select: { tags: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        });
        const tagCounts = new Map<string, number>();
        for (const post of recentPosts) {
          for (const tag of (post.tags || [])) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
        return {
          authorId,
          topTags: Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag)
        };
      })
    );

    const tagsByAuthor = new Map(authorTags.map(t => [t.authorId, t.topTags]));

    // Check which authors the user already follows
    const existingFollows = await prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: topAuthorIds } },
      select: { followingId: true }
    });
    const alreadyFollowing = new Set(existingFollows.map(f => f.followingId));

    // Build response, excluding already-followed users
    const suggestions = topAuthorIds
      .filter(id => !alreadyFollowing.has(id))
      .map(id => {
        const author = authors.find(a => a.id === id);
        if (!author) return null;
        return {
          id: author.id,
          username: author.username,
          displayName: [author.firstName, author.lastName].filter(Boolean).join(' ') || author.username,
          avatar: author.avatar,
          bio: author.bio ? author.bio.substring(0, 120) : null,
          postCount: author._count.posts,
          topTags: tagsByAuthor.get(id) || []
        };
      })
      .filter(Boolean);

    res.json({ suggestions });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Suggested follows error');
    res.json({ suggestions: [] }); // Graceful degradation
  }
});

// Enhanced search endpoint with political term filtering
router.get('/search-preview', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Filter political terms subtly
    const filteredQuery = onboardingService.filterSearchTerms(query);
    
    // If the query was filtered to something generic, return issue-based suggestions
    if (filteredQuery === 'community discussion' || onboardingService.isFilteredSearchTerm(query as string)) {
      const interests = onboardingService.getPopularIssues();
      return res.json({
        suggestions: interests.slice(0, 5),
        message: 'Here are some popular topics to explore'
      });
    }

    // Perform actual search with filtered query
    // This would integrate with your search service
    res.json({
      query: filteredQuery,
      results: [], // Would contain actual search results
      message: filteredQuery !== query ? 'Showing results for related topics' : undefined
    });
  } catch (error) {
    logger.error({ error }, 'Search preview error');
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;