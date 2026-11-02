import express, { Request } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../services/logger';
import TrendingService, { TrendingScope, TrendingSnapshot } from '../services/trendingService';

const router = express.Router();

/**
 * Resolve the geography scope from query params or the authenticated user.
 *
 * @param req - Express request
 * @returns Trending scope
 */
async function resolveScope(req: Request): Promise<TrendingScope> {
  const rawScope = String(req.query.scope || 'national').toLowerCase();
  const type = (['national', 'state', 'local'].includes(rawScope) ? rawScope : 'national') as TrendingScope['type'];

  if (type === 'national') return { type: 'national', id: null, label: 'National' };

  let id = String(req.query[type === 'state' ? 'state' : 'zip'] || '').trim() || null;

  if (!id) {
    const userId = (req as AuthRequest).user?.id;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { state: true, zipCode: true }
      });
      id = type === 'state' ? user?.state || null : user?.zipCode || null;
    }
  }

  if (!id) {
    return { type: 'national', id: null, label: 'National' };
  }

  return {
    type,
    id,
    label: type === 'state' ? id : `ZIP ${id}`
  };
}

function windowHours(req: Request): number {
  const raw = Number(req.query.window);
  return raw === 168 || raw === 72 ? raw : 24;
}

function filterTopics(snapshot: TrendingSnapshot, category?: string) {
  const normalized = String(category || '').trim().toLowerCase();
  if (!normalized || normalized === 'overall' || normalized === 'all') return snapshot.topics;
  return snapshot.topics.filter((topic) => topic.category.toLowerCase() === normalized);
}

function categoryTopPosts(snapshot: TrendingSnapshot, topics: TrendingSnapshot['topics'], limit: number) {
  const allowed = new Set(topics.map((topic) => topic.id));
  if (allowed.size === snapshot.topics.length) return snapshot.topPosts.slice(0, limit);

  const seen = new Set<string>();
  const posts = topics
    .flatMap((topic) => topic.posts)
    .sort((a, b) => b.activeScore - a.activeScore)
    .filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    })
    .slice(0, limit);
  return posts;
}

/**
 * @swagger
 * /api/trending/now:
 *   get:
 *     tags: [Trending]
 *     summary: Compact trending topics and posts for the current view
 *     description: Returns top 3 topics and top 3 posts for the selected window, geography, and category. Uses the central activity-gated snapshot cache.
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [national, state, local] }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: zip
 *         schema: { type: string }
 *       - in: query
 *         name: window
 *         schema: { type: integer, enum: [24, 72, 168], default: 24 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trending Now payload
 */
router.get('/now', optionalAuth, async (req: Request, res) => {
  try {
    const scope = await resolveScope(req);
    const window = windowHours(req);
    const snapshot = await TrendingService.getSnapshot(scope, window);
    const topics = filterTopics(snapshot, String(req.query.category || 'overall')).slice(0, 3);
    const posts = categoryTopPosts(snapshot, topics, 3);

    res.json({
      success: true,
      generatedAt: snapshot.generatedAt,
      windowHours: window,
      scope: snapshot.scope,
      categories: snapshot.categories,
      topics,
      posts,
      hasRealData: topics.length > 0 || posts.length > 0
    });
  } catch (error) {
    logger.error({ error, scope: req.query.scope, category: req.query.category }, 'Trending Now error');
    res.status(500).json({ success: false, error: 'Failed to load Trending Now' });
  }
});

/**
 * @swagger
 * /api/trending/digest:
 *   get:
 *     tags: [Trending]
 *     summary: Full Trending Digest payload with AI summaries and quotes
 *     description: Returns all topics/posts for the selected window, geography, and category, plus the cached daily overview.
 *     responses:
 *       200:
 *         description: Trending Digest payload
 */
router.get('/digest', optionalAuth, async (req: Request, res) => {
  try {
    const scope = await resolveScope(req);
    const window = windowHours(req);
    const snapshot = await TrendingService.getSnapshot(scope, window);
    const topics = filterTopics(snapshot, String(req.query.category || 'overall'));
    const posts = categoryTopPosts(snapshot, topics, 50);

    res.json({
      success: true,
      generatedAt: snapshot.generatedAt,
      windowHours: window,
      scope: snapshot.scope,
      categories: snapshot.categories,
      dailyOverview: snapshot.dailyOverview,
      topics,
      posts
    });
  } catch (error) {
    logger.error({ error, scope: req.query.scope, category: req.query.category }, 'Trending Digest error');
    res.status(500).json({ success: false, error: 'Failed to load Trending Digest' });
  }
});

/**
 * @swagger
 * /api/trending/topics/{topicId}/posts:
 *   get:
 *     tags: [Trending]
 *     summary: Get a trending topic's posts sorted by active, top, or relevant
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [active, top, relevant], default: active }
 *     responses:
 *       200:
 *         description: Topic posts
 *       404:
 *         description: Topic not found in the current snapshot
 */
router.get('/topics/:topicId/posts', optionalAuth, async (req: Request, res) => {
  try {
    const scope = await resolveScope(req);
    const window = windowHours(req);
    const snapshot = await TrendingService.getSnapshot(scope, window);
    const sort = ['active', 'top', 'relevant'].includes(String(req.query.sort))
      ? String(req.query.sort) as 'active' | 'top' | 'relevant'
      : 'active';
    const topic = TrendingService.getTopicPosts(snapshot, req.params.topicId, sort);

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found in the current snapshot' });
    }

    res.json({ success: true, generatedAt: snapshot.generatedAt, topic });
  } catch (error) {
    logger.error({ error, topicId: req.params.topicId }, 'Trending topic posts error');
    res.status(500).json({ success: false, error: 'Failed to load topic posts' });
  }
});

/**
 * GET /api/trending/categories - dynamic category catalog
 */
router.get('/categories', optionalAuth, async (req: Request, res) => {
  try {
    const scope = await resolveScope(req);
    const window = windowHours(req);
    const snapshot = await TrendingService.getSnapshot(scope, window);
    res.json({ success: true, generatedAt: snapshot.generatedAt, scope: snapshot.scope, categories: snapshot.categories });
  } catch (error) {
    logger.error({ error, scope: req.query.scope }, 'Trending categories error');
    res.status(500).json({ success: false, error: 'Failed to load trending categories' });
  }
});

/**
 * Legacy alias used by the current Trending panel. Returns the real snapshot
 * in the old support/oppose shape until Phase 3 replaces the UI.
 */
router.get('/topics', optionalAuth, async (req: Request, res) => {
  try {
    const scope = await resolveScope(req);
    const window = windowHours(req);
    const limit = Math.max(1, Math.min(20, parseInt(String(req.query.limit || '7'), 10) || 7));
    const snapshot = await TrendingService.getSnapshot(scope, window);
    const topics = filterTopics(snapshot, String(req.query.category || 'overall')).slice(0, limit).map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.summary,
      postCount: topic.postCount,
      support: { percentage: topic.feeling.supportPct, count: topic.feeling.support },
      oppose: { percentage: topic.feeling.opposePct, count: topic.feeling.oppose },
      prevailingPosition: topic.prevailingPosition,
      leadingCritique: topic.leadingCritique,
      createdAt: topic.lastActivity,
      category: topic.category,
      scope: scope.type
    }));

    res.json({ success: true, scope: scope.type, topics, categories: snapshot.categories, generatedAt: snapshot.generatedAt });
  } catch (error) {
    logger.error({ error, scope: req.query.scope }, 'Trending legacy topics error');
    res.status(500).json({ success: false, error: 'Failed to load trending topics' });
  }
});

/**
 * Map topic fallback. Returns real topic titles with no fabricated coordinates;
 * the map now uses /api/posts/map-data for bubbles.
 */
router.get('/map-topics', optionalAuth, async (req: Request, res) => {
  try {
    const scope = await resolveScope(req);
    const snapshot = await TrendingService.getSnapshot(scope, 24);
    const topics = snapshot.topics.slice(0, Math.max(1, Math.min(10, parseInt(String(req.query.count || '3'), 10) || 3))).map((topic) => ({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      postCount: topic.postCount,
      support: topic.feeling.supportPct,
      oppose: topic.feeling.opposePct,
      coordinates: null
    }));
    res.json({ success: true, topics, message: 'Real topics (coordinates served by map-data)' });
  } catch (error) {
    logger.error({ error }, 'Trending map topics error');
    res.status(500).json({ success: false, error: 'Failed to load map topics' });
  }
});

export default router;
