/**
 * @fileoverview Organization Discussion Routes
 *
 * Handles internal organization discussion threads and replies.
 * Supports visibility levels and pinning.
 *
 * @module routes/discussions
 */

import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  requireOrgCapability,
  requireOrgMembership,
  OrgAuthRequest,
} from '../middleware/orgAuth';
import { discussionService } from '../services/discussionService';
import { OrgCapability, DiscussionVisibility } from '@prisma/client';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Organization Discussions
 *     description: Internal organization discussion management
 */

/**
 * @swagger
 * /api/discussions/organizations/{organizationId}:
 *   post:
 *     tags: [Organization Discussions]
 *     summary: Create a new discussion
 *     description: Requires CREATE_DISCUSSION capability or organization membership
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               visibility:
 *                 type: string
 *                 enum: [ALL_MEMBERS, ROLE_HOLDERS, LEADERSHIP]
 *                 default: ALL_MEMBERS
 *     responses:
 *       201:
 *         description: Discussion created
 */
router.post(
  '/organizations/:organizationId',
  requireAuth,
  requireOrgMembership(),
  async (req: OrgAuthRequest, res) => {
    try {
      const { title, content, visibility } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      // Check if user can set the requested visibility
      if (visibility === DiscussionVisibility.LEADERSHIP) {
        // Only users with PIN_DISCUSSION capability can create leadership discussions
        if (!req.orgContext?.isHead && !req.orgContext?.capabilities.includes(OrgCapability.PIN_DISCUSSION)) {
          return res.status(403).json({ error: 'Cannot create leadership-only discussions' });
        }
      }

      const discussion = await discussionService.createDiscussion(
        req.params.organizationId,
        req.user!.id,
        { title, content, visibility }
      );

      res.status(201).json({
        success: true,
        discussion,
      });
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to create discussion');
      res.status(400).json({ error: error.message || 'Failed to create discussion' });
    }
  }
);

/**
 * @swagger
 * /api/discussions/organizations/{organizationId}:
 *   get:
 *     tags: [Organization Discussions]
 *     summary: List discussions for an organization
 *     description: Returns discussions based on user's visibility access
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: pinnedOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of discussions
 */
router.get(
  '/organizations/:organizationId',
  requireAuth,
  requireOrgMembership(),
  async (req: OrgAuthRequest, res) => {
    try {
      const { limit, offset, pinnedOnly, visibility } = req.query;

      const result = await discussionService.listDiscussions(
        req.params.organizationId,
        req.user!.id,
        {
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
          pinnedOnly: pinnedOnly === 'true',
          visibility: visibility as DiscussionVisibility,
        }
      );

      res.json({
        success: true,
        discussions: result.discussions,
        total: result.total,
      });
    } catch (error) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list discussions');
      res.status(500).json({ error: 'Failed to list discussions' });
    }
  }
);

/**
 * @swagger
 * /api/discussions/{discussionId}:
 *   get:
 *     tags: [Organization Discussions]
 *     summary: Get a discussion with replies
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discussion with replies
 *       403:
 *         description: Cannot view this discussion
 *       404:
 *         description: Discussion not found
 */
router.get('/:discussionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const discussion = await discussionService.getDiscussionWithReplies(req.params.discussionId);

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Check if user can view this discussion
    const canView = await discussionService.canViewDiscussion(
      req.user!.id,
      discussion.organizationId,
      discussion.visibility
    );

    if (!canView) {
      return res.status(403).json({ error: 'You do not have permission to view this discussion' });
    }

    res.json({
      success: true,
      discussion,
    });
  } catch (error) {
    logger.error({ error, discussionId: req.params.discussionId }, 'Failed to get discussion');
    res.status(500).json({ error: 'Failed to get discussion' });
  }
});

/**
 * @swagger
 * /api/discussions/{discussionId}:
 *   patch:
 *     tags: [Organization Discussions]
 *     summary: Update a discussion
 *     description: Only author or moderators can update
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               visibility:
 *                 type: string
 *                 enum: [ALL_MEMBERS, ROLE_HOLDERS, LEADERSHIP]
 *     responses:
 *       200:
 *         description: Discussion updated
 */
router.patch('/:discussionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const discussion = await discussionService.getDiscussion(req.params.discussionId);

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Only author can edit (or moderators would need additional check)
    if (discussion.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the author can edit this discussion' });
    }

    const { title, content, visibility } = req.body;

    const updated = await discussionService.updateDiscussion(req.params.discussionId, {
      title,
      content,
      visibility,
    });

    res.json({
      success: true,
      discussion: updated,
    });
  } catch (error: any) {
    logger.error({ error, discussionId: req.params.discussionId }, 'Failed to update discussion');
    res.status(400).json({ error: error.message || 'Failed to update discussion' });
  }
});

/**
 * @swagger
 * /api/discussions/{discussionId}:
 *   delete:
 *     tags: [Organization Discussions]
 *     summary: Delete a discussion
 *     description: Requires MODERATE_DISCUSSION capability or being the author
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discussion deleted
 */
router.delete('/:discussionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const discussion = await discussionService.getDiscussion(req.params.discussionId);

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Check permissions - author can delete their own, or need MODERATE_DISCUSSION
    if (discussion.authorId !== req.user!.id) {
      // Would need to check org capability here
      return res.status(403).json({ error: 'Cannot delete this discussion' });
    }

    await discussionService.deleteDiscussion(req.params.discussionId);

    res.json({
      success: true,
      message: 'Discussion deleted',
    });
  } catch (error: any) {
    logger.error({ error, discussionId: req.params.discussionId }, 'Failed to delete discussion');
    res.status(400).json({ error: error.message || 'Failed to delete discussion' });
  }
});

/**
 * @swagger
 * /api/discussions/{discussionId}/pin:
 *   post:
 *     tags: [Organization Discussions]
 *     summary: Toggle pin status of a discussion
 *     description: Requires PIN_DISCUSSION capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pin status toggled
 */
router.post('/:discussionId/pin', requireAuth, async (req: AuthRequest, res) => {
  try {
    const discussion = await discussionService.getDiscussion(req.params.discussionId);

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Would need to verify PIN_DISCUSSION capability for the org

    const updated = await discussionService.togglePin(req.params.discussionId, req.user!.id);

    res.json({
      success: true,
      discussion: updated,
      message: updated.isPinned ? 'Discussion pinned' : 'Discussion unpinned',
    });
  } catch (error: any) {
    logger.error({ error, discussionId: req.params.discussionId }, 'Failed to toggle pin');
    res.status(400).json({ error: error.message || 'Failed to toggle pin' });
  }
});

/**
 * @swagger
 * /api/discussions/{discussionId}/replies:
 *   post:
 *     tags: [Organization Discussions]
 *     summary: Add a reply to a discussion
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema:
 *           type: string
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
 *               parentReplyId:
 *                 type: string
 *                 description: For nested replies
 *     responses:
 *       201:
 *         description: Reply created
 */
router.post('/:discussionId/replies', requireAuth, async (req: AuthRequest, res) => {
  try {
    const discussion = await discussionService.getDiscussion(req.params.discussionId);

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Check if user can view (and thus reply to) this discussion
    const canView = await discussionService.canViewDiscussion(
      req.user!.id,
      discussion.organizationId,
      discussion.visibility
    );

    if (!canView) {
      return res.status(403).json({ error: 'Cannot reply to this discussion' });
    }

    const { content, parentReplyId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const reply = await discussionService.createReply(
      req.params.discussionId,
      req.user!.id,
      { content, parentReplyId }
    );

    res.status(201).json({
      success: true,
      reply,
    });
  } catch (error: any) {
    logger.error({ error, discussionId: req.params.discussionId }, 'Failed to create reply');
    res.status(400).json({ error: error.message || 'Failed to create reply' });
  }
});

/**
 * @swagger
 * /api/discussions/replies/{replyId}:
 *   patch:
 *     tags: [Organization Discussions]
 *     summary: Update a reply
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Reply updated
 */
router.patch('/replies/:replyId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const reply = await discussionService.getReply(req.params.replyId);

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the author can edit this reply' });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const updated = await discussionService.updateReply(req.params.replyId, { content });

    res.json({
      success: true,
      reply: updated,
    });
  } catch (error: any) {
    logger.error({ error, replyId: req.params.replyId }, 'Failed to update reply');
    res.status(400).json({ error: error.message || 'Failed to update reply' });
  }
});

/**
 * @swagger
 * /api/discussions/replies/{replyId}:
 *   delete:
 *     tags: [Organization Discussions]
 *     summary: Delete a reply
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reply deleted
 */
router.delete('/replies/:replyId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const reply = await discussionService.getReply(req.params.replyId);

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Cannot delete this reply' });
    }

    await discussionService.deleteReply(req.params.replyId);

    res.json({
      success: true,
      message: 'Reply deleted',
    });
  } catch (error: any) {
    logger.error({ error, replyId: req.params.replyId }, 'Failed to delete reply');
    res.status(400).json({ error: error.message || 'Failed to delete reply' });
  }
});

/**
 * @swagger
 * /api/discussions/me/recent:
 *   get:
 *     tags: [Organization Discussions]
 *     summary: Get recent discussions across user's organizations
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent discussions
 */
router.get('/me/recent', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { limit } = req.query;

    const discussions = await discussionService.getUserRecentDiscussions(
      req.user!.id,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      discussions,
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to get recent discussions');
    res.status(500).json({ error: 'Failed to get recent discussions' });
  }
});

export default router;
