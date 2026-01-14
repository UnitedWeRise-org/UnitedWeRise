/**
 * @fileoverview Questionnaire Routes
 *
 * Handles endorsement questionnaire creation and management.
 * Organizations create questionnaires that candidates fill out.
 *
 * @module routes/questionnaires
 */

import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  requireOrgCapability,
  OrgAuthRequest,
} from '../middleware/orgAuth';
import { questionnaireService } from '../services/questionnaireService';
import { OrgCapability } from '@prisma/client';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Questionnaires
 *     description: Endorsement questionnaire management
 */

/**
 * @swagger
 * /api/questionnaires/organizations/{organizationId}:
 *   post:
 *     tags: [Questionnaires]
 *     summary: Create a new questionnaire
 *     description: Requires MANAGE_QUESTIONNAIRE capability
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
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - text
 *                     - type
 *                     - displayOrder
 *                   properties:
 *                     text:
 *                       type: string
 *                     description:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [SHORT_TEXT, LONG_TEXT, MULTIPLE_CHOICE, CHECKBOX, YES_NO, SCALE]
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     isRequired:
 *                       type: boolean
 *                       default: true
 *                     isPublic:
 *                       type: boolean
 *                       default: true
 *                     displayOrder:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Questionnaire created
 */
router.post(
  '/organizations/:organizationId',
  requireAuth,
  requireOrgCapability(OrgCapability.MANAGE_QUESTIONNAIRE),
  async (req: OrgAuthRequest, res) => {
    try {
      const { title, description, questions } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required' });
      }

      const questionnaire = await questionnaireService.createQuestionnaire(
        req.params.organizationId,
        req.user!.id,
        { title, description, questions }
      );

      res.status(201).json({
        success: true,
        questionnaire,
      });
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to create questionnaire');
      res.status(400).json({ error: error.message || 'Failed to create questionnaire' });
    }
  }
);

/**
 * @swagger
 * /api/questionnaires/organizations/{organizationId}:
 *   get:
 *     tags: [Questionnaires]
 *     summary: List questionnaires for an organization
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: List of questionnaires
 */
router.get('/organizations/:organizationId', async (req, res) => {
  try {
    const { includeInactive } = req.query;

    const questionnaires = await questionnaireService.listQuestionnaires(
      req.params.organizationId,
      { includeInactive: includeInactive === 'true' }
    );

    res.json({
      success: true,
      questionnaires,
    });
  } catch (error) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list questionnaires');
    res.status(500).json({ error: 'Failed to list questionnaires' });
  }
});

/**
 * @swagger
 * /api/questionnaires/{questionnaireId}:
 *   get:
 *     tags: [Questionnaires]
 *     summary: Get a questionnaire by ID
 *     parameters:
 *       - in: path
 *         name: questionnaireId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Questionnaire details
 *       404:
 *         description: Questionnaire not found
 */
router.get('/:questionnaireId', async (req, res) => {
  try {
    const questionnaire = await questionnaireService.getQuestionnaire(req.params.questionnaireId);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    res.json({
      success: true,
      questionnaire,
    });
  } catch (error) {
    logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to get questionnaire');
    res.status(500).json({ error: 'Failed to get questionnaire' });
  }
});

/**
 * @swagger
 * /api/questionnaires/{questionnaireId}/apply:
 *   get:
 *     tags: [Questionnaires]
 *     summary: Get questionnaire for application (candidate view)
 *     description: Returns questionnaire with questions for a candidate to fill out
 *     parameters:
 *       - in: path
 *         name: questionnaireId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Questionnaire for application
 *       404:
 *         description: Questionnaire not found or inactive
 */
router.get('/:questionnaireId/apply', async (req, res) => {
  try {
    const questionnaire = await questionnaireService.getQuestionnaireForApplication(
      req.params.questionnaireId
    );

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found or inactive' });
    }

    res.json({
      success: true,
      questionnaire,
    });
  } catch (error) {
    logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to get questionnaire for application');
    res.status(500).json({ error: 'Failed to get questionnaire' });
  }
});

/**
 * @swagger
 * /api/questionnaires/{questionnaireId}:
 *   patch:
 *     tags: [Questionnaires]
 *     summary: Update questionnaire metadata
 *     description: Requires MANAGE_QUESTIONNAIRE capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionnaireId
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
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Questionnaire updated
 */
router.patch('/:questionnaireId', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Get questionnaire to check org permissions
    const questionnaire = await questionnaireService.getQuestionnaire(req.params.questionnaireId);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Would need to verify MANAGE_QUESTIONNAIRE capability for the org

    const { title, description, isActive } = req.body;

    const updated = await questionnaireService.updateQuestionnaire(req.params.questionnaireId, {
      title,
      description,
      isActive,
    });

    res.json({
      success: true,
      questionnaire: updated,
    });
  } catch (error: any) {
    logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to update questionnaire');
    res.status(400).json({ error: error.message || 'Failed to update questionnaire' });
  }
});

/**
 * @swagger
 * /api/questionnaires/{questionnaireId}:
 *   delete:
 *     tags: [Questionnaires]
 *     summary: Delete a questionnaire
 *     description: Only possible if no applications exist. Requires MANAGE_QUESTIONNAIRE capability.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionnaireId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Questionnaire deleted
 *       400:
 *         description: Cannot delete questionnaire with applications
 */
router.delete('/:questionnaireId', requireAuth, async (req: AuthRequest, res) => {
  try {
    await questionnaireService.deleteQuestionnaire(req.params.questionnaireId);

    res.json({
      success: true,
      message: 'Questionnaire deleted',
    });
  } catch (error: any) {
    logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to delete questionnaire');
    res.status(400).json({ error: error.message || 'Failed to delete questionnaire' });
  }
});

/**
 * @swagger
 * /api/questionnaires/{questionnaireId}/questions:
 *   post:
 *     tags: [Questionnaires]
 *     summary: Add a question to a questionnaire
 *     description: Requires MANAGE_QUESTIONNAIRE capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionnaireId
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
 *               - text
 *               - type
 *               - displayOrder
 *             properties:
 *               text:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [SHORT_TEXT, LONG_TEXT, MULTIPLE_CHOICE, CHECKBOX, YES_NO, SCALE]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               isRequired:
 *                 type: boolean
 *               isPublic:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Question added
 */
router.post('/:questionnaireId/questions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text, description, type, options, isRequired, isPublic, displayOrder } = req.body;

    if (!text || !type || displayOrder === undefined) {
      return res.status(400).json({ error: 'text, type, and displayOrder are required' });
    }

    const question = await questionnaireService.addQuestion(req.params.questionnaireId, {
      text,
      description,
      type,
      options,
      isRequired,
      isPublic,
      displayOrder,
    });

    res.status(201).json({
      success: true,
      question,
    });
  } catch (error: any) {
    logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to add question');
    res.status(400).json({ error: error.message || 'Failed to add question' });
  }
});

/**
 * @swagger
 * /api/questionnaires/questions/{questionId}:
 *   patch:
 *     tags: [Questionnaires]
 *     summary: Update a question
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               isRequired:
 *                 type: boolean
 *               isPublic:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Question updated
 */
router.patch('/questions/:questionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text, description, type, options, isRequired, isPublic, displayOrder } = req.body;

    const question = await questionnaireService.updateQuestion(req.params.questionId, {
      text,
      description,
      type,
      options,
      isRequired,
      isPublic,
      displayOrder,
    });

    res.json({
      success: true,
      question,
    });
  } catch (error: any) {
    logger.error({ error, questionId: req.params.questionId }, 'Failed to update question');
    res.status(400).json({ error: error.message || 'Failed to update question' });
  }
});

/**
 * @swagger
 * /api/questionnaires/questions/{questionId}:
 *   delete:
 *     tags: [Questionnaires]
 *     summary: Delete a question
 *     description: Only possible if questionnaire has no applications
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question deleted
 */
router.delete('/questions/:questionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    await questionnaireService.deleteQuestion(req.params.questionId);

    res.json({
      success: true,
      message: 'Question deleted',
    });
  } catch (error: any) {
    logger.error({ error, questionId: req.params.questionId }, 'Failed to delete question');
    res.status(400).json({ error: error.message || 'Failed to delete question' });
  }
});

/**
 * @swagger
 * /api/questionnaires/{questionnaireId}/reorder:
 *   post:
 *     tags: [Questionnaires]
 *     summary: Reorder questions
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionnaireId
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
 *               - questionOrders
 *             properties:
 *               questionOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     displayOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Questions reordered
 */
router.post('/:questionnaireId/reorder', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { questionOrders } = req.body;

    if (!questionOrders || !Array.isArray(questionOrders)) {
      return res.status(400).json({ error: 'questionOrders array is required' });
    }

    await questionnaireService.reorderQuestions(req.params.questionnaireId, questionOrders);

    res.json({
      success: true,
      message: 'Questions reordered',
    });
  } catch (error: any) {
    logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to reorder questions');
    res.status(400).json({ error: error.message || 'Failed to reorder questions' });
  }
});

/**
 * @swagger
 * /api/questionnaires/candidates/{candidateId}/available:
 *   get:
 *     tags: [Questionnaires]
 *     summary: Get questionnaires available to a candidate
 *     description: Returns questionnaires from organizations with jurisdiction over the candidate
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available questionnaires
 */
router.get('/candidates/:candidateId/available', async (req, res) => {
  try {
    const questionnaires = await questionnaireService.getQuestionnairesForCandidate(
      req.params.candidateId
    );

    res.json({
      success: true,
      questionnaires,
    });
  } catch (error) {
    logger.error({ error, candidateId: req.params.candidateId }, 'Failed to get available questionnaires');
    res.status(500).json({ error: 'Failed to get available questionnaires' });
  }
});

export default router;
