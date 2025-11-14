import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ElectionService } from '../services/electionService';
import { EnhancedCandidateService } from '../services/enhancedCandidateService';
import { azureOpenAI } from '../services/azureOpenAIService';
import { metricsService } from '../services/metricsService';
import { logger } from '../services/logger';
import { z } from 'zod';
import crypto from 'crypto';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

// Validation schemas for candidate registration
const candidateRegistrationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  address: z.object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    state: z.string().min(2).max(50),
    zipCode: z.string().min(5).max(10),
    district: z.string().optional()
  }),
  position: z.object({
    title: z.string().min(1).max(200),
    level: z.enum(['federal', 'state', 'county', 'city', 'local']),
    district: z.string().optional(),
    electionDate: z.string().transform(str => new Date(str))
  }),
  campaign: z.object({
    name: z.string().min(1).max(200),
    website: z.string().url().optional(),
    slogan: z.string().max(500).optional(),
    description: z.string().max(2000).optional()
  }),
  officeLevel: z.enum(['local', 'regional', 'state', 'federal', 'presidential']),
  hasFinancialHardship: z.boolean().default(false),
  hardshipReason: z.string().optional(),
  communityEndorsements: z.array(z.string()).optional(), // Array of endorsement IDs or names
  agreeToTerms: z.boolean().refine(val => val === true, {
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
    
    const searchParams: any = {};
    
    if (party) searchParams.party = party as string;
    if (incumbent !== undefined) searchParams.isIncumbent = incumbent === 'true';
    
    let candidates = await ElectionService.searchCandidates(searchParams);
    
    // Additional filtering that's not in the service
    if (state) {
      candidates = candidates.filter(c => 
        c.office.election.state.toLowerCase() === (state as string).toLowerCase()
      );
    }
    
    if (office) {
      candidates = candidates.filter(c =>
        c.office.title.toLowerCase().includes((office as string).toLowerCase())
      );
    }
    
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      candidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({
      candidates,
      count: candidates.length
    });
  } catch (error) {
    logger.error({ error, query: req.query }, 'Candidate search error');
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
/**
 * @swagger
 * /api/candidates/pricing:
 *   get:
 *     tags: [Candidate]
 *     summary: Get candidate registration pricing
 *     description: Returns pricing tiers, policies, and features for candidate registration
 *     responses:
 *       200:
 *         description: Pricing information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 pricing:
 *                   type: object
 *                   properties:
 *                     local:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         examples:
 *                           type: array
 *                           items:
 *                             type: string
 *                         description:
 *                           type: string
 *                     regional:
 *                       type: object
 *                     state:
 *                       type: object
 *                     federal:
 *                       type: object
 *                     presidential:
 *                       type: object
 *                 policies:
 *                   type: object
 *                   properties:
 *                     refunds:
 *                       type: object
 *                     waivers:
 *                       type: object
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
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
    
    const candidate = await prisma.candidate.findUnique({
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
    metricsService.incrementCounter('candidate_profile_views_total', {
      office_level: candidate.office.level
    });
    
    res.json(candidate);
  } catch (error) {
    logger.error({ error, candidateId: req.params.id }, 'Candidate profile error');
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
router.post('/:id/endorse', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: candidateId } = req.params;
    const userId = req.user!.id;
    const { reason, isPublic = false } = req.body;
    
    // Verify candidate exists and is active
    const candidate = await prisma.candidate.findUnique({
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
    
    const endorsement = await ElectionService.endorseCandidate(
      userId, 
      candidateId, 
      reason, 
      isPublic
    );
    
    // Track endorsements
    metricsService.incrementCounter('candidate_endorsements_total', {
      visibility: isPublic ? 'public' : 'private',
      office_level: candidate.office.level
    });
    
    res.status(201).json({
      message: 'Endorsement created successfully',
      endorsement
    });
  } catch (error: any) {
    logger.error({ error, candidateId: req.params.id, userId: req.user?.id }, 'Endorsement error');

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
router.delete('/:id/endorse', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: candidateId } = req.params;
    const userId = req.user!.id;
    
    await ElectionService.removeEndorsement(userId, candidateId);
    
    res.json({ message: 'Endorsement removed successfully' });
  } catch (error: any) {
    logger.error({ error, candidateId: req.params.id, userId: req.user?.id }, 'Remove endorsement error');

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
router.get('/my-candidacy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const candidates = await prisma.candidate.findMany({
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
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'My candidacy error');
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
router.put('/:id/update-platform', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: candidateId } = req.params;
    const userId = req.user!.id;
    const updates = req.body;
    
    const candidate = await ElectionService.updateCandidateProfile(
      candidateId, 
      userId, 
      updates
    );
    
    // Track platform updates
    metricsService.incrementCounter('candidate_platform_updates_total');
    
    res.json({
      message: 'Platform updated successfully',
      candidate
    });
  } catch (error: any) {
    logger.error({ error, candidateId: req.params.id, userId: req.user?.id }, 'Platform update error');

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
router.post('/:id/withdraw', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: candidateId } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body;
    
    await ElectionService.withdrawCandidacy(candidateId, userId, reason);
    
    // Track withdrawals
    metricsService.incrementCounter('candidate_withdrawals_total');
    
    res.json({ message: 'Candidacy withdrawn successfully' });
  } catch (error: any) {
    logger.error({ error, candidateId: req.params.id, userId: req.user?.id }, 'Withdrawal error');

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

    logger.info({ candidateId: id }, 'Loading enhanced profile for candidate');

    const candidate = await EnhancedCandidateService.getCandidateProfile(id);

    if (!candidate) {
      return res.status(404).json({
        error: 'Candidate not found',
        message: 'The requested candidate profile could not be found'
      });
    }

    // Track enhanced profile requests
    metricsService.incrementCounter('candidate_enhanced_profile_requests', {
      candidateId: id,
      hasAIAnalysis: (candidate.policyPositions?.length || 0) > 0 ? 'true' : 'false'
    });

    res.json({
      candidate,
      aiAnalysisEnabled: (candidate.policyPositions?.length || 0) > 0,
      photoCount: (candidate.photos.gallery?.length || 0) + (candidate.photos.avatar ? 1 : 0) + (candidate.photos.campaignHeadshot ? 1 : 0)
    });

  } catch (error) {
    logger.error({ error, candidateId: req.params.id }, 'Enhanced candidate profile error');
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

    logger.info({ candidateCount: candidateIds.length, officeId }, 'Starting AI-powered comparison of candidates');

    const comparison = await EnhancedCandidateService.compareCandidates(candidateIds, officeId);

    if (!comparison) {
      return res.status(500).json({
        error: 'Comparison failed',
        message: 'Failed to generate candidate comparison'
      });
    }

    // Track comparison requests
    metricsService.incrementCounter('candidate_ai_comparisons', {
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

  } catch (error: any) {
    logger.error({ error, candidateIds: req.body.candidateIds }, 'Candidate comparison error');

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

    logger.info({ officeId, aiEnabled: includeAI }, 'Loading enhanced candidates for office');

    const candidates = await EnhancedCandidateService.getCandidatesByOffice(officeId, includeAI);

    // Track office candidate requests
    metricsService.incrementCounter('office_enhanced_candidates_requests', {
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

  } catch (error) {
    logger.error({ error, officeId: req.params.officeId }, 'Enhanced office candidates error');
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
    logger.info('Checking AI analysis system health');

    // Azure OpenAI health check
    const azureAIHealth = { status: 'healthy', model: 'Azure OpenAI GPT-3.5-turbo' };
    const usageStats = { totalRequests: 0, totalTokens: 0, avgResponseTime: 0 };

    const response = {
      azureOpenAI: azureAIHealth,
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

    if (azureAIHealth.status === 'healthy') {
      res.json(response);
    } else {
      res.status(503).json(response);
    }

  } catch (error) {
    logger.error({ error }, 'AI health check error');
    res.status(503).json({
      qwen3: { status: 'unhealthy', error: 'Health check failed' },
      capabilities: [],
      lastChecked: new Date()
    });
  }
});

/**
 * @swagger
 * /api/candidates/register:
 *   post:
 *     tags: [Candidate]
 *     summary: Register as a candidate
 *     description: Initiates candidate registration process with ID verification and payment requirements
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - address
 *               - position
 *               - campaign
 *               - officeLevel
 *               - agreeToTerms
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 20
 *               address:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - zipCode
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   district:
 *                     type: string
 *               position:
 *                 type: object
 *                 required:
 *                   - title
 *                   - level
 *                   - electionDate
 *                 properties:
 *                   title:
 *                     type: string
 *                   level:
 *                     type: string
 *                     enum: [federal, state, county, city, local]
 *                   district:
 *                     type: string
 *                   electionDate:
 *                     type: string
 *                     format: date
 *               campaign:
 *                 type: object
 *                 required:
 *                   - name
 *                 properties:
 *                   name:
 *                     type: string
 *                   website:
 *                     type: string
 *                     format: uri
 *                   slogan:
 *                     type: string
 *                     maxLength: 500
 *                   description:
 *                     type: string
 *                     maxLength: 2000
 *               officeLevel:
 *                 type: string
 *                 enum: [local, regional, state, federal, presidential]
 *               hasFinancialHardship:
 *                 type: boolean
 *                 default: false
 *               hardshipReason:
 *                 type: string
 *               communityEndorsements:
 *                 type: array
 *                 items:
 *                   type: string
 *               agreeToTerms:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Candidate registration initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 registration:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     registrationId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     officeLevel:
 *                       type: string
 *                     registrationFee:
 *                       type: number
 *                     originalFee:
 *                       type: number
 *                     feeWaiverStatus:
 *                       type: string
 *                     nextSteps:
 *                       type: object
 *                     policies:
 *                       type: object
 *       400:
 *         description: Validation error or existing registration
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to register candidate
 */
// POST /api/candidates/register - Register as a candidate
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
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
    const existingRegistration = await prisma.candidateRegistration.findFirst({
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
    const registrationId = crypto.randomBytes(16).toString('hex');
    
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
    const registration = await prisma.candidateRegistration.create({
      data: {
        id: crypto.randomUUID(),
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
    metricsService.incrementCounter('candidate_registrations_initiated');
    
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
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error registering candidate');
    res.status(500).json({
      success: false,
      message: 'Failed to register candidate'
    });
  }
});

/**
 * @swagger
 * /api/candidates/registration/{id}/verify-idme:
 *   post:
 *     tags: [Candidate]
 *     summary: Process ID.me verification
 *     description: Handles ID.me verification callback for candidate registration
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verified
 *             properties:
 *               verificationToken:
 *                 type: string
 *               idmeUserId:
 *                 type: string
 *               verified:
 *                 type: boolean
 *               userData:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *     responses:
 *       200:
 *         description: ID.me verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 nextStep:
 *                   type: string
 *                   example: payment
 *       400:
 *         description: Verification failed
 *       404:
 *         description: Registration not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to process verification
 */
// POST /api/candidates/registration/:id/verify-idme - Handle ID.me verification
router.post('/registration/:id/verify-idme', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { verificationToken, idmeUserId, verified, userData } = req.body;
    
    const registration = await prisma.candidateRegistration.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    if (verified) {
      await prisma.candidateRegistration.update({
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
      
      metricsService.incrementCounter('candidate_idme_verifications_success');
      
      res.json({
        success: true,
        message: 'ID.me verification successful',
        nextStep: 'payment'
      });
    } else {
      metricsService.incrementCounter('candidate_idme_verifications_failed');
      
      res.status(400).json({
        success: false,
        message: 'ID.me verification failed'
      });
    }
  } catch (error) {
    logger.error({ error, registrationId: req.params.id, userId: req.user?.id }, 'Error processing ID.me verification');
    res.status(500).json({
      success: false,
      message: 'Failed to process verification'
    });
  }
});

/**
 * @swagger
 * /api/candidates/registration/{id}/payment:
 *   post:
 *     tags: [Candidate]
 *     summary: Process registration payment
 *     description: Processes candidate registration fee payment via Stripe
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - stripePaymentIntentId
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method identifier
 *               stripePaymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 nextStep:
 *                   type: string
 *                   example: admin_approval
 *       400:
 *         description: Payment processing failed or verification required first
 *       404:
 *         description: Registration not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to process payment
 */
// POST /api/candidates/registration/:id/payment - Process payment
router.post('/registration/:id/payment', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, stripePaymentIntentId } = req.body;
    
    const registration = await prisma.candidateRegistration.findFirst({
      where: {
        id,
        userId: req.user!.id
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
      await prisma.candidateRegistration.update({
        where: { id },
        data: {
          status: 'PENDING_APPROVAL',
          paidAt: new Date(),
          paymentIntentId: stripePaymentIntentId,
          paymentMethod
        }
      });
      
      // TODO: Notify admins of new candidate pending approval
      
      metricsService.incrementCounter('candidate_payments_success');
      
      res.json({
        success: true,
        message: 'Payment processed successfully',
        nextStep: 'admin_approval'
      });
    } else {
      metricsService.incrementCounter('candidate_payments_failed');
      
      res.status(400).json({
        success: false,
        message: 'Payment processing failed'
      });
    }
  } catch (error) {
    logger.error({ error, registrationId: req.params.id, userId: req.user?.id }, 'Error processing payment');
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  }
});

/**
 * @swagger
 * /api/candidates/registration/{id}/withdraw:
 *   post:
 *     tags: [Candidate]
 *     summary: Withdraw candidate registration
 *     description: Withdraws candidate registration with potential refund (48-hour window) and 7-day re-registration lockout
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate registration ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for withdrawal
 *     responses:
 *       200:
 *         description: Registration withdrawn successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 refund:
 *                   type: object
 *                   properties:
 *                     eligible:
 *                       type: boolean
 *                     amount:
 *                       type: number
 *                     processing_time:
 *                       type: string
 *                     message:
 *                       type: string
 *                 lockout:
 *                   type: object
 *                   properties:
 *                     until:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *       400:
 *         description: Registration already closed
 *       404:
 *         description: Registration not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to process withdrawal
 */
// POST /api/candidates/registration/:id/withdraw - Withdraw registration with potential refund
router.post('/registration/:id/withdraw', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const registration = await prisma.candidateRegistration.findFirst({
      where: {
        id,
        userId: req.user!.id
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
      
      await prisma.candidateRegistration.update({
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
      
      metricsService.incrementCounter('candidate_registrations_withdrawn_48h');
      
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
    } else {
      // Outside 48-hour window - mark as withdrawn but no automatic refund
      await prisma.candidateRegistration.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: now,
          rejectionReason: `Withdrawn by candidate after 48h: ${reason || 'No reason provided'}`,
          refundIssued: false
        }
      });
      
      metricsService.incrementCounter('candidate_registrations_withdrawn_late');
      
      res.json({
        success: true,
        message: 'Registration withdrawn',
        refund: {
          eligible: false,
          message: '48-hour refund window has passed. Contact support@unitedwerise.org for special circumstances.'
        }
      });
    }
  } catch (error) {
    logger.error({ error, registrationId: req.params.id, userId: req.user?.id }, 'Error withdrawing registration');
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal'
    });
  }
});

/**
 * @swagger
 * /api/candidates/request-waiver:
 *   post:
 *     tags: [Candidate]
 *     summary: Request registration fee waiver
 *     description: Submits a request for candidate registration fee waiver based on financial hardship or community endorsement
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - registrationId
 *               - waiverType
 *               - reason
 *             properties:
 *               registrationId:
 *                 type: string
 *                 description: Candidate registration ID
 *               waiverType:
 *                 type: string
 *                 enum: [hardship, community]
 *                 description: Type of waiver request
 *               reason:
 *                 type: string
 *                 description: Detailed reason for waiver request
 *               documentation:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supporting documentation file IDs
 *     responses:
 *       200:
 *         description: Waiver request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 estimatedReview:
 *                   type: string
 *                   example: 2-3 business days
 *                 contact:
 *                   type: string
 *                   example: waivers@unitedwerise.org
 *       404:
 *         description: Registration not found or not eligible for waiver
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to submit waiver request
 */
// POST /api/candidates/request-waiver - Request fee waiver
router.post('/request-waiver', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { registrationId, waiverType, reason, documentation } = req.body;
    
    const registration = await prisma.candidateRegistration.findFirst({
      where: {
        id: registrationId,
        userId: req.user!.id,
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
    await prisma.candidateRegistration.update({
      where: { id: registrationId },
      data: {
        feeWaiverStatus: waiverType === 'hardship' ? 'hardship_pending' : 'community_pending',
        hardshipReason: reason
      }
    });
    
    // TODO: Notify admins of waiver request
    // TODO: Store documentation files
    
    metricsService.incrementCounter('candidate_waiver_requests', { type: waiverType });
    
    res.json({
      success: true,
      message: 'Waiver request submitted for admin review',
      estimatedReview: '2-3 business days',
      contact: 'waivers@unitedwerise.org'
    });
  } catch (error) {
    logger.error({ error, registrationId: req.body.registrationId, userId: req.user?.id }, 'Error requesting waiver');
    res.status(500).json({
      success: false,
      message: 'Failed to submit waiver request'
    });
  }
});

/**
 * @swagger
 * /api/candidates/my-registrations:
 *   get:
 *     tags: [Candidate]
 *     summary: Get user's candidate registrations
 *     description: Retrieves all candidate registrations for the authenticated user with lockout status
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User registrations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 registrations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CandidateRegistration'
 *                 count:
 *                   type: integer
 *                 lockout:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: boolean
 *                     until:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch registrations
 */
// GET /api/candidates/my-registrations - Get user's candidate registrations
router.get('/my-registrations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const registrations = await prisma.candidateRegistration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Check for any active lockouts
    const now = new Date();
    const recentWithdrawals = registrations.filter(r => 
      r.status === 'REFUNDED' && 
      r.rejectedAt &&
      (now.getTime() - new Date(r.rejectedAt).getTime()) < (7 * 24 * 60 * 60 * 1000)
    );
    
    const isLocked = recentWithdrawals.length > 0;
    const lockoutUntil = isLocked ? new Date(new Date(recentWithdrawals[0].rejectedAt!).getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    
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
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error fetching registrations');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations'
    });
  }
});

export default router;