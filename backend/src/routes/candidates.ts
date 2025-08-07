import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ElectionService } from '../services/electionService';
import { metricsService } from '../services/metricsService';

const router = express.Router();
const prisma = new PrismaClient();

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
router.delete('/:id/endorse', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: candidateId } = req.params;
    const userId = req.user!.id;
    
    await ElectionService.removeEndorsement(userId, candidateId);
    
    res.json({ message: 'Endorsement removed successfully' });
  } catch (error: any) {
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
    console.error('Withdrawal error:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(error.message.includes('access denied') ? 403 : 404)
        .json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to withdraw candidacy' });
  }
});

export default router;