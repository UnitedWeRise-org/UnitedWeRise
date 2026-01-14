"use strict";
/**
 * @fileoverview Questionnaire Routes
 *
 * Handles endorsement questionnaire creation and management.
 * Organizations create questionnaires that candidates fill out.
 *
 * @module routes/questionnaires
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const orgAuth_1 = require("../middleware/orgAuth");
const questionnaireService_1 = require("../services/questionnaireService");
const client_1 = require("@prisma/client");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
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
router.post('/organizations/:organizationId', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.MANAGE_QUESTIONNAIRE), async (req, res) => {
    try {
        const { title, description, questions } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'At least one question is required' });
        }
        const questionnaire = await questionnaireService_1.questionnaireService.createQuestionnaire(req.params.organizationId, req.user.id, { title, description, questions });
        res.status(201).json({
            success: true,
            questionnaire,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to create questionnaire');
        res.status(400).json({ error: error.message || 'Failed to create questionnaire' });
    }
});
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
        const questionnaires = await questionnaireService_1.questionnaireService.listQuestionnaires(req.params.organizationId, { includeInactive: includeInactive === 'true' });
        res.json({
            success: true,
            questionnaires,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list questionnaires');
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
        const questionnaire = await questionnaireService_1.questionnaireService.getQuestionnaire(req.params.questionnaireId);
        if (!questionnaire) {
            return res.status(404).json({ error: 'Questionnaire not found' });
        }
        res.json({
            success: true,
            questionnaire,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to get questionnaire');
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
        const questionnaire = await questionnaireService_1.questionnaireService.getQuestionnaireForApplication(req.params.questionnaireId);
        if (!questionnaire) {
            return res.status(404).json({ error: 'Questionnaire not found or inactive' });
        }
        res.json({
            success: true,
            questionnaire,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to get questionnaire for application');
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
router.patch('/:questionnaireId', auth_1.requireAuth, async (req, res) => {
    try {
        // Get questionnaire to check org permissions
        const questionnaire = await questionnaireService_1.questionnaireService.getQuestionnaire(req.params.questionnaireId);
        if (!questionnaire) {
            return res.status(404).json({ error: 'Questionnaire not found' });
        }
        // Would need to verify MANAGE_QUESTIONNAIRE capability for the org
        const { title, description, isActive } = req.body;
        const updated = await questionnaireService_1.questionnaireService.updateQuestionnaire(req.params.questionnaireId, {
            title,
            description,
            isActive,
        });
        res.json({
            success: true,
            questionnaire: updated,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to update questionnaire');
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
router.delete('/:questionnaireId', auth_1.requireAuth, async (req, res) => {
    try {
        await questionnaireService_1.questionnaireService.deleteQuestionnaire(req.params.questionnaireId);
        res.json({
            success: true,
            message: 'Questionnaire deleted',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to delete questionnaire');
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
router.post('/:questionnaireId/questions', auth_1.requireAuth, async (req, res) => {
    try {
        const { text, description, type, options, isRequired, isPublic, displayOrder } = req.body;
        if (!text || !type || displayOrder === undefined) {
            return res.status(400).json({ error: 'text, type, and displayOrder are required' });
        }
        const question = await questionnaireService_1.questionnaireService.addQuestion(req.params.questionnaireId, {
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
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to add question');
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
router.patch('/questions/:questionId', auth_1.requireAuth, async (req, res) => {
    try {
        const { text, description, type, options, isRequired, isPublic, displayOrder } = req.body;
        const question = await questionnaireService_1.questionnaireService.updateQuestion(req.params.questionId, {
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
    }
    catch (error) {
        logger_1.logger.error({ error, questionId: req.params.questionId }, 'Failed to update question');
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
router.delete('/questions/:questionId', auth_1.requireAuth, async (req, res) => {
    try {
        await questionnaireService_1.questionnaireService.deleteQuestion(req.params.questionId);
        res.json({
            success: true,
            message: 'Question deleted',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionId: req.params.questionId }, 'Failed to delete question');
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
router.post('/:questionnaireId/reorder', auth_1.requireAuth, async (req, res) => {
    try {
        const { questionOrders } = req.body;
        if (!questionOrders || !Array.isArray(questionOrders)) {
            return res.status(400).json({ error: 'questionOrders array is required' });
        }
        await questionnaireService_1.questionnaireService.reorderQuestions(req.params.questionnaireId, questionOrders);
        res.json({
            success: true,
            message: 'Questions reordered',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to reorder questions');
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
        const questionnaires = await questionnaireService_1.questionnaireService.getQuestionnairesForCandidate(req.params.candidateId);
        res.json({
            success: true,
            questionnaires,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId }, 'Failed to get available questionnaires');
        res.status(500).json({ error: 'Failed to get available questionnaires' });
    }
});
exports.default = router;
//# sourceMappingURL=questionnaires.js.map