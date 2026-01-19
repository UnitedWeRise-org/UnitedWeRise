"use strict";
/**
 * @fileoverview Endorsement Routes
 *
 * Handles the endorsement workflow: applications, voting, and publication.
 * Candidates apply, org members vote, endorsements are published.
 *
 * @module routes/endorsements
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const endorsementService_1 = require("../services/endorsementService");
const organizationService_1 = require("../services/organizationService");
const client_1 = require("@prisma/client");
const logger_1 = require("../services/logger");
const prisma_1 = require("../lib/prisma");
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   - name: Endorsement Applications
 *     description: Endorsement application submission and review
 *   - name: Endorsement Voting
 *     description: Voting on endorsement applications
 *   - name: Endorsements
 *     description: Published endorsements
 */
// ===============================
// APPLICATION ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/endorsements/applications:
 *   post:
 *     tags: [Endorsement Applications]
 *     summary: Submit an endorsement application
 *     description: Candidate submits application to a questionnaire
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionnaireId
 *               - candidateId
 *               - responses
 *             properties:
 *               questionnaireId:
 *                 type: string
 *               candidateId:
 *                 type: string
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                     - response
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     response:
 *                       type: string
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: Invalid application or already applied
 *       403:
 *         description: Not a candidate or outside jurisdiction
 */
router.post('/applications', auth_1.requireAuth, async (req, res) => {
    try {
        const { questionnaireId, candidateId, responses } = req.body;
        if (!questionnaireId || !candidateId || !responses) {
            return res.status(400).json({ error: 'questionnaireId, candidateId, and responses are required' });
        }
        // Verify the authenticated user is the candidate
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { userId: true },
        });
        if (!candidate || candidate.userId !== req.user.id) {
            return res.status(403).json({ error: 'You can only submit applications for your own candidacy' });
        }
        const application = await endorsementService_1.endorsementService.submitApplication(questionnaireId, candidateId, { responses });
        res.status(201).json({
            success: true,
            application,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to submit application');
        res.status(400).json({ error: error.message || 'Failed to submit application' });
    }
});
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}:
 *   get:
 *     tags: [Endorsement Applications]
 *     summary: Get an application by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application details
 *       404:
 *         description: Application not found
 */
router.get('/applications/:applicationId', auth_1.requireAuth, async (req, res) => {
    try {
        const application = await endorsementService_1.endorsementService.getApplication(req.params.applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json({
            success: true,
            application,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to get application');
        res.status(500).json({ error: 'Failed to get application' });
    }
});
/**
 * @swagger
 * /api/endorsements/questionnaires/{questionnaireId}/applications:
 *   get:
 *     tags: [Endorsement Applications]
 *     summary: List applications for a questionnaire
 *     description: Requires REVIEW_APPLICATIONS capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questionnaireId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUBMITTED, UNDER_REVIEW, APPROVED, DENIED, WITHDRAWN]
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
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get('/questionnaires/:questionnaireId/applications', auth_1.requireAuth, async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const result = await endorsementService_1.endorsementService.listApplications(req.params.questionnaireId, {
            status: status,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        res.json({
            success: true,
            applications: result.applications,
            total: result.total,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, questionnaireId: req.params.questionnaireId }, 'Failed to list applications');
        res.status(500).json({ error: 'Failed to list applications' });
    }
});
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}/status:
 *   patch:
 *     tags: [Endorsement Applications]
 *     summary: Update application status
 *     description: Requires REVIEW_APPLICATIONS capability. Use to move to UNDER_REVIEW.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [UNDER_REVIEW, DENIED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/applications/:applicationId/status', auth_1.requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }
        // Only allow certain status transitions via this endpoint
        if (!['UNDER_REVIEW', 'DENIED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use dedicated endpoints for approve/deny.' });
        }
        const application = await endorsementService_1.endorsementService.updateEndorsementApplicationStatus(req.params.applicationId, status);
        res.json({
            success: true,
            application,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to update application status');
        res.status(400).json({ error: error.message || 'Failed to update status' });
    }
});
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}/withdraw:
 *   post:
 *     tags: [Endorsement Applications]
 *     summary: Withdraw an application
 *     description: Candidate can withdraw their own pending application
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application withdrawn
 */
router.post('/applications/:applicationId/withdraw', auth_1.requireAuth, async (req, res) => {
    try {
        // Verify the user owns this application
        const application = await endorsementService_1.endorsementService.getApplication(req.params.applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        if (application.candidate.user?.id !== req.user.id) {
            return res.status(403).json({ error: 'You can only withdraw your own applications' });
        }
        const updated = await endorsementService_1.endorsementService.withdrawApplication(req.params.applicationId);
        res.json({
            success: true,
            application: updated,
            message: 'Application withdrawn',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to withdraw application');
        res.status(400).json({ error: error.message || 'Failed to withdraw application' });
    }
});
// ===============================
// VOTING ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}/vote:
 *   post:
 *     tags: [Endorsement Voting]
 *     summary: Cast a vote on an application
 *     description: Requires VOTE_ENDORSEMENT capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
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
 *               - vote
 *             properties:
 *               vote:
 *                 type: string
 *                 enum: [FOR, AGAINST, ABSTAIN]
 *               comment:
 *                 type: string
 *                 description: Internal note (optional)
 *     responses:
 *       200:
 *         description: Vote recorded
 */
router.post('/applications/:applicationId/vote', auth_1.requireAuth, async (req, res) => {
    try {
        const { vote, comment } = req.body;
        if (!vote || !['FOR', 'AGAINST', 'ABSTAIN'].includes(vote)) {
            return res.status(400).json({ error: 'Valid vote (FOR, AGAINST, ABSTAIN) is required' });
        }
        // Get application to find organization
        const application = await endorsementService_1.endorsementService.getApplication(req.params.applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const organizationId = application.questionnaire.organization.id;
        // Get user's membership
        const membership = await organizationService_1.organizationService.getUserMembership(organizationId, req.user.id);
        if (!membership) {
            return res.status(403).json({ error: 'You must be a member to vote' });
        }
        // Check if user has VOTE_ENDORSEMENT capability (head or role with capability)
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { headUserId: true },
        });
        const isHead = org?.headUserId === req.user.id;
        const hasCapability = membership.role?.capabilities.includes(client_1.OrgCapability.VOTE_ENDORSEMENT);
        if (!isHead && !hasCapability) {
            return res.status(403).json({ error: 'You do not have permission to vote on endorsements' });
        }
        const voteRecord = await endorsementService_1.endorsementService.castVote(req.params.applicationId, membership.id, vote, comment);
        // Return updated vote counts
        const voteStatus = await endorsementService_1.endorsementService.checkVotingThreshold(req.params.applicationId);
        res.json({
            success: true,
            vote: voteRecord,
            voteStatus,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to cast vote');
        res.status(400).json({ error: error.message || 'Failed to cast vote' });
    }
});
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}/vote-status:
 *   get:
 *     tags: [Endorsement Voting]
 *     summary: Get voting status for an application
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Voting status
 */
router.get('/applications/:applicationId/vote-status', auth_1.requireAuth, async (req, res) => {
    try {
        const voteStatus = await endorsementService_1.endorsementService.checkVotingThreshold(req.params.applicationId);
        res.json({
            success: true,
            voteStatus,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to get vote status');
        res.status(400).json({ error: error.message || 'Failed to get vote status' });
    }
});
// ===============================
// ENDORSEMENT PUBLICATION
// ===============================
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}/publish:
 *   post:
 *     tags: [Endorsements]
 *     summary: Publish an endorsement
 *     description: Publishes endorsement after voting threshold is met. Requires PUBLISH_ENDORSEMENT capability.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statement:
 *                 type: string
 *                 description: Public endorsement statement
 *     responses:
 *       201:
 *         description: Endorsement published
 *       400:
 *         description: Voting threshold not met
 */
router.post('/applications/:applicationId/publish', auth_1.requireAuth, async (req, res) => {
    try {
        const { statement } = req.body;
        const endorsement = await endorsementService_1.endorsementService.publishEndorsement(req.params.applicationId, req.user.id, statement);
        logger_1.logger.info({
            endorsementId: endorsement.id,
            applicationId: req.params.applicationId,
            publishedBy: req.user.id,
        }, 'Endorsement published');
        res.status(201).json({
            success: true,
            endorsement,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to publish endorsement');
        res.status(400).json({ error: error.message || 'Failed to publish endorsement' });
    }
});
/**
 * @swagger
 * /api/endorsements/applications/{applicationId}/deny:
 *   post:
 *     tags: [Endorsements]
 *     summary: Deny an application
 *     description: Marks application as denied. Requires PUBLISH_ENDORSEMENT capability.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application denied
 */
router.post('/applications/:applicationId/deny', auth_1.requireAuth, async (req, res) => {
    try {
        const application = await endorsementService_1.endorsementService.denyApplication(req.params.applicationId);
        res.json({
            success: true,
            application,
            message: 'Application denied',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, applicationId: req.params.applicationId }, 'Failed to deny application');
        res.status(400).json({ error: error.message || 'Failed to deny application' });
    }
});
// ===============================
// ENDORSEMENT LISTING
// ===============================
/**
 * @swagger
 * /api/endorsements/{endorsementId}:
 *   get:
 *     tags: [Endorsements]
 *     summary: Get an endorsement by ID
 *     parameters:
 *       - in: path
 *         name: endorsementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Endorsement details
 *       404:
 *         description: Endorsement not found
 */
router.get('/:endorsementId', async (req, res) => {
    try {
        const endorsement = await endorsementService_1.endorsementService.getEndorsement(req.params.endorsementId);
        if (!endorsement) {
            return res.status(404).json({ error: 'Endorsement not found' });
        }
        res.json({
            success: true,
            endorsement,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, endorsementId: req.params.endorsementId }, 'Failed to get endorsement');
        res.status(500).json({ error: 'Failed to get endorsement' });
    }
});
/**
 * @swagger
 * /api/endorsements/organizations/{organizationId}:
 *   get:
 *     tags: [Endorsements]
 *     summary: List endorsements by an organization
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeRevoked
 *         schema:
 *           type: boolean
 *           default: false
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
 *     responses:
 *       200:
 *         description: List of endorsements
 */
router.get('/organizations/:organizationId', async (req, res) => {
    try {
        const { includeRevoked, limit, offset } = req.query;
        const result = await endorsementService_1.endorsementService.listOrganizationEndorsements(req.params.organizationId, {
            includeRevoked: includeRevoked === 'true',
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        res.json({
            success: true,
            endorsements: result.endorsements,
            total: result.total,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list endorsements');
        res.status(500).json({ error: 'Failed to list endorsements' });
    }
});
/**
 * @swagger
 * /api/endorsements/candidates/{candidateId}:
 *   get:
 *     tags: [Endorsements]
 *     summary: List endorsements for a candidate
 *     parameters:
 *       - in: path
 *         name: candidateId
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
 *     responses:
 *       200:
 *         description: List of endorsements
 */
router.get('/candidates/:candidateId', async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const result = await endorsementService_1.endorsementService.listCandidateEndorsements(req.params.candidateId, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        res.json({
            success: true,
            endorsements: result.endorsements,
            total: result.total,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId }, 'Failed to list candidate endorsements');
        res.status(500).json({ error: 'Failed to list endorsements' });
    }
});
/**
 * @swagger
 * /api/endorsements/candidates/{candidateId}/pending:
 *   get:
 *     tags: [Endorsement Applications]
 *     summary: Get candidate's pending applications
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pending applications
 */
router.get('/candidates/:candidateId/pending', auth_1.requireAuth, async (req, res) => {
    try {
        const applications = await endorsementService_1.endorsementService.getCandidatePendingApplications(req.params.candidateId);
        res.json({
            success: true,
            applications,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId }, 'Failed to get pending applications');
        res.status(500).json({ error: 'Failed to get pending applications' });
    }
});
/**
 * @swagger
 * /api/endorsements/{endorsementId}/revoke:
 *   post:
 *     tags: [Endorsements]
 *     summary: Revoke an endorsement
 *     description: Requires PUBLISH_ENDORSEMENT capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endorsementId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for revocation
 *     responses:
 *       200:
 *         description: Endorsement revoked
 */
router.post('/:endorsementId/revoke', auth_1.requireAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const endorsement = await endorsementService_1.endorsementService.revokeEndorsement(req.params.endorsementId, req.user.id, reason);
        logger_1.logger.info({
            endorsementId: req.params.endorsementId,
            revokedBy: req.user.id,
            reason,
        }, 'Endorsement revoked');
        res.json({
            success: true,
            endorsement,
            message: 'Endorsement revoked',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, endorsementId: req.params.endorsementId }, 'Failed to revoke endorsement');
        res.status(400).json({ error: error.message || 'Failed to revoke endorsement' });
    }
});
exports.default = router;
//# sourceMappingURL=endorsements.js.map