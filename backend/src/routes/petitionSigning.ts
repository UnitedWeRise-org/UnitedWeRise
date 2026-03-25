/**
 * Petition Signing API Routes
 *
 * Handles petition creation, management, public signing, signature tracking,
 * QR code generation, and audit logging for the Unified Digital Petition System.
 */

import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { petitionSigningService } from '../services/petitionSigningService';
import { petitionAuditService } from '../services/petitionAuditService';
import { voterVerificationService } from '../services/voterVerificationService';
import { captchaService } from '../services/captchaService';
import { verificationBillingService } from '../services/verificationBillingService';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { petitionSigningLimiter } from '../middleware/rateLimiting';
import { prisma } from '../lib/prisma';
import { logger } from '../services/logger';
import { safePaginationParams } from '../utils/safeJson';

const router = express.Router();

/**
 * PUBLIC ENDPOINTS
 */

/**
 * @swagger
 * /api/petitions/sign/{code}:
 *   get:
 *     tags: [Petition Signing]
 *     summary: Get petition data for signing form
 *     description: Retrieves petition details for the public signing form. Uses optional auth to pre-populate fields if the user is logged in. The code param can be a shortCode or customSlug.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition shortCode or customSlug
 *     responses:
 *       200:
 *         description: Petition data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Petition details for signing form
 *       400:
 *         description: Invalid petition code
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to fetch petition data
 */
router.get('/sign/:code',
  optionalAuth,
  [
    param('code').isString().trim().notEmpty().withMessage('Petition code is required')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user?.id || null;
      const result = await petitionSigningService.getPetitionForSigning(req.params.code);

      if (!result) {
        return res.status(404).json({ error: 'Petition not found' });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, code: req.params.code }, 'Get petition for signing error');
      res.status(500).json({
        error: error.message || 'Failed to fetch petition data'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/sign/{code}:
 *   post:
 *     tags: [Petition Signing]
 *     summary: Submit a petition signature
 *     description: Submits a signature for a petition. Requires CAPTCHA verification. Rate limited. No authentication required.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition shortCode or customSlug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signerFirstName
 *               - signerLastName
 *               - signatureConfirmation
 *               - attestedAt
 *               - attestationLanguageShown
 *               - privacyConsented
 *               - captchaToken
 *             properties:
 *               signerFirstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Signer's first name
 *               signerLastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Signer's last name
 *               signatureConfirmation:
 *                 type: string
 *                 description: Signature confirmation text
 *               attestedAt:
 *                 type: string
 *                 format: date-time
 *                 description: ISO8601 timestamp of attestation
 *               attestationLanguageShown:
 *                 type: string
 *                 description: The attestation language displayed to the signer
 *               privacyConsented:
 *                 type: boolean
 *                 description: Must be true to submit signature
 *               captchaToken:
 *                 type: string
 *                 description: CAPTCHA verification token
 *               signerAddress:
 *                 type: string
 *                 description: Signer's street address
 *               signerCity:
 *                 type: string
 *                 description: Signer's city
 *               signerState:
 *                 type: string
 *                 description: Signer's state
 *               signerZip:
 *                 type: string
 *                 description: Signer's ZIP code
 *               signerCounty:
 *                 type: string
 *                 description: Signer's county
 *               signerDateOfBirth:
 *                 type: string
 *                 description: Signer's date of birth
 *               signerEmail:
 *                 type: string
 *                 format: email
 *                 description: Signer's email address
 *               geolocation:
 *                 type: object
 *                 description: Geolocation data at time of signing
 *               geolocationConsented:
 *                 type: boolean
 *                 description: Whether signer consented to geolocation
 *               userId:
 *                 type: string
 *                 description: User ID if the signer is logged in
 *     responses:
 *       201:
 *         description: Signature submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Signature confirmation details
 *       400:
 *         description: Validation error or invalid signature data
 *       404:
 *         description: Petition not found
 *       429:
 *         description: Too many signature submissions
 *       500:
 *         description: Failed to submit signature
 */
router.post('/sign/:code',
  petitionSigningLimiter,
  [
    param('code').isString().trim().notEmpty().withMessage('Petition code is required'),
    body('signerFirstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required (1-100 characters)'),
    body('signerLastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required (1-100 characters)'),
    body('signatureConfirmation').notEmpty().withMessage('Signature confirmation is required'),
    body('attestedAt').isISO8601().withMessage('Attested at must be a valid ISO8601 date'),
    body('attestationLanguageShown').notEmpty().withMessage('Attestation language shown is required'),
    body('privacyConsented').custom((value) => value === true || value === 'true').withMessage('Privacy consent is required'),
    body('captchaToken').notEmpty().withMessage('CAPTCHA token is required'),
    body('signerAddress').optional().isString().trim(),
    body('signerCity').optional().isString().trim(),
    body('signerState').optional().isString().trim(),
    body('signerZip').optional().isString().trim(),
    body('signerCounty').optional().isString().trim(),
    body('signerDateOfBirth').optional().isString().trim(),
    body('signerEmail').optional().isEmail().withMessage('Invalid email address'),
    body('geolocation').optional().isObject().withMessage('Geolocation must be an object'),
    body('geolocationConsented').optional().isBoolean(),
    body('userId').optional().isString().trim()
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      // Resolve short code to petition first
      const petition = await petitionSigningService.getPetitionForSigning(req.params.code);
      if (!petition) {
        return res.status(404).json({ error: 'Petition not found' });
      }

      const signatureData = {
        ...req.body,
        userId: (req as any).user?.id || undefined
      };

      const deviceInfo = {
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        deviceFingerprint: req.body.deviceFingerprint || undefined
      };

      const petitionRecord = (petition as unknown as { petition: { id: string } }).petition;
      const result = await petitionSigningService.submitSignature(petitionRecord.id, signatureData, deviceInfo);

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, code: req.params.code }, 'Submit signature error');

      if (error.message === 'Petition not found') {
        return res.status(404).json({ error: 'Petition not found' });
      }

      if (error.code) {
        return res.status(400).json({ error: error.message, code: error.code });
      }

      res.status(500).json({
        error: error.message || 'Failed to submit signature'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/verify-registration:
 *   post:
 *     tags: [Petition Signing]
 *     summary: Verify voter registration for a petition signer
 *     description: Checks voter registration status against state voter files before signing. Requires CAPTCHA. Consumes one verification credit from the campaign's balance. Rate limited.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petitionId
 *               - signerFirstName
 *               - signerLastName
 *               - signerAddress
 *               - signerCity
 *               - signerState
 *               - signerZip
 *               - captchaToken
 *             properties:
 *               petitionId:
 *                 type: string
 *                 description: Petition ID to verify against
 *               signerFirstName:
 *                 type: string
 *                 description: Signer's first name
 *               signerLastName:
 *                 type: string
 *                 description: Signer's last name
 *               signerAddress:
 *                 type: string
 *                 description: Signer's street address
 *               signerCity:
 *                 type: string
 *                 description: Signer's city
 *               signerState:
 *                 type: string
 *                 description: Signer's two-letter state code
 *               signerZip:
 *                 type: string
 *                 description: Signer's ZIP code
 *               captchaToken:
 *                 type: string
 *                 description: CAPTCHA verification token
 *     responses:
 *       200:
 *         description: Verification result returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     verified:
 *                       type: boolean
 *                     result:
 *                       type: object
 *                       properties:
 *                         matched:
 *                           type: boolean
 *                         voterId:
 *                           type: string
 *                           nullable: true
 *                         partyEnrollment:
 *                           type: string
 *                           nullable: true
 *                         registrationStatus:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: Validation error or verification unavailable
 *       404:
 *         description: Petition not found
 *       429:
 *         description: Rate limited
 *       500:
 *         description: Server error
 */
router.post('/verify-registration',
  petitionSigningLimiter,
  [
    body('petitionId').isString().notEmpty().withMessage('Petition ID is required'),
    body('signerFirstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
    body('signerLastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
    body('signerAddress').trim().isLength({ min: 1 }).withMessage('Address is required'),
    body('signerCity').trim().isLength({ min: 1 }).withMessage('City is required'),
    body('signerState').trim().isLength({ min: 2, max: 2 }).withMessage('State must be a 2-letter code'),
    body('signerZip').trim().isLength({ min: 5, max: 10 }).withMessage('ZIP code is required'),
    body('captchaToken').notEmpty().withMessage('CAPTCHA token is required'),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const {
        petitionId,
        signerFirstName,
        signerLastName,
        signerAddress,
        signerCity,
        signerState,
        signerZip,
        captchaToken,
      } = req.body;

      // Verify CAPTCHA
      const captchaResult = await captchaService.verifyCaptcha(
        captchaToken,
        req.ip || undefined
      );

      if (!captchaResult.success) {
        return res.status(400).json({
          error: captchaResult.error || 'CAPTCHA verification failed',
        });
      }

      // Look up petition to get candidateId
      const petition = await prisma.petition.findUnique({
        where: { id: petitionId },
        select: { id: true, candidateId: true, voterVerificationEnabled: true },
      });

      if (!petition) {
        return res.status(404).json({ error: 'Petition not found' });
      }

      if (!petition.candidateId) {
        return res.status(400).json({
          error: 'Only candidate petitions support voter verification',
        });
      }

      // Check verification balance
      const hasCredits = await verificationBillingService.hasAvailableCredits(
        petition.candidateId
      );

      if (!hasCredits) {
        return res.json({
          success: true,
          data: {
            verified: false,
            error: 'verification_unavailable',
            message: 'Voter verification is currently unavailable for this petition.',
          },
        });
      }

      // Call voter verification service
      const result = await voterVerificationService.verify(
        signerState,
        signerFirstName,
        signerLastName,
        signerAddress,
        signerCity,
        signerZip
      );

      // If API error occurred, don't consume credit
      if (result.errorMessage) {
        return res.json({
          success: true,
          data: {
            verified: false,
            error: 'verification_error',
            message: 'Unable to verify voter registration at this time. Please try again later.',
          },
        });
      }

      // Verification succeeded (match or no match) — consume credit
      const consumed = await verificationBillingService.consumeCredit(petition.candidateId);
      if (!consumed) {
        logger.warn(
          { petitionId, candidateId: petition.candidateId },
          'Credit consumption failed after successful verification'
        );
      }

      // Check if usage alert should be sent
      await verificationBillingService.checkUsageAlert(petition.candidateId);

      res.json({
        success: true,
        data: {
          verified: true,
          result: {
            matched: result.matched,
            voterId: result.voterId,
            partyEnrollment: result.partyEnrollment,
            registrationStatus: result.registrationStatus,
          },
        },
      });
    } catch (error: any) {
      logger.error(
        { error, petitionId: req.body?.petitionId },
        'Voter registration verification error'
      );
      res.status(500).json({
        error: 'Failed to verify voter registration',
      });
    }
  }
);

/**
 * AUTHENTICATED ENDPOINTS
 */

/**
 * @swagger
 * /api/petitions/create:
 *   post:
 *     tags: [Petition Signing]
 *     summary: Create a new petition
 *     description: Creates a new petition with the authenticated user as the creator
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Petition title
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 description: Petition description
 *               petitionCategory:
 *                 type: string
 *                 description: Category of the petition
 *               signatureGoal:
 *                 type: integer
 *                 description: Target number of signatures
 *               requiredSignerFields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Fields required from signers
 *               declarationLanguage:
 *                 type: string
 *                 description: Custom attestation language
 *               voterVerificationEnabled:
 *                 type: boolean
 *                 description: Whether voter verification is enabled
 *               party:
 *                 type: string
 *                 description: Political party association
 *               electionYear:
 *                 type: integer
 *                 description: Associated election year
 *               filingDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Filing deadline
 *               customSlug:
 *                 type: string
 *                 description: Custom URL slug for the petition
 *               privacyConsentText:
 *                 type: string
 *                 description: Custom privacy consent text
 *               category:
 *                 type: string
 *                 description: General category
 *               geographicScope:
 *                 type: string
 *                 description: Geographic scope of the petition
 *     responses:
 *       201:
 *         description: Petition created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Created petition details
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to create petition
 */
router.post('/create',
  requireAuth,
  [
    body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
    body('description').isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
    body('petitionCategory').optional().isString().trim(),
    body('signatureGoal').optional().isInt({ min: 1 }).withMessage('Signature goal must be a positive integer'),
    body('requiredSignerFields').optional().isArray().withMessage('Required signer fields must be an array'),
    body('requiredSignerFields.*').optional().isString().withMessage('Each required signer field must be a string'),
    body('declarationLanguage').optional().isString().trim(),
    body('voterVerificationEnabled').optional().isBoolean(),
    body('party').optional().isString().trim(),
    body('electionYear').optional().isInt().withMessage('Election year must be an integer'),
    body('filingDeadline').optional().isISO8601().withMessage('Filing deadline must be a valid date'),
    body('customSlug').optional().isString().trim(),
    body('privacyConsentText').optional().isString().trim(),
    body('category').optional().isString().trim(),
    body('geographicScope').optional().isString().trim()
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const petitionData = req.body;

      const petition = await petitionSigningService.createPetition(userId, petitionData);

      res.status(201).json({
        success: true,
        data: petition
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as AuthRequest).user?.id }, 'Create petition error');

      if (error.code) {
        return res.status(400).json({ error: error.message, code: error.code });
      }

      res.status(500).json({
        error: error.message || 'Failed to create petition'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/mine:
 *   get:
 *     tags: [Petition Signing]
 *     summary: List creator's petitions
 *     description: Retrieves petitions created by the authenticated user with pagination
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Petitions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     petitions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to fetch petitions
 */
router.get('/mine',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const { limit, offset } = safePaginationParams(
        req.query.limit as string | undefined,
        req.query.offset as string | undefined
      );
      const page = req.query.page ? parseInt(req.query.page as string, 10) : Math.floor(offset / limit) + 1;

      const result = await petitionSigningService.getCreatorPetitions(userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as AuthRequest).user?.id }, 'Get my petitions error');
      res.status(500).json({
        error: error.message || 'Failed to fetch petitions'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/{id}/details:
 *   get:
 *     tags: [Petition Signing]
 *     summary: Get petition details with signature stats
 *     description: Retrieves detailed petition information including signature statistics. Creator only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       200:
 *         description: Petition details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Petition details with signature statistics
 *       400:
 *         description: Invalid petition ID
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - not the petition creator
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to fetch petition details
 */
router.get('/:id/details',
  requireAuth,
  [
    param('id').isString().notEmpty().withMessage('Petition ID is required')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const result = await petitionSigningService.getPetitionDetails(req.params.id, userId);

      if (!result) {
        return res.status(404).json({ error: 'Petition not found' });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id, userId: (req as AuthRequest).user?.id }, 'Get petition details error');

      if (error.message === 'Forbidden') {
        return res.status(403).json({ error: 'You do not have access to this petition' });
      }

      res.status(500).json({
        error: error.message || 'Failed to fetch petition details'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/{id}/publish:
 *   patch:
 *     tags: [Petition Signing]
 *     summary: Publish a petition
 *     description: Changes petition status from DRAFT to ACTIVE. Creator only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       200:
 *         description: Petition published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated petition details
 *       400:
 *         description: Invalid petition ID or petition cannot be published
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - not the petition creator
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to publish petition
 */
router.patch('/:id/publish',
  requireAuth,
  [
    param('id').isString().notEmpty().withMessage('Petition ID is required')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const result = await petitionSigningService.publishPetition(req.params.id, userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id, userId: (req as AuthRequest).user?.id }, 'Publish petition error');

      if (error.message === 'Forbidden') {
        return res.status(403).json({ error: 'You do not have access to this petition' });
      }
      if (error.message === 'Petition not found') {
        return res.status(404).json({ error: 'Petition not found' });
      }
      if (error.code) {
        return res.status(400).json({ error: error.message, code: error.code });
      }

      res.status(500).json({
        error: error.message || 'Failed to publish petition'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/{id}/close:
 *   patch:
 *     tags: [Petition Signing]
 *     summary: Close a petition
 *     description: Changes petition status from ACTIVE to CLOSED. Creator only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       200:
 *         description: Petition closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated petition details
 *       400:
 *         description: Invalid petition ID or petition cannot be closed
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - not the petition creator
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to close petition
 */
router.patch('/:id/close',
  requireAuth,
  [
    param('id').isString().notEmpty().withMessage('Petition ID is required')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const result = await petitionSigningService.closePetition(req.params.id, userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id, userId: (req as AuthRequest).user?.id }, 'Close petition error');

      if (error.message === 'Forbidden') {
        return res.status(403).json({ error: 'You do not have access to this petition' });
      }
      if (error.message === 'Petition not found') {
        return res.status(404).json({ error: 'Petition not found' });
      }
      if (error.code) {
        return res.status(400).json({ error: error.message, code: error.code });
      }

      res.status(500).json({
        error: error.message || 'Failed to close petition'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/{id}/signatures:
 *   get:
 *     tags: [Petition Signing]
 *     summary: List signatures with filtering
 *     description: Retrieves signatures for a petition with optional filtering. Creator only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by signature status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by signer name
 *     responses:
 *       200:
 *         description: Signatures retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     signatures:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - not the petition creator
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to fetch signatures
 */
router.get('/:id/signatures',
  requireAuth,
  [
    param('id').isString().notEmpty().withMessage('Petition ID is required'),
    query('status').optional().isString(),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('search').optional().isString().trim()
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const { limit, offset } = safePaginationParams(
        req.query.limit as string | undefined,
        req.query.offset as string | undefined
      );
      const page = req.query.page ? parseInt(req.query.page as string, 10) : Math.floor(offset / limit) + 1;

      const filters = {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined
      };

      const result = await petitionSigningService.getPetitionSignatures(req.params.id, userId, {
        status: filters.status as any,
        search: filters.search,
        page,
        limit
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id, userId: (req as AuthRequest).user?.id }, 'Get signatures error');

      if (error.message === 'Forbidden') {
        return res.status(403).json({ error: 'You do not have access to this petition' });
      }
      if (error.message === 'Petition not found') {
        return res.status(404).json({ error: 'Petition not found' });
      }

      res.status(500).json({
        error: error.message || 'Failed to fetch signatures'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/{id}/qr-code:
 *   get:
 *     tags: [Petition Signing]
 *     summary: Generate QR code for petition
 *     description: Generates a QR code for the petition signing page. Creator only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                     signingUrl:
 *                       type: string
 *                       description: URL for the signing page
 *       400:
 *         description: Invalid petition ID
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - not the petition creator
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to generate QR code
 */
router.get('/:id/qr-code',
  requireAuth,
  [
    param('id').isString().notEmpty().withMessage('Petition ID is required')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const result = await petitionSigningService.generateQRCode(req.params.id, userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id, userId: (req as AuthRequest).user?.id }, 'Generate QR code error');

      if (error.message === 'Forbidden') {
        return res.status(403).json({ error: 'You do not have access to this petition' });
      }
      if (error.message === 'Petition not found') {
        return res.status(404).json({ error: 'Petition not found' });
      }

      res.status(500).json({
        error: error.message || 'Failed to generate QR code'
      });
    }
  }
);

/**
 * @swagger
 * /api/petitions/{id}/audit-log:
 *   get:
 *     tags: [Petition Signing]
 *     summary: View petition audit trail
 *     description: Retrieves the audit log for a petition. Creator only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Audit log entry
 *       400:
 *         description: Invalid petition ID
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - not the petition creator
 *       404:
 *         description: Petition not found
 *       500:
 *         description: Failed to fetch audit log
 */
router.get('/:id/audit-log',
  requireAuth,
  [
    param('id').isString().notEmpty().withMessage('Petition ID is required')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;

      // Verify creator ownership
      const petition = await petitionSigningService.getPetitionDetails(req.params.id, userId);
      if (!petition) {
        return res.status(404).json({ error: 'Petition not found' });
      }

      const { limit, offset } = safePaginationParams(
        req.query.limit as string | undefined,
        req.query.offset as string | undefined
      );
      const result = await petitionAuditService.getAuditLog(req.params.id, { limit, offset });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id, userId: (req as AuthRequest).user?.id }, 'Get audit log error');

      if (error.message === 'Forbidden') {
        return res.status(403).json({ error: 'You do not have access to this petition' });
      }
      if (error.message === 'Petition not found') {
        return res.status(404).json({ error: 'Petition not found' });
      }

      res.status(500).json({
        error: error.message || 'Failed to fetch audit log'
      });
    }
  }
);

export default router;
