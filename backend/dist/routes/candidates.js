"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const electionService_1 = require("../services/electionService");
const enhancedCandidateService_1 = require("../services/enhancedCandidateService");
const qwenService_1 = require("../services/qwenService");
const metricsService_1 = require("../services/metricsService");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
// Validation schemas for candidate registration
const candidateRegistrationSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(10).max(20),
    address: zod_1.z.object({
        street: zod_1.z.string().min(1).max(200),
        city: zod_1.z.string().min(1).max(100),
        state: zod_1.z.string().min(2).max(50),
        zipCode: zod_1.z.string().min(5).max(10),
        district: zod_1.z.string().optional()
    }),
    position: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200),
        level: zod_1.z.enum(['federal', 'state', 'county', 'city', 'local']),
        district: zod_1.z.string().optional(),
        electionDate: zod_1.z.string().transform(str => new Date(str))
    }),
    campaign: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        website: zod_1.z.string().url().optional(),
        slogan: zod_1.z.string().max(500).optional(),
        description: zod_1.z.string().max(2000).optional()
    }),
    officeLevel: zod_1.z.enum(['local', 'regional', 'state', 'federal', 'presidential']),
    hasFinancialHardship: zod_1.z.boolean().default(false),
    hardshipReason: zod_1.z.string().optional(),
    communityEndorsements: zod_1.z.array(zod_1.z.string()).optional(), // Array of endorsement IDs or names
    agreeToTerms: zod_1.z.boolean().refine(val => val === true, {
        message: "Must agree to terms and conditions"
    })
});
/**
 * @swagger
 * /api/candidates:
 *   get:
 *     tags: [Candidates]
 *     summary: Search candidates
 *     description: Search and filter candidates across all elections
 *     parameters:
 *       - in: query
 *         name: party
 *         schema:
 *           type: string
 *         description: Filter by political party
 *       - in: query
 *         name: office
 *         schema:
 *           type: string
 *         description: Filter by office type
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: incumbent
 *         schema:
 *           type: boolean
 *         description: Filter by incumbent status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search candidate names
 *     responses:
 *       200:
 *         description: List of candidates matching search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 */
// Search candidates
router.get('/', async (req, res) => {
    try {
        const { party, office, state, incumbent, search } = req.query;
        const searchParams = {};
        if (party)
            searchParams.party = party;
        if (incumbent !== undefined)
            searchParams.isIncumbent = incumbent === 'true';
        let candidates = await electionService_1.ElectionService.searchCandidates(searchParams);
        // Additional filtering that's not in the service
        if (state) {
            candidates = candidates.filter(c => c.office.election.state.toLowerCase() === state.toLowerCase());
        }
        if (office) {
            candidates = candidates.filter(c => c.office.title.toLowerCase().includes(office.toLowerCase()));
        }
        if (search) {
            const searchTerm = search.toLowerCase();
            candidates = candidates.filter(c => c.name.toLowerCase().includes(searchTerm));
        }
        res.json({
            candidates,
            count: candidates.length
        });
    }
    catch (error) {
        console.error('Candidate search error:', error);
        res.status(500).json({ error: 'Failed to search candidates' });
    }
});
/**
 * @swagger
 * /api/candidates/{id}:
 *   get:
 *     tags: [Candidates]
 *     summary: Get candidate profile
 *     description: Get detailed information about a specific candidate
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Candidate profile information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidate'
 *       404:
 *         description: Candidate not found
 */
// GET /api/candidates/pricing - Get candidate registration pricing
router.get('/pricing', (req, res) => {
    res.json({
        success: true,
        message: 'As a nonprofit supporting grassroots democracy, our fees are designed to deter unserious candidates while remaining accessible to genuine community leaders.',
        pricing: {
            local: {
                name: 'Local Office',
                price: 50.00,
                examples: ['School Board', 'City Council', 'Local Judges', 'Township Offices'],
                description: 'Community-level positions serving local constituencies'
            },
            regional: {
                name: 'Regional Office',
                price: 100.00,
                examples: ['Mayor', 'County Supervisor', 'State House', 'State Senate'],
                description: 'Regional positions with broader jurisdictional responsibility'
            },
            state: {
                name: 'State Office',
                price: 200.00,
                examples: ['US House of Representatives', 'Governor', 'Attorney General'],
                description: 'Statewide or federal district-level positions'
            },
            federal: {
                name: 'Federal Office',
                price: 400.00,
                examples: ['US Senate', 'Lieutenant Governor'],
                description: 'Federal senate or major statewide executive positions'
            },
            presidential: {
                name: 'Presidential',
                price: 1000.00,
                examples: ['President of the United States'],
                description: 'Presidential campaign registration'
            }
        },
        policies: {
            refunds: {
                no_questions_asked: '48 hours from registration',
                lockout_period: '7 days before re-registration allowed',
                special_circumstances: 'Case-by-case review available by contacting support'
            },
            waivers: {
                financial_hardship: 'Application-based fee waiver for qualifying candidates',
                community_endorsement: 'Fee reduction available with sufficient community support',
                contact: 'Email waivers@unitedwerise.org for waiver applications'
            }
        },
        features: [
            'Verified candidate profile on platform',
            'Direct voter messaging system',
            'AI-powered policy comparison',
            'Campaign photo management',
            'Public Q&A system',
            'Staff delegation tools',
            'Analytics and engagement metrics',
            'Integration with election data',
            'Mobile-optimized candidate pages'
        ]
    });
});
// Get candidate profile
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id },
            include: {
                office: {
                    include: {
                        election: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        bio: true,
                        verified: true
                    }
                },
                financialData: true,
                endorsements: {
                    where: { isPublic: true },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        if (!candidate || candidate.isWithdrawn) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        // Track candidate profile views
        metricsService_1.metricsService.incrementCounter('candidate_profile_views_total', {
            office_level: candidate.office.level
        });
        res.json(candidate);
    }
    catch (error) {
        console.error('Candidate profile error:', error);
        res.status(500).json({ error: 'Failed to retrieve candidate profile' });
    }
});
/**
 * @swagger
 * /api/candidates/{id}/endorse:
 *   post:
 *     tags: [Candidates]
 *     summary: Endorse candidate
 *     description: Endorse a candidate (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for endorsement
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Whether endorsement should be public
 *     responses:
 *       201:
 *         description: Endorsement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Endorsement'
 *       400:
 *         description: Invalid request or already endorsed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Candidate not found
 */
// Endorse candidate
router.post('/:id/endorse', auth_1.requireAuth, async (req, res) => {
    try {
        const { id: candidateId } = req.params;
        const userId = req.user.id;
        const { reason, isPublic = false } = req.body;
        // Verify candidate exists and is active
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                office: {
                    include: {
                        election: true
                    }
                }
            }
        });
        if (!candidate || candidate.isWithdrawn) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        // Check if election is still active for endorsements
        if (candidate.office.election.date < new Date()) {
            return res.status(400).json({
                error: 'Cannot endorse candidates for past elections'
            });
        }
        const endorsement = await electionService_1.ElectionService.endorseCandidate(userId, candidateId, reason, isPublic);
        // Track endorsements
        metricsService_1.metricsService.incrementCounter('candidate_endorsements_total', {
            visibility: isPublic ? 'public' : 'private',
            office_level: candidate.office.level
        });
        res.status(201).json({
            message: 'Endorsement created successfully',
            endorsement
        });
    }
    catch (error) {
        console.error('Endorsement error:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create endorsement' });
    }
});
/**
 * @swagger
 * /api/candidates/{id}/endorse:
 *   delete:
 *     tags: [Candidates]
 *     summary: Remove endorsement
 *     description: Remove your endorsement of a candidate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Endorsement removed successfully
 *       404:
 *         description: Endorsement not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Remove endorsement
router.delete('/:id/endorse', auth_1.requireAuth, async (req, res) => {
    try {
        const { id: candidateId } = req.params;
        const userId = req.user.id;
        await electionService_1.ElectionService.removeEndorsement(userId, candidateId);
        res.json({ message: 'Endorsement removed successfully' });
    }
    catch (error) {
        console.error('Remove endorsement error:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to remove endorsement' });
    }
});
/**
 * @swagger
 * /api/candidates/my-candidacy:
 *   get:
 *     tags: [Candidates]
 *     summary: Get my candidate profiles
 *     description: Get current user's candidate registrations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's candidate profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get user's own candidate profiles
router.get('/my-candidacy', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const candidates = await prisma_1.prisma.candidate.findMany({
            where: { userId },
            include: {
                office: {
                    include: {
                        election: true
                    }
                },
                financialData: true,
                endorsements: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            candidates,
            count: candidates.length
        });
    }
    catch (error) {
        console.error('My candidacy error:', error);
        res.status(500).json({ error: 'Failed to retrieve candidate profiles' });
    }
});
/**
 * @swagger
 * /api/candidates/{id}/update-platform:
 *   put:
 *     tags: [Candidates]
 *     summary: Update candidate platform
 *     description: Update campaign platform information (candidate only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               platformSummary:
 *                 type: string
 *                 description: Updated campaign platform summary
 *               keyIssues:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated key campaign issues
 *               campaignWebsite:
 *                 type: string
 *                 format: uri
 *                 description: Campaign website URL
 *               campaignEmail:
 *                 type: string
 *                 format: email
 *                 description: Campaign contact email
 *               campaignPhone:
 *                 type: string
 *                 description: Campaign contact phone
 *     responses:
 *       200:
 *         description: Platform updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidate'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not authorized to update this candidate
 *       404:
 *         description: Candidate not found
 */
// Update candidate platform
router.put('/:id/update-platform', auth_1.requireAuth, async (req, res) => {
    try {
        const { id: candidateId } = req.params;
        const userId = req.user.id;
        const updates = req.body;
        const candidate = await electionService_1.ElectionService.updateCandidateProfile(candidateId, userId, updates);
        // Track platform updates
        metricsService_1.metricsService.incrementCounter('candidate_platform_updates_total');
        res.json({
            message: 'Platform updated successfully',
            candidate
        });
    }
    catch (error) {
        console.error('Platform update error:', error);
        if (error.message.includes('not found') || error.message.includes('access denied')) {
            return res.status(error.message.includes('access denied') ? 403 : 404)
                .json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update platform' });
    }
});
/**
 * @swagger
 * /api/candidates/{id}/withdraw:
 *   post:
 *     tags: [Candidates]
 *     summary: Withdraw candidacy
 *     description: Withdraw from the race (candidate only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for withdrawal (optional)
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not authorized to withdraw this candidacy
 *       404:
 *         description: Candidate not found
 */
// Withdraw candidacy
router.post('/:id/withdraw', auth_1.requireAuth, async (req, res) => {
    try {
        const { id: candidateId } = req.params;
        const userId = req.user.id;
        const { reason } = req.body;
        await electionService_1.ElectionService.withdrawCandidacy(candidateId, userId, reason);
        // Track withdrawals
        metricsService_1.metricsService.incrementCounter('candidate_withdrawals_total');
        res.json({ message: 'Candidacy withdrawn successfully' });
    }
    catch (error) {
        console.error('Withdrawal error:', error);
        if (error.message.includes('not found') || error.message.includes('access denied')) {
            return res.status(error.message.includes('access denied') ? 403 : 404)
                .json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to withdraw candidacy' });
    }
});
/**
 * @swagger
 * /api/candidates/{id}/enhanced:
 *   get:
 *     tags: [Candidates]
 *     summary: Get enhanced candidate profile with AI analysis
 *     description: Retrieve candidate profile with photos and AI-analyzed policy positions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Enhanced candidate profile with AI analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidate:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     party:
 *                       type: string
 *                     photos:
 *                       type: object
 *                       properties:
 *                         avatar:
 *                           type: object
 *                         campaignHeadshot:
 *                           type: object
 *                         gallery:
 *                           type: array
 *                           items:
 *                             type: object
 *                     policyPositions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           issue:
 *                             type: string
 *                           position:
 *                             type: string
 *                           stance:
 *                             type: string
 *                             enum: [for, against, neutral, nuanced]
 *                           confidence:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/enhanced', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🤖 Loading enhanced profile for candidate ${id}`);
        const candidate = await enhancedCandidateService_1.EnhancedCandidateService.getCandidateProfile(id);
        if (!candidate) {
            return res.status(404).json({
                error: 'Candidate not found',
                message: 'The requested candidate profile could not be found'
            });
        }
        // Track enhanced profile requests
        metricsService_1.metricsService.incrementCounter('candidate_enhanced_profile_requests', {
            candidateId: id,
            hasAIAnalysis: (candidate.policyPositions?.length || 0) > 0 ? 'true' : 'false'
        });
        res.json({
            candidate,
            aiAnalysisEnabled: (candidate.policyPositions?.length || 0) > 0,
            photoCount: (candidate.photos.gallery?.length || 0) + (candidate.photos.avatar ? 1 : 0) + (candidate.photos.campaignHeadshot ? 1 : 0)
        });
    }
    catch (error) {
        console.error('Enhanced candidate profile error:', error);
        res.status(500).json({ error: 'Failed to load enhanced candidate profile' });
    }
});
/**
 * @swagger
 * /api/candidates/compare:
 *   post:
 *     tags: [Candidates]
 *     summary: AI-powered candidate comparison
 *     description: Compare multiple candidates using Qwen3 AI analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 2
 *                 maxItems: 6
 *                 description: List of candidate IDs to compare (2-6 candidates)
 *               officeId:
 *                 type: string
 *                 description: Optional office ID to ensure candidates are for same office
 *             required:
 *               - candidateIds
 *     responses:
 *       200:
 *         description: AI-powered candidate comparison
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparison:
 *                   type: object
 *                   properties:
 *                     candidates:
 *                       type: array
 *                       items:
 *                         type: object
 *                     sharedIssues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           issue:
 *                             type: string
 *                           positions:
 *                             type: array
 *                           agreement:
 *                             type: string
 *                             enum: [agree, disagree, mixed, unclear]
 *                           summary:
 *                             type: string
 *                     uniqueIssues:
 *                       type: array
 *                     overallSummary:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                 aiEnabled:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         description: Comparison failed
 */
router.post('/compare', async (req, res) => {
    try {
        const { candidateIds, officeId } = req.body;
        if (!candidateIds || !Array.isArray(candidateIds)) {
            return res.status(400).json({
                error: 'Invalid candidate IDs',
                message: 'candidateIds must be an array of candidate IDs'
            });
        }
        if (candidateIds.length < 2) {
            return res.status(400).json({
                error: 'Insufficient candidates',
                message: 'At least 2 candidates are required for comparison'
            });
        }
        if (candidateIds.length > 6) {
            return res.status(400).json({
                error: 'Too many candidates',
                message: 'Maximum 6 candidates can be compared at once'
            });
        }
        console.log(`🤖 Starting AI-powered comparison of ${candidateIds.length} candidates`);
        const comparison = await enhancedCandidateService_1.EnhancedCandidateService.compareCandidates(candidateIds, officeId);
        if (!comparison) {
            return res.status(500).json({
                error: 'Comparison failed',
                message: 'Failed to generate candidate comparison'
            });
        }
        // Track comparison requests
        metricsService_1.metricsService.incrementCounter('candidate_ai_comparisons', {
            candidateCount: candidateIds.length.toString(),
            hasOfficeFilter: officeId ? 'true' : 'false'
        });
        res.json({
            comparison: comparison.comparison,
            candidates: comparison.candidates,
            aiEnabled: true,
            comparisonType: 'ai_powered',
            candidateCount: comparison.candidates.length
        });
    }
    catch (error) {
        console.error('Candidate comparison error:', error);
        if (error.message.includes('At least 2 candidates')) {
            return res.status(400).json({
                error: 'Invalid request',
                message: error.message
            });
        }
        res.status(500).json({
            error: 'Comparison failed',
            message: 'Failed to generate candidate comparison'
        });
    }
});
/**
 * @swagger
 * /api/candidates/office/{officeId}/enhanced:
 *   get:
 *     tags: [Candidates]
 *     summary: Get enhanced candidates for an office
 *     description: Get all candidates for an office with AI analysis and photos
 *     parameters:
 *       - in: path
 *         name: officeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Office ID
 *       - in: query
 *         name: includeAnalysis
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include AI policy analysis (may be slower)
 *     responses:
 *       200:
 *         description: Enhanced candidates for the office
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *                 count:
 *                   type: integer
 *                 officeId:
 *                   type: string
 *                 aiAnalysisIncluded:
 *                   type: boolean
 */
router.get('/office/:officeId/enhanced', async (req, res) => {
    try {
        const { officeId } = req.params;
        const { includeAnalysis } = req.query;
        const includeAI = includeAnalysis !== 'false';
        console.log(`📋 Loading enhanced candidates for office ${officeId} (AI: ${includeAI})`);
        const candidates = await enhancedCandidateService_1.EnhancedCandidateService.getCandidatesByOffice(officeId, includeAI);
        // Track office candidate requests
        metricsService_1.metricsService.incrementCounter('office_enhanced_candidates_requests', {
            officeId,
            candidateCount: candidates.length.toString(),
            aiEnabled: includeAI ? 'true' : 'false'
        });
        res.json({
            candidates,
            count: candidates.length,
            officeId,
            aiAnalysisIncluded: includeAI
        });
    }
    catch (error) {
        console.error('Enhanced office candidates error:', error);
        res.status(500).json({ error: 'Failed to load enhanced candidates for office' });
    }
});
/**
 * @swagger
 * /api/candidates/ai/health:
 *   get:
 *     tags: [Candidates]
 *     summary: Check AI analysis system health
 *     description: Test Qwen3 AI system connectivity and performance
 *     responses:
 *       200:
 *         description: AI system status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qwen3:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     model:
 *                       type: string
 *                     details:
 *                       type: object
 *                 capabilities:
 *                   type: array
 *                   items:
 *                     type: string
 *       503:
 *         description: AI system unavailable
 */
router.get('/ai/health', async (req, res) => {
    try {
        console.log('🤖 Checking AI analysis system health...');
        const qwenHealth = await qwenService_1.QwenService.healthCheck();
        const usageStats = await qwenService_1.QwenService.getUsageStats();
        const response = {
            qwen3: qwenHealth,
            usageStats,
            capabilities: [
                'Policy position analysis',
                'Multi-candidate comparison',
                'Neutral summary generation',
                'Missing position handling',
                'Stance classification (for/against/neutral/nuanced)',
                'Confidence scoring',
                'Evidence extraction'
            ],
            lastChecked: new Date()
        };
        if (qwenHealth.status === 'healthy') {
            res.json(response);
        }
        else {
            res.status(503).json(response);
        }
    }
    catch (error) {
        console.error('AI health check error:', error);
        res.status(503).json({
            qwen3: { status: 'unhealthy', error: 'Health check failed' },
            capabilities: [],
            lastChecked: new Date()
        });
    }
});
// POST /api/candidates/register - Register as a candidate
router.post('/register', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Validate input
        const validationResult = candidateRegistrationSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid registration data',
                errors: validationResult.error.issues
            });
        }
        const validatedData = validationResult.data;
        // Check if user already has a pending or active candidate registration
        const existingRegistration = await prisma_1.prisma.candidateRegistration.findFirst({
            where: {
                userId,
                status: { in: ['PENDING_VERIFICATION', 'PENDING_PAYMENT', 'PENDING_APPROVAL', 'APPROVED'] }
            }
        });
        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: `You already have a ${existingRegistration.status.replace('_', ' ')} candidate registration`
            });
        }
        // Generate registration ID for tracking
        const registrationId = crypto_1.default.randomBytes(16).toString('hex');
        // Calculate registration fee based on office level
        const fees = {
            local: 50.00,
            regional: 100.00,
            state: 200.00,
            federal: 400.00,
            presidential: 1000.00
        };
        let registrationFee = fees[validatedData.officeLevel];
        // Check for potential fee waivers
        let feeWaiverStatus = 'none';
        let finalFee = registrationFee;
        if (validatedData.hasFinancialHardship) {
            feeWaiverStatus = 'hardship_pending';
            // Fee waiver will be reviewed by admin
        }
        if (validatedData.communityEndorsements && validatedData.communityEndorsements.length >= 10) {
            // Community endorsement fee reduction (50% off)
            finalFee = registrationFee * 0.5;
            feeWaiverStatus = 'community_endorsed';
        }
        // Create candidate registration record
        const registration = await prisma_1.prisma.candidateRegistration.create({
            data: {
                id: crypto_1.default.randomUUID(),
                userId,
                registrationId,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                email: validatedData.email,
                phone: validatedData.phone,
                street: validatedData.address.street,
                city: validatedData.address.city,
                state: validatedData.address.state,
                zipCode: validatedData.address.zipCode,
                district: validatedData.address.district,
                positionTitle: validatedData.position.title,
                positionLevel: validatedData.position.level,
                positionDistrict: validatedData.position.district,
                electionDate: validatedData.position.electionDate,
                campaignName: validatedData.campaign.name,
                campaignWebsite: validatedData.campaign.website,
                campaignSlogan: validatedData.campaign.slogan,
                campaignDescription: validatedData.campaign.description,
                officeLevel: validatedData.officeLevel,
                registrationFee: finalFee,
                originalFee: registrationFee,
                feeWaiverStatus,
                hasFinancialHardship: validatedData.hasFinancialHardship,
                hardshipReason: validatedData.hardshipReason,
                communityEndorsementCount: validatedData.communityEndorsements?.length || 0,
                status: 'PENDING_VERIFICATION',
                termsAcceptedAt: new Date()
            }
        });
        // Track registration attempts
        metricsService_1.metricsService.incrementCounter('candidate_registrations_initiated');
        res.status(201).json({
            success: true,
            message: 'Candidate registration initiated',
            registration: {
                id: registration.id,
                registrationId,
                status: registration.status,
                officeLevel: registration.officeLevel,
                registrationFee: finalFee,
                originalFee: registrationFee,
                feeWaiverStatus,
                nextSteps: {
                    verification: 'Complete ID.me verification',
                    payment: feeWaiverStatus === 'hardship_pending' ? 'Fee waiver under review' : `Payment of $${finalFee} required after verification`,
                    approval: 'Admin review after payment'
                },
                policies: {
                    refund_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
                    withdrawal_lockout: '7 days after refund before re-registration allowed'
                }
            }
        });
    }
    catch (error) {
        console.error('Error registering candidate:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register candidate'
        });
    }
});
// POST /api/candidates/registration/:id/verify-idme - Handle ID.me verification
router.post('/registration/:id/verify-idme', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { verificationToken, idmeUserId, verified, userData } = req.body;
        const registration = await prisma_1.prisma.candidateRegistration.findFirst({
            where: {
                id,
                userId: req.user.id
            }
        });
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        if (verified) {
            await prisma_1.prisma.candidateRegistration.update({
                where: { id },
                data: {
                    idmeVerified: true,
                    idmeUserId,
                    idmeVerifiedAt: new Date(),
                    status: 'PENDING_PAYMENT',
                    // Store verified identity data
                    verifiedFirstName: userData?.firstName,
                    verifiedLastName: userData?.lastName,
                    verifiedEmail: userData?.email
                }
            });
            metricsService_1.metricsService.incrementCounter('candidate_idme_verifications_success');
            res.json({
                success: true,
                message: 'ID.me verification successful',
                nextStep: 'payment'
            });
        }
        else {
            metricsService_1.metricsService.incrementCounter('candidate_idme_verifications_failed');
            res.status(400).json({
                success: false,
                message: 'ID.me verification failed'
            });
        }
    }
    catch (error) {
        console.error('Error processing ID.me verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process verification'
        });
    }
});
// POST /api/candidates/registration/:id/payment - Process payment
router.post('/registration/:id/payment', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, stripePaymentIntentId } = req.body;
        const registration = await prisma_1.prisma.candidateRegistration.findFirst({
            where: {
                id,
                userId: req.user.id
            }
        });
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        if (!registration.idmeVerified) {
            return res.status(400).json({
                success: false,
                message: 'ID.me verification required before payment'
            });
        }
        // TODO: Integrate with actual payment processor (Stripe)
        // For now, simulate payment processing
        const paymentSuccessful = true;
        if (paymentSuccessful) {
            await prisma_1.prisma.candidateRegistration.update({
                where: { id },
                data: {
                    status: 'PENDING_APPROVAL',
                    paidAt: new Date(),
                    paymentIntentId: stripePaymentIntentId,
                    paymentMethod
                }
            });
            // TODO: Notify admins of new candidate pending approval
            metricsService_1.metricsService.incrementCounter('candidate_payments_success');
            res.json({
                success: true,
                message: 'Payment processed successfully',
                nextStep: 'admin_approval'
            });
        }
        else {
            metricsService_1.metricsService.incrementCounter('candidate_payments_failed');
            res.status(400).json({
                success: false,
                message: 'Payment processing failed'
            });
        }
    }
    catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process payment'
        });
    }
});
// POST /api/candidates/registration/:id/withdraw - Withdraw registration with potential refund
router.post('/registration/:id/withdraw', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const registration = await prisma_1.prisma.candidateRegistration.findFirst({
            where: {
                id,
                userId: req.user.id
            }
        });
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        if (registration.status === 'REJECTED' || registration.status === 'REFUNDED') {
            return res.status(400).json({
                success: false,
                message: 'Registration already closed'
            });
        }
        const now = new Date();
        const registrationTime = new Date(registration.createdAt);
        const hoursSinceRegistration = (now.getTime() - registrationTime.getTime()) / (1000 * 60 * 60);
        let refundEligible = false;
        let refundAmount = 0;
        // 48-hour no-questions-asked refund window
        if (hoursSinceRegistration <= 48) {
            refundEligible = true;
            refundAmount = registration.registrationFee || 0;
            // Create 7-day lockout record
            const lockoutUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await prisma_1.prisma.candidateRegistration.update({
                where: { id },
                data: {
                    status: 'REFUNDED',
                    rejectedAt: now,
                    rejectionReason: `Withdrawn by candidate: ${reason || 'No reason provided'}`,
                    refundIssued: true
                }
            });
            // TODO: Process actual refund through payment processor
            // TODO: Create lockout record to prevent re-registration for 7 days
            metricsService_1.metricsService.incrementCounter('candidate_registrations_withdrawn_48h');
            res.json({
                success: true,
                message: 'Registration withdrawn successfully',
                refund: {
                    eligible: true,
                    amount: refundAmount,
                    processing_time: '3-5 business days'
                },
                lockout: {
                    until: lockoutUntil,
                    message: 'You cannot register again for 7 days to prevent spam'
                }
            });
        }
        else {
            // Outside 48-hour window - mark as withdrawn but no automatic refund
            await prisma_1.prisma.candidateRegistration.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectedAt: now,
                    rejectionReason: `Withdrawn by candidate after 48h: ${reason || 'No reason provided'}`,
                    refundIssued: false
                }
            });
            metricsService_1.metricsService.incrementCounter('candidate_registrations_withdrawn_late');
            res.json({
                success: true,
                message: 'Registration withdrawn',
                refund: {
                    eligible: false,
                    message: '48-hour refund window has passed. Contact support@unitedwerise.org for special circumstances.'
                }
            });
        }
    }
    catch (error) {
        console.error('Error withdrawing registration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process withdrawal'
        });
    }
});
// POST /api/candidates/request-waiver - Request fee waiver
router.post('/request-waiver', auth_1.requireAuth, async (req, res) => {
    try {
        const { registrationId, waiverType, reason, documentation } = req.body;
        const registration = await prisma_1.prisma.candidateRegistration.findFirst({
            where: {
                id: registrationId,
                userId: req.user.id,
                status: { in: ['PENDING_VERIFICATION', 'PENDING_PAYMENT'] }
            }
        });
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found or not eligible for waiver'
            });
        }
        // Update registration to show waiver requested
        await prisma_1.prisma.candidateRegistration.update({
            where: { id: registrationId },
            data: {
                feeWaiverStatus: waiverType === 'hardship' ? 'hardship_pending' : 'community_pending',
                hardshipReason: reason
            }
        });
        // TODO: Notify admins of waiver request
        // TODO: Store documentation files
        metricsService_1.metricsService.incrementCounter('candidate_waiver_requests', { type: waiverType });
        res.json({
            success: true,
            message: 'Waiver request submitted for admin review',
            estimatedReview: '2-3 business days',
            contact: 'waivers@unitedwerise.org'
        });
    }
    catch (error) {
        console.error('Error requesting waiver:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit waiver request'
        });
    }
});
// GET /api/candidates/my-registrations - Get user's candidate registrations
router.get('/my-registrations', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const registrations = await prisma_1.prisma.candidateRegistration.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        // Check for any active lockouts
        const now = new Date();
        const recentWithdrawals = registrations.filter(r => r.status === 'REFUNDED' &&
            r.rejectedAt &&
            (now.getTime() - new Date(r.rejectedAt).getTime()) < (7 * 24 * 60 * 60 * 1000));
        const isLocked = recentWithdrawals.length > 0;
        const lockoutUntil = isLocked ? new Date(new Date(recentWithdrawals[0].rejectedAt).getTime() + 7 * 24 * 60 * 60 * 1000) : null;
        res.json({
            success: true,
            registrations,
            count: registrations.length,
            lockout: {
                active: isLocked,
                until: lockoutUntil,
                message: isLocked ? 'Registration locked due to recent withdrawal. Please wait before registering again.' : null
            }
        });
    }
    catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registrations'
        });
    }
});
exports.default = router;
//# sourceMappingURL=candidates.js.map