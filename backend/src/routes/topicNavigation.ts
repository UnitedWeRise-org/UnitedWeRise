/**
 * Topic Navigation API Routes
 * 
 * Implements the complete topic discovery and navigation system:
 * - GET /trending - Discover trending topics
 * - POST /enter/:topicId - Enter topic mode  
 * - POST /exit - Exit topic mode back to algorithm feed
 * - GET /:topicId/posts - Get posts for a specific topic
 */

import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import TopicDiscoveryService, { TopicNavigationState } from '../services/topicDiscoveryService';
import logger from '../utils/logger';

const router = express.Router();

// Store navigation states per user (in production, use Redis or database)
const userNavigationStates = new Map<string, TopicNavigationState>();

/**
 * GET /api/topics/trending
 * Discover trending topics from recent activity
 */
router.get('/trending', async (req, res) => {
    try {
        const { 
            timeframe = 24,
            minPosts = 5, 
            maxTopics = 15 
        } = req.query;

        const trendingTopics = await TopicDiscoveryService.discoverTrendingTopics(
            Number(timeframe),
            Number(minPosts), 
            Number(maxTopics)
        );

        res.json({
            success: true,
            topics: trendingTopics,
            metadata: {
                timeframe: `${timeframe} hours`,
                discoveredAt: new Date().toISOString(),
                totalTopics: trendingTopics.length
            }
        });

    } catch (error) {
        logger.error('Trending topics discovery failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to discover trending topics',
            details: error.message
        });
    }
});

/**
 * POST /api/topics/enter/:topicId
 * Enter topic navigation mode
 */
router.post('/enter/:topicId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { topicId } = req.params;
        const { limit = 30 } = req.body;
        const userId = req.user!.id;

        const topicSession = await TopicDiscoveryService.enterTopicMode(
            topicId,
            userId,
            Number(limit)
        );

        // Store navigation state for this user
        userNavigationStates.set(userId, topicSession.navigationState);

        res.json({
            success: true,
            message: `Entered topic: ${topicSession.topicCluster.title}`,
            topic: {
                id: topicSession.topicCluster.id,
                title: topicSession.topicCluster.title,
                summary: topicSession.topicCluster.summary,
                prevailingPosition: topicSession.topicCluster.prevailingPosition,
                leadingCritique: topicSession.topicCluster.leadingCritique,
                participantCount: topicSession.topicCluster.participantCount,
                postCount: topicSession.topicCluster.postCount,
                category: topicSession.topicCluster.category,
                keyWords: topicSession.topicCluster.keyWords
            },
            posts: topicSession.filteredPosts,
            navigationMode: 'topic-filtered'
        });

    } catch (error) {
        logger.error('Failed to enter topic mode:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enter topic mode',
            details: error.message
        });
    }
});

/**
 * POST /api/topics/exit
 * Exit topic mode and return to algorithm-based feed
 */
router.post('/exit', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const navigationState = userNavigationStates.get(userId);

        if (!navigationState) {
            return res.status(400).json({
                success: false,
                error: 'User not in topic mode'
            });
        }

        const algorithmFeed = await TopicDiscoveryService.exitTopicMode(
            userId,
            navigationState
        );

        // Clear navigation state
        userNavigationStates.delete(userId);

        res.json({
            success: true,
            message: 'Exited topic mode, returned to algorithm feed',
            posts: algorithmFeed,
            navigationMode: 'algorithm-based'
        });

    } catch (error) {
        logger.error('Failed to exit topic mode:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to exit topic mode',
            details: error.message
        });
    }
});

/**
 * GET /api/topics/:topicId/posts
 * Get more posts for a specific topic (pagination)
 */
router.get('/:topicId/posts', async (req, res) => {
    try {
        const { topicId } = req.params;
        const { 
            offset = 0, 
            limit = 20 
        } = req.query;

        const topicPosts = await TopicDiscoveryService.getTopicPosts(
            topicId,
            Number(offset),
            Number(limit)
        );

        res.json({
            success: true,
            posts: topicPosts,
            pagination: {
                offset: Number(offset),
                limit: Number(limit),
                hasMore: topicPosts.length === Number(limit)
            }
        });

    } catch (error) {
        logger.error('Failed to get topic posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load topic posts',
            details: error.message
        });
    }
});

/**
 * GET /api/topics/current
 * Get current user's topic navigation state
 */
router.get('/current', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const navigationState = userNavigationStates.get(userId);

        if (!navigationState || !navigationState.activeTopic) {
            return res.json({
                success: true,
                navigationMode: 'algorithm-based',
                activeTopic: null
            });
        }

        res.json({
            success: true,
            navigationMode: 'topic-filtered',
            activeTopic: {
                id: navigationState.activeTopic.id,
                title: navigationState.activeTopic.title,
                summary: navigationState.activeTopic.summary,
                participantCount: navigationState.activeTopic.participantCount,
                postCount: navigationState.activeTopic.postCount
            }
        });

    } catch (error) {
        logger.error('Failed to get navigation state:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get navigation state'
        });
    }
});

/**
 * POST /api/topics/:topicId/post
 * Create a new post within topic context
 */
router.post('/:topicId/post', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { topicId } = req.params;
        const { content } = req.body;
        const userId = req.user!.id;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Post content is required'
            });
        }

        // This would integrate with your existing post creation endpoint
        // For now, return a success message indicating the post would be created
        // in the context of this topic
        
        res.json({
            success: true,
            message: `Post created in topic context: ${topicId}`,
            topicContext: topicId,
            // In real implementation, you'd create the post and return its data
            post: {
                content: content.trim(),
                topicContext: topicId,
                authorId: userId,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to create topic post:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create post in topic context'
        });
    }
});

export default router;