import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { TopicService } from '../services/topicService';
import { EmbeddingService } from '../services/embeddingService';
import { metricsService } from '../services/metricsService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/topics/trending:
 *   get:
 *     tags: [Topics]
 *     summary: Get trending topics
 *     description: Retrieve currently trending discussion topics based on AI analysis
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of topics to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by topic category
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Hours to look back for trending calculation
 *     responses:
 *       200:
 *         description: List of trending topics with engagement metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Topic'
 *                 count:
 *                   type: integer
 */
// Get trending topics
router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const category = req.query.category as string;
    
    let topics = await TopicService.getTrendingTopics(limit * 2); // Get more for filtering
    
    // Filter by category if provided
    if (category) {
      topics = topics.filter(topic => 
        topic.category?.toLowerCase() === category.toLowerCase()
      ).slice(0, limit);
    } else {
      topics = topics.slice(0, limit);
    }
    
    // Track topic views for analytics
    metricsService.incrementCounter('topic_trending_requests_total');
    
    res.json({
      topics,
      count: topics.length
    });
  } catch (error) {
    console.error('Trending topics error:', error);
    res.status(500).json({ error: 'Failed to retrieve trending topics' });
  }
});

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     tags: [Topics]
 *     summary: Get topic details
 *     description: Get comprehensive details for a specific topic including posts and comments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic details with posts, sub-topics, and comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicDetails'
 *       404:
 *         description: Topic not found
 */
// Get topic details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const topic = await TopicService.getTopicDetails(id);
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Increment view count
    await prisma.topic.update({
      where: { id },
      data: {
        viewCount: { increment: 1 }
      }
    });
    
    // Track topic views
    metricsService.incrementCounter('topic_detail_views_total', {
      category: topic.category || 'uncategorized'
    });
    
    res.json(topic);
  } catch (error) {
    console.error('Topic details error:', error);
    res.status(500).json({ error: 'Failed to retrieve topic details' });
  }
});

/**
 * @swagger
 * /api/topics/{id}/comment:
 *   post:
 *     tags: [Topics]
 *     summary: Add comment to topic
 *     description: Add a comment to a topic or reply to existing comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Comment content
 *               parentId:
 *                 type: string
 *                 description: Parent comment ID for replies
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicComment'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Topic not found
 */
// Add comment to topic
router.post('/:id/comment', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: topicId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or less' });
    }
    
    // Verify topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, isActive: true }
    });
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    if (!topic.isActive) {
      return res.status(400).json({ error: 'Cannot comment on inactive topic' });
    }
    
    // Verify parent comment exists if provided
    if (parentId) {
      const parentComment = await prisma.topicComment.findUnique({
        where: { id: parentId },
        select: { id: true, topicId: true }
      });
      
      if (!parentComment || parentComment.topicId !== topicId) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }
    
    const comment = await TopicService.addTopicComment(
      userId,
      content.trim(),
      topicId,
      undefined,
      parentId
    );
    
    // Track topic engagement
    metricsService.incrementCounter('topic_comments_total', {
      topic_category: topic.id // We don't have category in the select
    });
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Topic comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * @swagger
 * /api/topics/{id}/subtopics/{subTopicId}/comment:
 *   post:
 *     tags: [Topics]
 *     summary: Add comment to sub-topic
 *     description: Add a comment to a specific sub-topic within a topic
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *       - in: path
 *         name: subTopicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Comment content
 *               parentId:
 *                 type: string
 *                 description: Parent comment ID for replies
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Topic or sub-topic not found
 */
// Add comment to sub-topic
router.post('/:id/subtopics/:subTopicId/comment', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: topicId, subTopicId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Verify sub-topic exists and belongs to topic
    const subTopic = await prisma.subTopic.findUnique({
      where: { id: subTopicId },
      include: {
        parentTopic: {
          select: { id: true, isActive: true }
        }
      }
    });
    
    if (!subTopic || subTopic.parentTopic.id !== topicId) {
      return res.status(404).json({ error: 'Sub-topic not found' });
    }
    
    if (!subTopic.parentTopic.isActive) {
      return res.status(400).json({ error: 'Cannot comment on inactive topic' });
    }
    
    const comment = await TopicService.addTopicComment(
      userId,
      content.trim(),
      undefined,
      subTopicId,
      parentId
    );
    
    // Track sub-topic engagement
    metricsService.incrementCounter('subtopic_comments_total');
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Sub-topic comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * @swagger
 * /api/topics/analyze/recent:
 *   post:
 *     tags: [Topics]
 *     summary: Trigger topic analysis
 *     description: Manually trigger AI analysis of recent posts to generate new topics (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeframe:
 *                 type: integer
 *                 default: 24
 *                 description: Hours to analyze (default 24)
 *               maxPosts:
 *                 type: integer
 *                 default: 500
 *                 description: Maximum posts to analyze
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 topicsCreated:
 *                   type: integer
 *                 postsAnalyzed:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Admin access required
 */
// Trigger topic analysis (Admin only)
router.post('/analyze/recent', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    // Check if user is admin or moderator
    if (!user.isAdmin && !user.isModerator) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }
    
    const { timeframe = 24, maxPosts = 500 } = req.body;
    
    console.log(`Starting topic analysis: ${timeframe}h timeframe, max ${maxPosts} posts`);
    
    // Generate topic clusters
    const analysis = await TopicService.generateTopicClusters(timeframe, maxPosts);
    
    // Save to database
    const topicsCreated = await TopicService.saveTopicsToDB(analysis);
    
    // Update trending scores
    await TopicService.updateTrendingScores();
    
    // Track analysis execution
    metricsService.incrementCounter('topic_analysis_runs_total');
    
    res.json({
      message: 'Topic analysis completed successfully',
      topicsCreated,
      postsAnalyzed: analysis.topics.reduce((sum, topic) => sum + topic.posts.length, 0) + analysis.uncategorizedPosts.length
    });
  } catch (error) {
    console.error('Topic analysis error:', error);
    res.status(500).json({ error: 'Topic analysis failed' });
  }
});

/**
 * @swagger
 * /api/topics/search:
 *   get:
 *     tags: [Topics]
 *     summary: Search topics
 *     description: Search topics by keywords, category, or semantic similarity
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum results to return
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Topic'
 */
// Search topics
router.get('/search', async (req, res) => {
  try {
    const { q: query, category, limit = 20 } = req.query;
    const maxLimit = Math.min(parseInt(limit as string) || 20, 100);
    
    let where: any = {
      isActive: true
    };
    
    // Add category filter
    if (category) {
      where.category = {
        contains: category as string,
        mode: 'insensitive'
      };
    }
    
    // Add text search
    if (query) {
      where.OR = [
        {
          title: {
            contains: query as string,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: query as string,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    const topics = await prisma.topic.findMany({
      where,
      include: {
        posts: {
          take: 3,
          include: {
            post: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    avatar: true
                  }
                }
              }
            }
          },
          orderBy: {
            relevanceScore: 'desc'
          }
        }
      },
      orderBy: [
        { trendingScore: 'desc' },
        { viewCount: 'desc' }
      ],
      take: maxLimit
    });
    
    // Track search queries
    metricsService.incrementCounter('topic_searches_total');
    
    res.json({
      topics,
      count: topics.length,
      query: query || null,
      category: category || null
    });
  } catch (error) {
    console.error('Topic search error:', error);
    res.status(500).json({ error: 'Topic search failed' });
  }
});

export default router;