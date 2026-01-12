"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const candidateInboxService_1 = require("../services/candidateInboxService");
const metricsService_1 = require("../services/metricsService");
const logger_1 = require("../services/logger");
const safeJson_1 = require("../utils/safeJson");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * tags:
 *   name: Candidate Messages
 *   description: Political messaging system for candidate communication
 */
/**
 * @swagger
 * /api/candidate-messages/{candidateId}/inquiry:
 *   post:
 *     tags: [Candidate Messages]
 *     summary: Submit inquiry to candidate
 *     description: Send a message or question to a candidate's inbox
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Subject of the inquiry
 *               content:
 *                 type: string
 *                 description: Message content
 *               category:
 *                 type: string
 *                 enum: [GENERAL, HEALTHCARE, EDUCATION, ECONOMY, ENVIRONMENT, IMMIGRATION, FOREIGN_POLICY, CRIMINAL_JUSTICE, INFRASTRUCTURE, HOUSING, LABOR, TECHNOLOGY, CIVIL_RIGHTS, BUDGET_TAXES, ENERGY, AGRICULTURE, VETERANS, SENIORS, YOUTH, FAMILY_VALUES, OTHER]
 *                 default: GENERAL
 *               isAnonymous:
 *                 type: boolean
 *                 default: false
 *                 description: Submit as anonymous inquiry
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 description: Contact email for anonymous inquiries
 *               contactName:
 *                 type: string
 *                 description: Contact name for anonymous inquiries
 *               policyTopic:
 *                 type: string
 *                 description: Specific policy topic
 *               specificQuestion:
 *                 type: string
 *                 description: Specific policy question
 *             required:
 *               - subject
 *               - content
 *     responses:
 *       201:
 *         description: Inquiry submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inquiry:
 *                   type: object
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Candidate not found or inbox inactive
 */
router.post('/:candidateId/inquiry', async (req, res) => {
    try {
        const { candidateId } = req.params;
        const userId = req.user?.id; // Optional for anonymous inquiries
        const inquiryData = {
            candidateId,
            inquirerId: userId,
            ...req.body
        };
        // Validate required fields
        if (!inquiryData.subject || !inquiryData.content) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Subject and content are required'
            });
        }
        // For anonymous inquiries, require contact info
        if (inquiryData.isAnonymous && !inquiryData.contactEmail) {
            return res.status(400).json({
                error: 'Contact email required',
                message: 'Contact email is required for anonymous inquiries'
            });
        }
        const inquiry = await candidateInboxService_1.CandidateInboxService.submitInquiry(inquiryData);
        // Track inquiry submissions
        metricsService_1.metricsService.incrementCounter('candidate_inquiries_submitted', {
            candidateId,
            category: inquiryData.category || 'GENERAL',
            isAnonymous: inquiryData.isAnonymous ? 'true' : 'false'
        });
        res.status(201).json({
            message: 'Inquiry submitted successfully',
            inquiry: {
                id: inquiry.id,
                subject: inquiry.subject,
                category: inquiry.category,
                status: inquiry.status,
                createdAt: inquiry.createdAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId, userId: req.user?.id }, 'Submit inquiry error');
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('not accepting')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to submit inquiry' });
    }
});
/**
 * @swagger
 * /api/candidate-messages/{candidateId}/inbox:
 *   get:
 *     tags: [Candidate Messages]
 *     summary: Get candidate inbox (staff/candidate only)
 *     description: Retrieve candidate's message inbox with filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [OPEN, IN_PROGRESS, WAITING_FOR_CANDIDATE, RESOLVED, CLOSED, ARCHIVED]
 *         description: Filter by inquiry status
 *       - in: query
 *         name: category
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by category
 *       - in: query
 *         name: priority
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [LOW, NORMAL, HIGH, URGENT]
 *         description: Filter by priority
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Candidate inbox data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inbox:
 *                   type: object
 *                 inquiries:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalCount:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 */
router.get('/:candidateId/inbox', auth_1.requireAuth, async (req, res) => {
    try {
        const { candidateId } = req.params;
        const userId = req.user.id;
        const { limit, offset } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset);
        const filters = {
            status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
            category: req.query.category ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]) : undefined,
            priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority : [req.query.priority]) : undefined,
            limit,
            offset
        };
        const inboxData = await candidateInboxService_1.CandidateInboxService.getCandidateInbox(candidateId, userId, filters);
        // Track inbox access
        metricsService_1.metricsService.incrementCounter('candidate_inbox_accessed', {
            candidateId,
            userId
        });
        res.json(inboxData);
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId, userId: req.user?.id }, 'Get candidate inbox error');
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to retrieve inbox' });
    }
});
/**
 * @swagger
 * /api/candidate-messages/inquiry/{inquiryId}/respond:
 *   post:
 *     tags: [Candidate Messages]
 *     summary: Respond to inquiry (staff/candidate only)
 *     description: Send response to a candidate inquiry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inquiryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Response content
 *               responseType:
 *                 type: string
 *                 enum: [DIRECT, PUBLIC_QA, POLICY_STATEMENT, REFERRAL]
 *                 default: DIRECT
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Make response public (for PUBLIC_QA type)
 *               isFromCandidate:
 *                 type: boolean
 *                 default: false
 *                 description: Response is directly from candidate
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Response sent successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Inquiry not found
 */
router.post('/inquiry/:inquiryId/respond', auth_1.requireAuth, async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const userId = req.user.id;
        // Verify user has access to respond (need to check if user is candidate or staff)
        const inquiry = await prisma_1.prisma.politicalInquiry.findUnique({
            where: { id: inquiryId },
            include: {
                candidate: true
            }
        });
        if (!inquiry) {
            return res.status(404).json({ error: 'Inquiry not found' });
        }
        // Check if user is candidate or staff member
        const isCandidate = inquiry.candidate.userId === userId;
        let staffMember = null;
        if (!isCandidate) {
            staffMember = await prisma_1.prisma.candidateStaff.findFirst({
                where: {
                    userId,
                    inbox: {
                        candidateId: inquiry.candidateId
                    },
                    isActive: true,
                    permissions: {
                        has: 'RESPOND_INQUIRIES'
                    }
                }
            });
            if (!staffMember) {
                return res.status(403).json({ error: 'Access denied: Cannot respond to inquiries' });
            }
        }
        // For candidates responding directly, we need to create a temporary staff entry
        let responderId = staffMember?.id;
        if (!responderId && isCandidate) {
            // Create or get candidate as their own staff member for responses
            const candidateStaff = await prisma_1.prisma.candidateStaff.upsert({
                where: {
                    inboxId_userId: {
                        inboxId: (await prisma_1.prisma.candidateInbox.findUnique({
                            where: { candidateId: inquiry.candidateId }
                        })).id,
                        userId
                    }
                },
                update: {},
                create: {
                    inboxId: (await prisma_1.prisma.candidateInbox.findUnique({
                        where: { candidateId: inquiry.candidateId }
                    })).id,
                    userId,
                    role: 'CAMPAIGN_MANAGER',
                    permissions: ['READ_INQUIRIES', 'RESPOND_INQUIRIES', 'ASSIGN_INQUIRIES', 'MANAGE_STAFF', 'MANAGE_SETTINGS', 'PUBLISH_QA', 'MODERATE_QA']
                }
            });
            responderId = candidateStaff.id;
        }
        if (!responderId) {
            return res.status(500).json({ error: 'Failed to determine responder ID' });
        }
        const responseData = {
            inquiryId,
            responderId,
            content: req.body.content,
            responseType: req.body.responseType || 'DIRECT',
            isPublic: req.body.isPublic || false,
            isFromCandidate: isCandidate || req.body.isFromCandidate || false
        };
        const response = await candidateInboxService_1.CandidateInboxService.respondToInquiry(responseData);
        // Track responses
        metricsService_1.metricsService.incrementCounter('candidate_inquiry_responses', {
            candidateId: inquiry.candidateId,
            responseType: responseData.responseType,
            isFromCandidate: responseData.isFromCandidate ? 'true' : 'false'
        });
        res.status(201).json({
            message: 'Response sent successfully',
            response: {
                id: response.id,
                content: response.content,
                responseType: response.responseType,
                isPublic: response.isPublic,
                createdAt: response.createdAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, inquiryId: req.params.inquiryId, userId: req.user?.id }, 'Respond to inquiry error');
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to send response' });
    }
});
/**
 * @swagger
 * /api/candidate-messages/{candidateId}/public-qa:
 *   get:
 *     tags: [Candidate Messages]
 *     summary: Get public Q&A for candidate
 *     description: Retrieve public questions and answers for a candidate
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by category
 *       - in: query
 *         name: pinned
 *         schema:
 *           type: boolean
 *         description: Filter by pinned status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Public Q&A data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       question:
 *                         type: string
 *                       answer:
 *                         type: string
 *                       category:
 *                         type: string
 *                       isPinned:
 *                         type: boolean
 *                       upvotes:
 *                         type: integer
 *                       views:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 totalCount:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       404:
 *         description: Candidate not found
 */
router.get('/:candidateId/public-qa', async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { limit, offset } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset);
        const filters = {
            category: req.query.category ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]) : undefined,
            pinned: req.query.pinned ? req.query.pinned === 'true' : undefined,
            limit,
            offset
        };
        const qaData = await candidateInboxService_1.CandidateInboxService.getPublicQA(candidateId, filters);
        // Track public Q&A views
        metricsService_1.metricsService.incrementCounter('candidate_public_qa_views', {
            candidateId
        });
        res.json(qaData);
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId }, 'Get public Q&A error');
        res.status(500).json({ error: 'Failed to retrieve public Q&A' });
    }
});
/**
 * @swagger
 * /api/candidate-messages/{candidateId}/public-qa/{qaId}/vote:
 *   post:
 *     tags: [Candidate Messages]
 *     summary: Vote on public Q&A
 *     description: Upvote or downvote a public Q&A entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *       - in: path
 *         name: qaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Public Q&A ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voteType:
 *                 type: string
 *                 enum: [UPVOTE, DOWNVOTE]
 *             required:
 *               - voteType
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Q&A entry not found
 */
router.post('/:candidateId/public-qa/:qaId/vote', auth_1.requireAuth, async (req, res) => {
    try {
        const { candidateId, qaId } = req.params;
        const userId = req.user.id;
        const { voteType } = req.body;
        if (!['UPVOTE', 'DOWNVOTE'].includes(voteType)) {
            return res.status(400).json({ error: 'Invalid vote type' });
        }
        // Check if Q&A exists and belongs to candidate
        const qa = await prisma_1.prisma.publicQA.findFirst({
            where: {
                id: qaId,
                candidateId
            }
        });
        if (!qa) {
            return res.status(404).json({ error: 'Q&A entry not found' });
        }
        // Upsert vote (update if exists, create if not)
        const vote = await prisma_1.prisma.publicQAVote.upsert({
            where: {
                qaId_userId: {
                    qaId,
                    userId
                }
            },
            update: {
                voteType: voteType
            },
            create: {
                qaId,
                userId,
                voteType: voteType
            }
        });
        // Update vote counts on the Q&A
        const [upvoteCount, downvoteCount] = await Promise.all([
            prisma_1.prisma.publicQAVote.count({
                where: { qaId, voteType: 'UPVOTE' }
            }),
            prisma_1.prisma.publicQAVote.count({
                where: { qaId, voteType: 'DOWNVOTE' }
            })
        ]);
        await prisma_1.prisma.publicQA.update({
            where: { id: qaId },
            data: {
                upvotes: upvoteCount - downvoteCount // Net upvotes
            }
        });
        // Track votes
        metricsService_1.metricsService.incrementCounter('candidate_qa_votes', {
            candidateId,
            voteType: voteType.toLowerCase()
        });
        res.json({
            message: 'Vote recorded successfully',
            voteType,
            netUpvotes: upvoteCount - downvoteCount
        });
    }
    catch (error) {
        logger_1.logger.error({ error, qaId: req.params.qaId, userId: req.user?.id }, 'Vote on Q&A error');
        res.status(500).json({ error: 'Failed to record vote' });
    }
});
/**
 * @swagger
 * /api/candidate-messages/{candidateId}/staff:
 *   post:
 *     tags: [Candidate Messages]
 *     summary: Add staff member (candidate/manager only)
 *     description: Add a staff member to candidate's messaging team
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to add as staff
 *               role:
 *                 type: string
 *                 enum: [CAMPAIGN_MANAGER, COMMUNICATIONS_DIRECTOR, POLICY_ADVISOR, VOLUNTEER_COORDINATOR, VOLUNTEER, INTERN]
 *                 default: VOLUNTEER
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [READ_INQUIRIES, RESPOND_INQUIRIES, ASSIGN_INQUIRIES, MANAGE_STAFF, MANAGE_SETTINGS, PUBLISH_QA, MODERATE_QA]
 *                 description: Staff permissions
 *             required:
 *               - userId
 *               - role
 *               - permissions
 *     responses:
 *       201:
 *         description: Staff member added successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Candidate not found
 */
router.post('/:candidateId/staff', auth_1.requireAuth, async (req, res) => {
    try {
        const { candidateId } = req.params;
        const userId = req.user.id;
        const { userId: staffUserId, role, permissions } = req.body;
        if (!staffUserId || !role || !permissions) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'userId, role, and permissions are required'
            });
        }
        const staffMember = await candidateInboxService_1.CandidateInboxService.addStaffMember(candidateId, staffUserId, {
            role,
            permissions,
            addedBy: userId
        });
        // Track staff additions
        metricsService_1.metricsService.incrementCounter('candidate_staff_added', {
            candidateId,
            role: role.toLowerCase()
        });
        res.status(201).json({
            message: 'Staff member added successfully',
            staffMember: {
                id: staffMember.id,
                role: staffMember.role,
                permissions: staffMember.permissions,
                user: staffMember.user
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId, userId: req.user?.id }, 'Add staff member error');
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to add staff member' });
    }
});
/**
 * @swagger
 * /api/candidate-messages/{candidateId}/staff:
 *   get:
 *     tags: [Candidate Messages]
 *     summary: Get staff members (candidate/manager only)
 *     description: Get list of staff members for candidate's messaging team
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Staff members list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 staffMembers:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 */
router.get('/:candidateId/staff', auth_1.requireAuth, async (req, res) => {
    try {
        const { candidateId } = req.params;
        const userId = req.user.id;
        // Verify user has access to view staff
        const hasAccess = await prisma_1.prisma.candidateStaff.findFirst({
            where: {
                userId,
                inbox: {
                    candidateId
                },
                isActive: true,
                permissions: {
                    has: 'MANAGE_STAFF'
                }
            }
        });
        // Or check if user is the candidate themselves
        const candidate = await prisma_1.prisma.candidate.findFirst({
            where: {
                id: candidateId,
                userId
            }
        });
        if (!hasAccess && !candidate) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const staffMembers = await prisma_1.prisma.candidateStaff.findMany({
            where: {
                inbox: {
                    candidateId
                },
                isActive: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        res.json({
            staffMembers,
            count: staffMembers.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId, userId: req.user?.id }, 'Get staff members error');
        res.status(500).json({ error: 'Failed to retrieve staff members' });
    }
});
exports.default = router;
//# sourceMappingURL=candidateMessages.js.map