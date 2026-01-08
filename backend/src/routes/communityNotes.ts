/**
 * Community Notes API Routes
 *
 * Endpoints for the Community Notes system (similar to Twitter/X).
 * Features reputation-weighted voting, auto-display thresholds, and appeals.
 */

import express from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { CommunityNotesService } from '../services/communityNotesService';
import logger from '../utils/logger';
import { safePaginationParams } from '../utils/safeJson';

const router = express.Router();

// ==========================================
// Note CRUD Operations
// ==========================================

/**
 * Create a new community note
 * POST /api/community-notes
 */
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { postId, factClaimId, content, noteType, confidenceImpact } = req.body;
    const authorId = req.user!.id;

    if (!content || !noteType) {
      return res.status(400).json({ error: 'content and noteType are required' });
    }

    if (!postId && !factClaimId) {
      return res.status(400).json({ error: 'Either postId or factClaimId is required' });
    }

    const validTypes = ['correction', 'context', 'source', 'clarification', 'outdated'];
    if (!validTypes.includes(noteType)) {
      return res.status(400).json({ error: `noteType must be one of: ${validTypes.join(', ')}` });
    }

    const note = await CommunityNotesService.createNote({
      authorId,
      content,
      noteType,
      postId,
      factClaimId,
      confidenceImpact
    });

    logger.info('Community note created', { noteId: note.id, authorId });
    return res.status(201).json(note);
  } catch (error) {
    logger.error('Create community note failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a community note by ID
 * GET /api/community-notes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const note = await CommunityNotesService.getNote(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json(note);
  } catch (error) {
    logger.error('Get community note failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get notes for a post
 * GET /api/community-notes/post/:postId
 */
router.get('/post/:postId', async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const notes = await CommunityNotesService.getPostNotes(req.params.postId, includeHidden);
    return res.json(notes);
  } catch (error) {
    logger.error('Get post notes failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get notes for a fact claim
 * GET /api/community-notes/fact/:factClaimId
 */
router.get('/fact/:factClaimId', async (req, res) => {
  try {
    const notes = await CommunityNotesService.getFactNotes(req.params.factClaimId);
    return res.json(notes);
  } catch (error) {
    logger.error('Get fact notes failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Voting
// ==========================================

/**
 * Vote on a community note
 * POST /api/community-notes/:id/vote
 */
router.post('/:id/vote', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { isHelpful } = req.body;
    const voterId = req.user!.id;
    const noteId = req.params.id;

    if (typeof isHelpful !== 'boolean') {
      return res.status(400).json({ error: 'isHelpful must be a boolean' });
    }

    const result = await CommunityNotesService.voteOnNote(noteId, voterId, isHelpful);

    logger.info('Community note vote recorded', { noteId, voterId, isHelpful, shouldDisplay: result.shouldDisplay });
    return res.json(result);
  } catch (error) {
    logger.error('Vote on note failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Appeals
// ==========================================

/**
 * Appeal a community note (original poster only)
 * POST /api/community-notes/:id/appeal
 */
router.post('/:id/appeal', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const appealerId = req.user!.id;
    const noteId = req.params.id;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required' });
    }

    const result = await CommunityNotesService.appealNote(noteId, appealerId, reason);

    logger.info('Community note appealed', { noteId, appealerId });
    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Only the original poster')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('only appeal')) {
        return res.status(400).json({ error: error.message });
      }
    }
    logger.error('Appeal note failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Resolve an appeal (admin only)
 * POST /api/community-notes/:id/resolve-appeal
 */
router.post('/:id/resolve-appeal', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { upheld, reason } = req.body;
    const adminId = req.user!.id;
    const noteId = req.params.id;

    if (typeof upheld !== 'boolean' || !reason) {
      return res.status(400).json({ error: 'upheld (boolean) and reason are required' });
    }

    const result = await CommunityNotesService.resolveAppeal(noteId, adminId, upheld, reason);

    logger.info('Community note appeal resolved', { noteId, adminId, upheld });
    return res.json(result);
  } catch (error) {
    logger.error('Resolve appeal failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get pending appeals (admin only)
 * GET /api/community-notes/admin/pending-appeals
 */
router.get('/admin/pending-appeals', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const appeals = await CommunityNotesService.getPendingAppeals();
    return res.json(appeals);
  } catch (error) {
    logger.error('Get pending appeals failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// User History
// ==========================================

/**
 * Get user's authored notes
 * GET /api/community-notes/user/notes
 */
router.get('/user/notes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { limit } = safePaginationParams(req.query.limit as string | undefined, undefined);
    const notes = await CommunityNotesService.getUserNotes(req.user!.id, limit);
    return res.json(notes);
  } catch (error) {
    logger.error('Get user notes failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's vote history
 * GET /api/community-notes/user/votes
 */
router.get('/user/votes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { limit } = safePaginationParams(req.query.limit as string | undefined, undefined);
    const votes = await CommunityNotesService.getUserVotes(req.user!.id, limit);
    return res.json(votes);
  } catch (error) {
    logger.error('Get user votes failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
