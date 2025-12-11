/**
 * RiseAI API Routes
 *
 * Endpoints for the @RiseAI mention system, argument ledger,
 * and fact claim management.
 */

import express from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { RiseAIMentionService } from '../services/riseAIMentionService';
import { RiseAIAgentService } from '../services/riseAIAgentService';
import { ArgumentLedgerService } from '../services/argumentLedgerService';
import { FactClaimService } from '../services/factClaimService';
import logger from '../utils/logger';

const router = express.Router();

// ==========================================
// RiseAI Core Endpoints
// ==========================================

/**
 * Trigger RiseAI analysis on a post
 * POST /api/riseai/analyze
 */
router.post('/analyze', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { postId, commentId, content } = req.body;
    const userId = req.user!.id;

    if (!postId || !content) {
      return res.status(400).json({ error: 'postId and content are required' });
    }

    // Process the mention
    const result = await RiseAIMentionService.processMention({
      postId,
      commentId,
      userId,
      content
    });

    if (!result.success) {
      return res.status(result.rateLimitInfo ? 429 : 400).json({
        error: result.error,
        rateLimitInfo: result.rateLimitInfo
      });
    }

    // Process the interaction asynchronously
    // Start processing but don't wait
    RiseAIAgentService.processInteraction(result.interactionId!).catch(err => {
      logger.error('Background interaction processing failed', { err, interactionId: result.interactionId });
    });

    return res.status(202).json({
      message: 'Analysis started',
      interactionId: result.interactionId,
      rateLimitInfo: result.rateLimitInfo
    });
  } catch (error) {
    logger.error('RiseAI analyze endpoint failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get interaction status/result
 * GET /api/riseai/interaction/:id
 */
router.get('/interaction/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const interaction = await RiseAIMentionService.getInteraction(req.params.id);

    if (!interaction) {
      return res.status(404).json({ error: 'Interaction not found' });
    }

    return res.json(interaction);
  } catch (error) {
    logger.error('Get interaction failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's RiseAI interactions
 * GET /api/riseai/my-interactions
 */
router.get('/my-interactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const interactions = await RiseAIMentionService.getUserInteractions(req.user!.id, limit);
    return res.json(interactions);
  } catch (error) {
    logger.error('Get user interactions failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get rate limit status
 * GET /api/riseai/rate-limit
 */
router.get('/rate-limit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rateLimitInfo = await RiseAIMentionService.checkRateLimit(req.user!.id);
    return res.json(rateLimitInfo);
  } catch (error) {
    logger.error('Get rate limit failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get RiseAI settings (public portion)
 * GET /api/riseai/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await RiseAIMentionService.getSettings();
    return res.json({
      isEnabled: settings.isEnabled,
      dailyLimitNonAdmin: settings.dailyLimitNonAdmin
    });
  } catch (error) {
    logger.error('Get settings failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Admin Endpoints
// ==========================================

/**
 * Update RiseAI settings (admin only)
 * PUT /api/riseai/admin/settings
 */
router.put('/admin/settings', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { dailyLimitNonAdmin, dailyLimitAdmin, confidenceThreshold, isEnabled } = req.body;

    const settings = await RiseAIMentionService.updateSettings(req.user!.id, {
      dailyLimitNonAdmin,
      dailyLimitAdmin,
      confidenceThreshold,
      isEnabled
    });

    logger.info('RiseAI settings updated', { adminId: req.user!.id, settings });
    return res.json(settings);
  } catch (error) {
    logger.error('Update settings failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get full admin settings
 * GET /api/riseai/admin/settings
 */
router.get('/admin/settings', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const settings = await RiseAIMentionService.getSettings();
    return res.json(settings);
  } catch (error) {
    logger.error('Get admin settings failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Argument Ledger Endpoints
// ==========================================

/**
 * Get top arguments
 * GET /api/riseai/arguments
 */
router.get('/arguments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const arguments_ = await ArgumentLedgerService.getTopArguments(limit);
    return res.json(arguments_);
  } catch (error) {
    logger.error('Get arguments failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get argument by ID
 * GET /api/riseai/arguments/:id
 */
router.get('/arguments/:id', async (req, res) => {
  try {
    const argument = await ArgumentLedgerService.getArgument(req.params.id);

    if (!argument) {
      return res.status(404).json({ error: 'Argument not found' });
    }

    return res.json(argument);
  } catch (error) {
    logger.error('Get argument failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get arguments for a post
 * GET /api/riseai/posts/:postId/arguments
 */
router.get('/posts/:postId/arguments', async (req, res) => {
  try {
    const arguments_ = await ArgumentLedgerService.getPostArguments(req.params.postId);
    return res.json(arguments_);
  } catch (error) {
    logger.error('Get post arguments failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Support an argument
 * POST /api/riseai/arguments/:id/support
 */
router.post('/arguments/:id/support', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await ArgumentLedgerService.supportArgument(
      req.params.id,
      req.user!.id
    );
    return res.json(result);
  } catch (error) {
    logger.error('Support argument failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Refute an argument
 * POST /api/riseai/arguments/:id/refute
 */
router.post('/arguments/:id/refute', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await ArgumentLedgerService.refuteArgument(
      req.params.id,
      req.user!.id
    );
    return res.json(result);
  } catch (error) {
    logger.error('Refute argument failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Fact Claim Endpoints
// ==========================================

/**
 * Search facts
 * GET /api/riseai/facts
 */
router.get('/facts', async (req, res) => {
  try {
    const { query, limit = '10' } = req.query;

    if (query) {
      const facts = await FactClaimService.searchFacts(query as string, parseInt(limit as string));
      return res.json(facts);
    }

    const facts = await FactClaimService.getEstablishedFacts(0.5, parseInt(limit as string));
    return res.json(facts);
  } catch (error) {
    logger.error('Search facts failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get fact by ID
 * GET /api/riseai/facts/:id
 */
router.get('/facts/:id', async (req, res) => {
  try {
    const fact = await FactClaimService.getFact(req.params.id);

    if (!fact) {
      return res.status(404).json({ error: 'Fact not found' });
    }

    return res.json(fact);
  } catch (error) {
    logger.error('Get fact failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Challenge a fact
 * POST /api/riseai/facts/:id/challenge
 */
router.post('/facts/:id/challenge', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const result = await FactClaimService.challengeFact(req.params.id, reason);
    return res.json(result);
  } catch (error) {
    logger.error('Challenge fact failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Cite a fact
 * POST /api/riseai/facts/:id/cite
 */
router.post('/facts/:id/cite', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.body;
    const result = await FactClaimService.citeFact(req.params.id, postId);
    return res.json(result);
  } catch (error) {
    logger.error('Cite fact failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
