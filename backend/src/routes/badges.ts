import { Router, Response } from 'express';
import multer from 'multer';
import badgeService from '../services/badge.service';
import { requireAuth, requireStagingAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { safeJSONParse } from '../utils/safeJson';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 } // 1MB limit
});

/**
 * @swagger
 * /api/badges/vault:
 *   get:
 *     tags: [Badge]
 *     summary: Get current user's badge vault
 *     description: Returns authenticated user's badge collection including displayed badges, all earned badges, and recently earned badges
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Badge vault retrieved successfully
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
 *                     displayedBadges:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadge'
 *                       description: Badges user chose to display publicly
 *                     allBadges:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadge'
 *                       description: All badges earned by user
 *                     totalBadges:
 *                       type: integer
 *                       description: Total count of badges earned
 *                       example: 12
 *                     recentlyEarned:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadge'
 *                       description: Last 5 badges earned (most recent first)
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while retrieving badges
 */
router.get('/vault', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const badges = await badgeService.getUserBadges(userId);
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/user/{userId}:
 *   get:
 *     tags: [Badge]
 *     summary: Get another user's badges
 *     description: Returns badge collection for specified user (for viewing on profile pages). Same response format as /vault endpoint.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User unique identifier
 *     responses:
 *       200:
 *         description: User badges retrieved successfully
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
 *                     displayedBadges:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadge'
 *                     allBadges:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadge'
 *                     totalBadges:
 *                       type: integer
 *                     recentlyEarned:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadge'
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error while retrieving badges
 */
router.get('/user/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const badges = await badgeService.getUserBadges(userId);
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/available:
 *   get:
 *     tags: [Badge]
 *     summary: Get all available badges
 *     description: Returns all active badges in the system (for BadgeVault "available" section). Shows badges user can potentially earn.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Available badges retrieved successfully
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
 *                     $ref: '#/components/schemas/Badge'
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while retrieving badges
 */
router.get('/available', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await badgeService.getAllBadges();
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/all:
 *   get:
 *     tags: [Badge]
 *     summary: Get all badges with admin data
 *     description: Returns all badges including inactive ones with award counts. Used for admin management interface.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All badges retrieved successfully
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Badge'
 *                       - type: object
 *                         properties:
 *                           _count:
 *                             type: object
 *                             properties:
 *                               userBadges:
 *                                 type: integer
 *                                 description: Number of times this badge has been awarded
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while retrieving badges
 */
router.get('/all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await badgeService.getAllBadges();
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/display:
 *   put:
 *     tags: [Badge]
 *     summary: Update badge display preferences
 *     description: Updates whether a badge is displayed on user's profile and its display order
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
 *               - isDisplayed
 *             properties:
 *               badgeId:
 *                 type: string
 *                 description: Badge unique identifier
 *               isDisplayed:
 *                 type: boolean
 *                 description: Whether to display badge on profile
 *                 example: true
 *               displayOrder:
 *                 type: integer
 *                 description: Sort order for displayed badges (optional)
 *                 example: 1
 *     responses:
 *       200:
 *         description: Badge display preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserBadge'
 *       400:
 *         description: Validation error - invalid request data
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Badge not found or user doesn't have this badge
 *       500:
 *         description: Server error while updating display preferences
 */
router.put('/display', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId, isDisplayed, displayOrder } = req.body;
    const userId = req.user!.id;

    const updated = await badgeService.updateBadgeDisplay(
      userId,
      badgeId,
      isDisplayed,
      displayOrder
    );

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/create:
 *   post:
 *     tags: [Badge]
 *     summary: Create new badge (admin only)
 *     description: Creates a new badge with image upload and qualification criteria. Requires admin privileges.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - qualificationCriteria
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 description: Badge display name
 *                 example: Civic Champion
 *               description:
 *                 type: string
 *                 description: Badge description shown to users
 *                 example: Awarded for completing 10 civic quests
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Badge image file (PNG/JPG, max 1MB)
 *               qualificationCriteria:
 *                 type: string
 *                 description: JSON string defining how badge is earned
 *                 example: '{"type":"QUEST_COMPLETION","requirements":{"questCompletionCount":10}}'
 *               isAutoAwarded:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether badge is awarded automatically
 *                 default: 'true'
 *               maxAwards:
 *                 type: integer
 *                 description: Maximum number of times badge can be awarded (optional)
 *               displayOrder:
 *                 type: integer
 *                 description: Sort order for badge display (optional)
 *     responses:
 *       200:
 *         description: Badge created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Badge'
 *       400:
 *         description: Validation error - invalid badge data or missing image
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error while creating badge
 */
router.post('/create', requireAuth, requireAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, qualificationCriteria, isAutoAwarded, maxAwards, displayOrder } = req.body;

    // Safely parse qualification criteria - use empty object as fallback for invalid JSON
    const criteria = typeof qualificationCriteria === 'string'
      ? safeJSONParse(qualificationCriteria, {})
      : qualificationCriteria;

    // Parse and validate maxAwards (0 = unlimited, positive integers allowed)
    let parsedMaxAwards: number | undefined;
    if (maxAwards) {
      const rawMaxAwards = parseInt(maxAwards);
      parsedMaxAwards = Number.isNaN(rawMaxAwards) || rawMaxAwards < 0 || rawMaxAwards > 1000000 ? undefined : rawMaxAwards;
    }

    // Parse and validate displayOrder (positive integers only)
    let parsedDisplayOrder: number | undefined;
    if (displayOrder) {
      const rawDisplayOrder = parseInt(displayOrder);
      parsedDisplayOrder = Number.isNaN(rawDisplayOrder) || rawDisplayOrder < 0 || rawDisplayOrder > 10000 ? undefined : rawDisplayOrder;
    }

    const badge = await badgeService.createBadge({
      name,
      description,
      imageFile: req.file as Express.Multer.File,
      qualificationCriteria: criteria,
      isAutoAwarded: isAutoAwarded === 'true',
      maxAwards: parsedMaxAwards,
      displayOrder: parsedDisplayOrder,
      createdBy: req.user!.id
    });

    res.json({ success: true, data: badge });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/{badgeId}:
 *   put:
 *     tags: [Badge]
 *     summary: Update badge (admin only)
 *     description: Updates an existing badge's properties. All fields optional - only provided fields will be updated. Can update image.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: badgeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Badge unique identifier
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Badge display name
 *               description:
 *                 type: string
 *                 description: Badge description
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New badge image file (PNG/JPG, max 1MB)
 *               qualificationCriteria:
 *                 type: string
 *                 description: JSON string defining qualification criteria
 *               isAutoAwarded:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether badge is awarded automatically
 *               maxAwards:
 *                 type: integer
 *                 description: Maximum number of times badge can be awarded
 *               displayOrder:
 *                 type: integer
 *                 description: Sort order for badge display
 *     responses:
 *       200:
 *         description: Badge updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Badge'
 *       400:
 *         description: Validation error - invalid badge data
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       404:
 *         description: Badge not found
 *       500:
 *         description: Server error while updating badge
 */
router.put('/:badgeId', requireAuth, requireAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;
    const { name, description, qualificationCriteria, isAutoAwarded, maxAwards, displayOrder } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (qualificationCriteria) {
      // Safely parse qualification criteria - use empty object as fallback for invalid JSON
      updates.qualificationCriteria = typeof qualificationCriteria === 'string'
        ? safeJSONParse(qualificationCriteria, {})
        : qualificationCriteria;
    }
    if (isAutoAwarded !== undefined) updates.isAutoAwarded = isAutoAwarded === 'true';
    if (maxAwards !== undefined) {
      const rawMaxAwards = parseInt(maxAwards);
      if (!Number.isNaN(rawMaxAwards) && rawMaxAwards >= 0 && rawMaxAwards <= 1000000) {
        updates.maxAwards = rawMaxAwards;
      }
    }
    if (displayOrder !== undefined) {
      const rawDisplayOrder = parseInt(displayOrder);
      if (!Number.isNaN(rawDisplayOrder) && rawDisplayOrder >= 0 && rawDisplayOrder <= 10000) {
        updates.displayOrder = rawDisplayOrder;
      }
    }
    if (req.file) updates.imageFile = req.file;

    const badge = await badgeService.updateBadge(badgeId, updates);
    res.json({ success: true, data: badge });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/award:
 *   post:
 *     tags: [Badge]
 *     summary: Award badge manually (admin only)
 *     description: Manually awards a badge to a specific user. Used for special recognitions or manual overrides.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - badgeId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of user receiving the badge
 *               badgeId:
 *                 type: string
 *                 description: ID of badge to award
 *               reason:
 *                 type: string
 *                 description: Reason for awarding badge (optional)
 *                 example: Special recognition for exceptional civic engagement
 *     responses:
 *       200:
 *         description: Badge awarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserBadge'
 *       400:
 *         description: Validation error - user already has badge or badge award limit reached
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       404:
 *         description: User or badge not found
 *       500:
 *         description: Server error while awarding badge
 */
router.post('/award', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, badgeId, reason } = req.body;

    const userBadge = await badgeService.awardBadge(
      userId,
      badgeId,
      req.user!.id,
      reason
    );

    res.json({ success: true, data: userBadge });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/{badgeId}:
 *   delete:
 *     tags: [Badge]
 *     summary: Delete badge (admin only)
 *     description: Soft deletes a badge by deactivating it. Badge remains in database but becomes inactive.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: badgeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Badge unique identifier
 *     responses:
 *       200:
 *         description: Badge deactivated successfully
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
 *                   example: Badge deactivated successfully
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       404:
 *         description: Badge not found
 *       500:
 *         description: Server error while deleting badge
 */
router.delete('/:badgeId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;
    await badgeService.deleteBadge(badgeId);
    res.json({ success: true, message: 'Badge deactivated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/check-qualifications:
 *   post:
 *     tags: [Badge]
 *     summary: Run badge qualification checks (admin only)
 *     description: Runs automatic qualification checks for all active users and auto-awarded badges. Awards badges to users who meet criteria.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Qualification checks completed successfully
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
 *                     badgesAwarded:
 *                       type: integer
 *                       description: Number of badges awarded during this run
 *                       example: 15
 *                 message:
 *                   type: string
 *                   example: 15 badges awarded based on qualification criteria
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error while checking qualifications
 */
router.post('/check-qualifications', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const badgesAwarded = await badgeService.runBadgeQualificationChecks();
    res.json({
      success: true,
      data: { badgesAwarded },
      message: `${badgesAwarded} badges awarded based on qualification criteria`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/badges/award-bulk:
 *   post:
 *     tags: [Badge]
 *     summary: Award badge to multiple users by email (Admin Only)
 *     description: Awards a badge to multiple users identified by email addresses. Looks up users by email (case-insensitive) and awards badge to each. Continues processing all emails even if some fail. Production allows regular authenticated users, staging/dev requires admin.
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
 *               - emails
 *             properties:
 *               badgeId:
 *                 type: string
 *                 description: ID of badge to award
 *                 example: "clxyz123abc"
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Array of user email addresses
 *                 example: ["user1@example.com", "user2@example.com"]
 *               reason:
 *                 type: string
 *                 description: Optional reason for award (shown to users)
 *                 example: "Early supporter"
 *     responses:
 *       200:
 *         description: Bulk award completed (may include some failures)
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
 *                     awarded:
 *                       type: integer
 *                       description: Number of successful awards
 *                       example: 48
 *                     failed:
 *                       type: integer
 *                       description: Number of failed awards
 *                       example: 2
 *                     details:
 *                       type: array
 *                       description: Detailed results for each email
 *                       items:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                             format: email
 *                           status:
 *                             type: string
 *                             enum: [awarded, failed]
 *                           error:
 *                             type: string
 *                             description: Error message if status is 'failed'
 *       400:
 *         description: Invalid request - missing required fields
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin access required (staging/dev only)
 *       404:
 *         description: Badge not found
 *       500:
 *         description: Server error while processing bulk award
 */
router.post('/award-bulk', requireStagingAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId, emails, reason } = req.body;

    if (!badgeId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'badgeId and emails (array) are required'
      });
    }

    const result = await badgeService.awardBadgeBulk({
      badgeId,
      emails,
      awardedBy: req.user!.id,
      reason
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Badge not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;