import { prisma } from '../lib/prisma';
/**
 * Reputation API Routes
 * 
 * Handles reputation scores, content warnings, reports, and appeals
 */

import express from 'express';
;
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { reputationService } from '../services/reputationService';
import logger from '../utils/logger';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

// Get user's reputation score
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const reputation = await reputationService.getUserReputation(userId);
    
    res.json({
      userId,
      reputation
    });
  } catch (error) {
    logger.error('Failed to get user reputation:', error);
    res.status(500).json({ error: 'Failed to get reputation' });
  }
});

// Get current user's reputation
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const reputation = await reputationService.getUserReputation(userId);
    
    res.json({
      reputation
    });
  } catch (error) {
    logger.error('Failed to get current user reputation:', error);
    res.status(500).json({ error: 'Failed to get reputation' });
  }
});

// Get reputation history/events
router.get('/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());
    
    const events = await prisma.reputationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum
    });
    
    res.json({
      events,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: events.length
      }
    });
  } catch (error) {
    logger.error('Failed to get reputation history:', error);
    res.status(500).json({ error: 'Failed to get reputation history' });
  }
});

// Generate content warning for pre-post analysis
router.post('/analyze', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const userId = req.user!.id;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const warning = await reputationService.generateContentWarning(content, userId);
    
    res.json(warning);
  } catch (error) {
    logger.error('Failed to analyze content:', error);
    res.status(500).json({ error: 'Failed to analyze content' });
  }
});

// Submit a community report
router.post('/report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetUserId, postId, reason, content } = req.body;
    const reporterId = req.user!.id;
    
    if (!targetUserId || !postId || !reason || !content) {
      return res.status(400).json({ 
        error: 'Target user, post ID, reason, and content are required' 
      });
    }
    
    // Prevent self-reporting
    if (reporterId === targetUserId) {
      return res.status(400).json({ error: 'Cannot report your own content' });
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (post.authorId !== targetUserId) {
      return res.status(400).json({ error: 'Post does not belong to target user' });
    }
    
    // Rate limit: Check if user has already reported this post
    const existingReport = await prisma.reputationEvent.findFirst({
      where: {
        userId: targetUserId,
        postId: postId,
        reason: { startsWith: 'community_report_' },
        details: {
          path: ['reporterId'],
          equals: reporterId
        }
      }
    });
    
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }
    
    const result = await reputationService.processReport(
      reporterId,
      targetUserId,
      postId,
      reason,
      post.content
    );
    
    if (result.accepted) {
      res.json({
        message: 'Report submitted and validated',
        penalty: result.penalty
      });
    } else {
      res.json({
        message: 'Report submitted but not validated by AI analysis'
      });
    }
  } catch (error) {
    logger.error('Failed to process report:', error);
    res.status(500).json({ error: 'Failed to process report' });
  }
});

// Submit appeal for reputation penalty
router.post('/appeal', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { eventId, reason } = req.body;
    const userId = req.user!.id;
    
    if (!eventId || !reason) {
      return res.status(400).json({ 
        error: 'Event ID and appeal reason are required' 
      });
    }
    
    if (reason.length < 10 || reason.length > 500) {
      return res.status(400).json({ 
        error: 'Appeal reason must be between 10 and 500 characters' 
      });
    }
    
    const result = await reputationService.processAppeal(
      userId,
      eventId,
      reason
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to process appeal:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Reputation event not found' });
    } else {
      res.status(500).json({ error: 'Failed to process appeal' });
    }
  }
});

// Award reputation manually (admin only)
router.post('/award', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, reason, postId } = req.body;
    
    if (!userId || !reason) {
      return res.status(400).json({ 
        error: 'User ID and reason are required' 
      });
    }
    
    const validReasons = ['quality_post', 'constructive', 'helpful', 'positive_feedback'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ 
        error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` 
      });
    }
    
    const result = await reputationService.awardReputation(userId, reason, postId);
    
    res.json({
      message: 'Reputation awarded successfully',
      reputation: result
    });
  } catch (error) {
    logger.error('Failed to award reputation:', error);
    res.status(500).json({ error: 'Failed to award reputation' });
  }
});

// Get reputation statistics (admin only)
router.get('/stats', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Get reputation distribution
    const reputationDistribution = await prisma.user.groupBy({
      by: ['reputationScore'],
      _count: { reputationScore: true },
      where: {
        reputationScore: { not: null }
      }
    });
    
    // Get recent events
    const recentEvents = await prisma.reputationEvent.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        eventType: true,
        reason: true,
        impact: true
      }
    });
    
    // Calculate tier distribution
    const tierDistribution = {
      boosted: reputationDistribution.filter(r => (r.reputationScore || 0) >= 95).reduce((sum, r) => sum + r._count.reputationScore, 0),
      normal: reputationDistribution.filter(r => (r.reputationScore || 0) >= 50 && (r.reputationScore || 0) < 95).reduce((sum, r) => sum + r._count.reputationScore, 0),
      suppressed: reputationDistribution.filter(r => (r.reputationScore || 0) >= 30 && (r.reputationScore || 0) < 50).reduce((sum, r) => sum + r._count.reputationScore, 0),
      heavily_suppressed: reputationDistribution.filter(r => (r.reputationScore || 0) < 30).reduce((sum, r) => sum + r._count.reputationScore, 0)
    };
    
    const totalUsers = Object.values(tierDistribution).reduce((sum, count) => sum + count, 0);
    
    res.json({
      timeframe,
      totalUsers,
      tierDistribution,
      tierPercentages: {
        boosted: totalUsers > 0 ? (tierDistribution.boosted / totalUsers * 100).toFixed(1) : '0.0',
        normal: totalUsers > 0 ? (tierDistribution.normal / totalUsers * 100).toFixed(1) : '0.0',
        suppressed: totalUsers > 0 ? (tierDistribution.suppressed / totalUsers * 100).toFixed(1) : '0.0',
        heavily_suppressed: totalUsers > 0 ? (tierDistribution.heavily_suppressed / totalUsers * 100).toFixed(1) : '0.0'
      },
      recentEvents: recentEvents.map(event => ({
        type: event.eventType,
        reason: event.reason,
        impact: event.impact
      })),
      averageScore: reputationDistribution.length > 0 
        ? (reputationDistribution.reduce((sum, r) => sum + (r.reputationScore || 0) * r._count.reputationScore, 0) / totalUsers).toFixed(1)
        : '70.0'
    });
  } catch (error) {
    logger.error('Failed to get reputation stats:', error);
    res.status(500).json({ error: 'Failed to get reputation stats' });
  }
});

// Get low reputation users for admin review (admin only)
router.get('/low-reputation', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { threshold = 30, limit = 20 } = req.query;
    
    const thresholdNum = parseInt(threshold.toString());
    const limitNum = parseInt(limit.toString());
    
    const users = await prisma.user.findMany({
      where: {
        reputationScore: { lt: thresholdNum }
      },
      select: {
        id: true,
        username: true,
        email: true,
        reputationScore: true,
        reputationUpdatedAt: true,
        createdAt: true
      },
      orderBy: { reputationScore: 'asc' },
      take: limitNum
    });
    
    // Get recent events for each user
    const usersWithEvents = await Promise.all(
      users.map(async (user) => {
        const recentEvents = await prisma.reputationEvent.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
        
        return {
          ...user,
          recentEvents
        };
      })
    );
    
    res.json({
      threshold: thresholdNum,
      users: usersWithEvents
    });
  } catch (error) {
    logger.error('Failed to get low reputation users:', error);
    res.status(500).json({ error: 'Failed to get low reputation users' });
  }
});

// Health check endpoint for reputation system
router.get('/health', async (req, res) => {
  try {
    // Test reputation system functionality
    const eventCount = await prisma.reputationEvent.count();
    const userCount = await prisma.user.count({
      where: {
        reputationScore: { not: null }
      }
    });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'reputation_scoring',
        'ai_analysis',
        'appeals_system',
        'community_reporting'
      ],
      statistics: {
        totalEvents: eventCount,
        usersWithScores: userCount
      },
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;