import { Router, Response } from 'express';
import badgeService from '../services/badge.service';
import { requireAuth, requireStagingAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();

/**
 * @swagger
 * /api/badges/claim-codes/generate:
 *   post:
 *     tags: [Badge]
 *     summary: Generate claim codes for a badge (Admin Only)
 *     description: Creates claim codes that users can redeem to receive a badge. Supports SHARED codes (one code, many users) and INDIVIDUAL codes (unique codes for one-time use). Production allows regular authenticated users, staging/dev requires admin.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - badgeId
 *               - type
 *             properties:
 *               badgeId:
 *                 type: string
 *                 description: ID of badge these codes will award
 *                 example: "clxyz123abc"
 *               type:
 *                 type: string
 *                 enum: [SHARED, INDIVIDUAL]
 *                 description: SHARED = one code for multiple users, INDIVIDUAL = unique codes for single use
 *                 example: "SHARED"
 *               count:
 *                 type: integer
 *                 description: Number of codes to generate (required for INDIVIDUAL type)
 *                 example: 100
 *               maxClaims:
 *                 type: integer
 *                 nullable: true
 *                 description: Maximum number of claims allowed per code (null = unlimited)
 *                 example: 500
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Optional expiration date for codes
 *                 example: "2025-12-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Claim codes generated successfully
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
 *                     codes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           code:
 *                             type: string
 *                             example: "KICKSTARTER2025"
 *                           badgeId:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [SHARED, INDIVIDUAL]
 *                           maxClaims:
 *                             type: integer
 *                             nullable: true
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           claimsUsed:
 *                             type: integer
 *                           isActive:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid request - missing required fields or invalid type
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin access required (staging/dev only)
 *       404:
 *         description: Badge not found
 *       500:
 *         description: Server error while generating codes
 */
router.post('/generate', requireStagingAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId, type, count, maxClaims, expiresAt } = req.body;

    if (!badgeId || !type) {
      return res.status(400).json({ success: false, error: 'badgeId and type are required' });
    }

    if (type !== 'SHARED' && type !== 'INDIVIDUAL') {
      return res.status(400).json({ success: false, error: 'type must be SHARED or INDIVIDUAL' });
    }

    const codes = await badgeService.generateClaimCodes({
      badgeId,
      type,
      count,
      maxClaims: maxClaims !== undefined ? maxClaims : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user!.id
    });

    res.json({ success: true, data: { codes } });
  } catch (error: any) {
    if (error.message === 'Badge not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/claim-codes:
 *   get:
 *     tags: [Badge]
 *     summary: List all claim codes (Admin Only)
 *     description: Returns all claim codes with optional badge filter. Includes usage statistics. Production allows regular authenticated users, staging/dev requires admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: badgeId
 *         schema:
 *           type: string
 *         description: Optional badge ID to filter codes
 *         example: "clxyz123abc"
 *     responses:
 *       200:
 *         description: Claim codes retrieved successfully
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
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       badgeId:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [SHARED, INDIVIDUAL]
 *                       maxClaims:
 *                         type: integer
 *                         nullable: true
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       claimsUsed:
 *                         type: integer
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       badge:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       _count:
 *                         type: object
 *                         properties:
 *                           claims:
 *                             type: integer
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin access required (staging/dev only)
 *       500:
 *         description: Server error while retrieving codes
 */
router.get('/', requireStagingAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.query;

    if (badgeId && typeof badgeId === 'string') {
      const codes = await badgeService.getClaimCodesByBadge({ badgeId });
      return res.json({ success: true, data: codes });
    }

    // If no badgeId, return all codes (would need new service method, for now return error)
    res.status(400).json({ success: false, error: 'badgeId query parameter is required' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/claim-codes/{id}:
 *   delete:
 *     tags: [Badge]
 *     summary: Deactivate a claim code (Admin Only)
 *     description: Deactivates a claim code, preventing further claims. Existing claims remain valid. Production allows regular authenticated users, staging/dev requires admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim code unique identifier
 *         example: "clxyz123abc"
 *     responses:
 *       200:
 *         description: Claim code deactivated successfully
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
 *                   example: "Claim code deactivated"
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin access required (staging/dev only)
 *       404:
 *         description: Claim code not found
 *       500:
 *         description: Server error while deactivating code
 */
router.delete('/:id', requireStagingAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await badgeService.deactivateClaimCode({ claimCodeId: id });

    res.json({ success: true, message: 'Claim code deactivated' });
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Claim code not found' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/claim/{code}:
 *   post:
 *     tags: [Badge]
 *     summary: Claim a badge with code
 *     description: Allows authenticated user to redeem a claim code and receive the associated badge. Validates code exists, is active, not expired, not already claimed by user, and hasn't reached max claims.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim code to redeem
 *         example: "KICKSTARTER2025"
 *     responses:
 *       200:
 *         description: Badge claimed successfully
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
 *                     badge:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                           example: "Kickstarter Backer"
 *                         description:
 *                           type: string
 *                         imageUrl:
 *                           type: string
 *                     userBadge:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         userId:
 *                           type: string
 *                         badgeId:
 *                           type: string
 *                         earnedAt:
 *                           type: string
 *                           format: date-time
 *                     message:
 *                       type: string
 *                       example: "Badge claimed successfully!"
 *       400:
 *         description: Invalid code, expired code, already claimed, or max claims reached
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Claim code not found
 *       500:
 *         description: Server error while claiming badge
 */
router.post('/claim/:code', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const result = await badgeService.claimBadgeWithCode({
      userId,
      code
    });

    res.json({
      success: true,
      data: {
        badge: result.userBadge.badge,
        userBadge: result.userBadge,
        message: 'Badge claimed successfully!'
      }
    });
  } catch (error: any) {
    if (error.message === 'Invalid claim code') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (
      error.message.includes('deactivated') ||
      error.message.includes('expired') ||
      error.message.includes('already claimed') ||
      error.message.includes('maximum usage limit')
    ) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
