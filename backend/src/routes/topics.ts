import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { TopicService } from '../services/topicService';
import { EmbeddingService } from '../services/embeddingService';
import { metricsService } from '../services/metricsService';
import { logger } from '../services/logger';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

/**
 * @swagger
 * /api/topics/trending:
 *   get:
 *     tags: [Topic]
 *     summary: Get trending topics
 *     description: Retrieves currently trending discussion topics based on AI analysis and engagement metrics. Topics are ranked by trending score which combines view counts, comment activity, and recency.
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
 *         description: Filter by topic category (e.g., healthcare, infrastructure, education)
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                       trendingScore:
 *                         type: number
 *                       viewCount:
 *                         type: integer
 *                       posts:
 *                         type: array
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   description: Number of topics returned
 *       500:
 *         description: Failed to retrieve trending topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to retrieve trending topics
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
    logger.error({ error, category: req.query.category }, 'Trending topics error');
    res.status(500).json({ error: 'Failed to retrieve trending topics' });
  }
});

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     tags: [Topic]
 *     summary: Get topic details
 *     description: Retrieves comprehensive details for a specific topic including associated posts, sub-topics, and comments. Increments the topic's view count automatically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic unique identifier
 *     responses:
 *       200:
 *         description: Topic details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 category:
 *                   type: string
 *                 viewCount:
 *                   type: integer
 *                 trendingScore:
 *                   type: number
 *                 posts:
 *                   type: array
 *                   description: Posts associated with this topic
 *                 subTopics:
 *                   type: array
 *                   description: Sub-topics under this main topic
 *                 comments:
 *                   type: array
 *                   description: Comments on this topic
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Topic not found
 *       500:
 *         description: Failed to retrieve topic details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to retrieve topic details
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
    logger.error({ error, topicId: req.params.id }, 'Topic details error');
    res.status(500).json({ error: 'Failed to retrieve topic details' });
  }
});

/**
 * @swagger
 * /api/topics/{id}/comment:
 *   post:
 *     tags: [Topic]
 *     summary: Add comment to topic
 *     description: Adds a new comment to a topic or creates a threaded reply to an existing comment. Validates topic status and comment length before creation.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic unique identifier
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
 *                 description: Comment text content
 *                 example: This is an insightful discussion on this topic
 *               parentId:
 *                 type: string
 *                 description: Parent comment ID for threaded replies (optional)
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment added successfully
 *                 comment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     topicId:
 *                       type: string
 *                     parentId:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum:
 *                     - Comment content is required
 *                     - Comment must be 2000 characters or less
 *                     - Cannot comment on inactive topic
 *                     - Invalid parent comment
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Topic not found
 *       500:
 *         description: Failed to add comment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to add comment
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
    logger.error({ error, topicId: req.params.id, userId: req.user?.id }, 'Topic comment error');
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * @swagger
 * /api/topics/{id}/subtopics/{subTopicId}/comment:
 *   post:
 *     tags: [Topic]
 *     summary: Add comment to sub-topic
 *     description: Adds a comment to a specific sub-topic within a parent topic. Validates that sub-topic belongs to the specified parent topic and that the parent topic is active.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent topic unique identifier
 *       - in: path
 *         name: subTopicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-topic unique identifier
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
 *                 description: Comment text content
 *                 example: Great analysis of this specific aspect
 *               parentId:
 *                 type: string
 *                 description: Parent comment ID for threaded replies (optional)
 *     responses:
 *       201:
 *         description: Comment added successfully to sub-topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment added successfully
 *                 comment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     subTopicId:
 *                       type: string
 *                     parentId:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum:
 *                     - Comment content is required
 *                     - Cannot comment on inactive topic
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Topic or sub-topic not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Sub-topic not found
 *       500:
 *         description: Failed to add comment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to add comment
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
    logger.error({ error, subTopicId: req.params.subTopicId, userId: req.user?.id }, 'Sub-topic comment error');
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * @swagger
 * /api/topics/analyze/recent:
 *   post:
 *     tags: [Topic]
 *     summary: Trigger topic analysis (Admin/Moderator only)
 *     description: Manually triggers AI analysis of recent posts to generate topic clusters and update trending scores. Uses Azure OpenAI to identify discussion themes and group related posts. Requires admin or moderator privileges.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeframe:
 *                 type: integer
 *                 default: 24
 *                 description: Hours to look back for post analysis
 *                 example: 24
 *               maxPosts:
 *                 type: integer
 *                 default: 500
 *                 description: Maximum number of posts to analyze
 *                 example: 500
 *     responses:
 *       200:
 *         description: Topic analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Topic analysis completed successfully
 *                 topicsCreated:
 *                   type: integer
 *                   description: Number of new topics created from analysis
 *                   example: 7
 *                 postsAnalyzed:
 *                   type: integer
 *                   description: Total number of posts processed in analysis
 *                   example: 342
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or moderator access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Admin or moderator access required
 *       500:
 *         description: Topic analysis failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Topic analysis failed
 */
// Trigger topic analysis (Admin only)
router.post('/analyze/recent', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    // Check if user is admin or moderator (role info logged server-side only)
    if (!user.isAdmin && !user.isModerator) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { timeframe = 24, maxPosts = 500 } = req.body;

    logger.info({ timeframe, maxPosts, userId: user.id }, 'Starting topic analysis');

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
    logger.error({ error, userId: req.user?.id }, 'Topic analysis error');
    res.status(500).json({ error: 'Topic analysis failed' });
  }
});

/**
 * @swagger
 * /api/topics/search:
 *   get:
 *     tags: [Topic]
 *     summary: Search topics
 *     description: Searches topics by keywords in title and description, with optional category filtering. Results are ranked by trending score and view count. Only returns active topics.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query text (searches title and description)
 *         example: healthcare
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (case-insensitive partial match)
 *         example: politics
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Search results with matching topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topics:
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
 *                       category:
 *                         type: string
 *                       trendingScore:
 *                         type: number
 *                       viewCount:
 *                         type: integer
 *                       posts:
 *                         type: array
 *                         description: Top 3 most relevant posts for this topic
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   description: Number of topics returned
 *                 query:
 *                   type: string
 *                   nullable: true
 *                   description: Search query used (null if none)
 *                 category:
 *                   type: string
 *                   nullable: true
 *                   description: Category filter used (null if none)
 *       500:
 *         description: Topic search failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Topic search failed
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
    logger.error({ error, query: req.query.q, category: req.query.category }, 'Topic search error');
    res.status(500).json({ error: 'Topic search failed' });
  }
});

export default router;