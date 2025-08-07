import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ElectionService } from '../services/electionService';
import { metricsService } from '../services/metricsService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/elections:
 *   get:
 *     tags: [Elections]
 *     summary: Get elections by location
 *     description: Retrieve upcoming elections based on user's location or search parameters
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}$'
 *         description: Two-letter state code
 *       - in: query
 *         name: zipCode
 *         schema:
 *           type: string
 *         description: ZIP code for more precise location matching
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [FEDERAL, STATE, LOCAL, MUNICIPAL]
 *         description: Election level filter
 *       - in: query
 *         name: includeUpcoming
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include only upcoming elections
 *     responses:
 *       200:
 *         description: List of elections matching criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elections:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Election'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
// Get elections by location
router.get('/', async (req, res) => {
  try {
    const { state, zipCode, level, includeUpcoming } = req.query;
    
    const searchParams = {
      state: state as string,
      zipCode: zipCode as string,
      level: level as any,
      includeUpcoming: includeUpcoming !== 'false'
    };
    
    const elections = await ElectionService.getElectionsByLocation(searchParams);
    
    // Track election searches for analytics
    metricsService.incrementCounter('election_searches_total', {
      state: state as string || 'unknown',
      level: level as string || 'all'
    });
    
    res.json({
      elections,
      count: elections.length
    });
  } catch (error) {
    console.error('Election search error:', error);
    res.status(500).json({ error: 'Failed to retrieve elections' });
  }
});

/**
 * @swagger
 * /api/elections/{id}:
 *   get:
 *     tags: [Elections]
 *     summary: Get election details
 *     description: Get comprehensive details for a specific election
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Election ID
 *     responses:
 *       200:
 *         description: Election details with offices, candidates, and ballot measures
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found
 */
// Get specific election
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const election = await ElectionService.getElectionById(id);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    res.json(election);
  } catch (error) {
    console.error('Election retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve election details' });
  }
});

/**
 * @swagger
 * /api/elections/{id}/candidates:
 *   get:
 *     tags: [Elections]
 *     summary: Get candidates for election
 *     description: Get all candidates running in a specific election
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Election ID
 *       - in: query
 *         name: party
 *         schema:
 *           type: string
 *         description: Filter by political party
 *       - in: query
 *         name: office
 *         schema:
 *           type: string
 *         description: Filter by specific office ID
 *     responses:
 *       200:
 *         description: List of candidates in the election
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *       404:
 *         description: Election not found
 */
// Get candidates for specific election
router.get('/:id/candidates', async (req, res) => {
  try {
    const { id } = req.params;
    const { party, office } = req.query;
    
    // Verify election exists
    const election = await prisma.election.findUnique({
      where: { id }
    });
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    const searchParams = {
      electionId: id,
      party: party as string,
      officeId: office as string
    };
    
    const candidates = await ElectionService.searchCandidates(searchParams);
    
    res.json({
      candidates,
      count: candidates.length,
      election: {
        id: election.id,
        name: election.name,
        date: election.date
      }
    });
  } catch (error) {
    console.error('Candidate retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve candidates' });
  }
});

/**
 * @swagger
 * /api/elections/{id}/register-candidate:
 *   post:
 *     tags: [Elections]
 *     summary: Register as candidate
 *     description: Register the authenticated user as a candidate for an office in an election
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Election ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - officeId
 *               - name
 *             properties:
 *               officeId:
 *                 type: string
 *                 description: Office ID to run for
 *               name:
 *                 type: string
 *                 description: Candidate name as it should appear
 *               party:
 *                 type: string
 *                 description: Political party affiliation
 *               platformSummary:
 *                 type: string
 *                 description: Brief campaign platform summary
 *               keyIssues:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Key campaign issues
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
 *       201:
 *         description: Candidate registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidate'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Register as candidate
router.post('/:id/register-candidate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: electionId } = req.params;
    const userId = req.user!.id;
    const candidateData = req.body;
    
    if (!candidateData.officeId || !candidateData.name) {
      return res.status(400).json({
        error: 'Office ID and candidate name are required'
      });
    }
    
    // Verify office belongs to this election
    const office = await prisma.office.findFirst({
      where: {
        id: candidateData.officeId,
        electionId
      },
      include: { election: true }
    });
    
    if (!office) {
      return res.status(400).json({
        error: 'Office not found in this election'
      });
    }
    
    const candidate = await ElectionService.createCandidateProfile(userId, candidateData);
    
    // Track candidate registration
    metricsService.incrementCounter('candidate_registrations_total', {
      election_level: office.election.level,
      office_level: office.level
    });
    
    res.status(201).json({
      message: 'Candidate registration successful',
      candidate
    });
  } catch (error: any) {
    console.error('Candidate registration error:', error);
    
    if (error.message.includes('already registered') || 
        error.message.includes('not found') ||
        error.message.includes('not active') ||
        error.message.includes('past elections')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to register candidate' });
  }
});

/**
 * @swagger
 * /api/elections/candidates/compare:
 *   post:
 *     tags: [Elections]
 *     summary: Compare candidates
 *     description: Compare multiple candidates side-by-side
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateIds
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 2
 *                 description: Array of candidate IDs to compare
 *     responses:
 *       200:
 *         description: Candidate comparison data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *                 comparisonMatrix:
 *                   type: object
 *                   description: Issue-by-issue comparison data
 *       400:
 *         description: Invalid candidate selection
 */
// Compare candidates
router.post('/candidates/compare', async (req, res) => {
  try {
    const { candidateIds } = req.body;
    
    if (!Array.isArray(candidateIds) || candidateIds.length < 2) {
      return res.status(400).json({
        error: 'At least 2 candidate IDs required for comparison'
      });
    }
    
    const candidates = await ElectionService.compareCandidates(candidateIds);
    
    if (candidates.length < 2) {
      return res.status(400).json({
        error: 'Not enough valid candidates found for comparison'
      });
    }
    
    // Generate comparison matrix (future: use AI for issue similarity)
    const comparisonMatrix = {
      issues: {}, // Will be populated by AI service
      experience: {},
      fundraising: {},
      endorsements: {}
    };
    
    // Track candidate comparisons
    metricsService.incrementCounter('candidate_comparisons_total');
    
    res.json({
      candidates,
      comparisonMatrix,
      count: candidates.length
    });
  } catch (error) {
    console.error('Candidate comparison error:', error);
    res.status(500).json({ error: 'Failed to compare candidates' });
  }
});

export default router;