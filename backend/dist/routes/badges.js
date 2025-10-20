"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const badge_service_1 = __importDefault(require("../services/badge.service"));
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
router.get('/vault', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const badges = await badge_service_1.default.getUserBadges(userId);
        res.json({ success: true, data: badges });
    }
    catch (error) {
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
router.get('/user/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const badges = await badge_service_1.default.getUserBadges(userId);
        res.json({ success: true, data: badges });
    }
    catch (error) {
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
router.get('/available', auth_1.requireAuth, async (req, res) => {
    try {
        const badges = await badge_service_1.default.getAllBadges();
        res.json({ success: true, data: badges });
    }
    catch (error) {
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
router.get('/all', auth_1.requireAuth, async (req, res) => {
    try {
        const badges = await badge_service_1.default.getAllBadges();
        res.json({ success: true, data: badges });
    }
    catch (error) {
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
router.put('/display', auth_1.requireAuth, async (req, res) => {
    try {
        const { badgeId, isDisplayed, displayOrder } = req.body;
        const userId = req.user.id;
        const updated = await badge_service_1.default.updateBadgeDisplay(userId, badgeId, isDisplayed, displayOrder);
        res.json({ success: true, data: updated });
    }
    catch (error) {
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
router.post('/create', admin_1.requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, qualificationCriteria, isAutoAwarded, maxAwards, displayOrder } = req.body;
        const criteria = typeof qualificationCriteria === 'string'
            ? JSON.parse(qualificationCriteria)
            : qualificationCriteria;
        const badge = await badge_service_1.default.createBadge({
            name,
            description,
            imageFile: req.file,
            qualificationCriteria: criteria,
            isAutoAwarded: isAutoAwarded === 'true',
            maxAwards: maxAwards ? parseInt(maxAwards) : undefined,
            displayOrder: displayOrder ? parseInt(displayOrder) : undefined,
            createdBy: req.user.id
        });
        res.json({ success: true, data: badge });
    }
    catch (error) {
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
router.put('/:badgeId', admin_1.requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { badgeId } = req.params;
        const { name, description, qualificationCriteria, isAutoAwarded, maxAwards, displayOrder } = req.body;
        const updates = {};
        if (name)
            updates.name = name;
        if (description)
            updates.description = description;
        if (qualificationCriteria) {
            updates.qualificationCriteria = typeof qualificationCriteria === 'string'
                ? JSON.parse(qualificationCriteria)
                : qualificationCriteria;
        }
        if (isAutoAwarded !== undefined)
            updates.isAutoAwarded = isAutoAwarded === 'true';
        if (maxAwards !== undefined)
            updates.maxAwards = parseInt(maxAwards);
        if (displayOrder !== undefined)
            updates.displayOrder = parseInt(displayOrder);
        if (req.file)
            updates.imageFile = req.file;
        const badge = await badge_service_1.default.updateBadge(badgeId, updates);
        res.json({ success: true, data: badge });
    }
    catch (error) {
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
router.post('/award', admin_1.requireAdmin, async (req, res) => {
    try {
        const { userId, badgeId, reason } = req.body;
        const userBadge = await badge_service_1.default.awardBadge(userId, badgeId, req.user.id, reason);
        res.json({ success: true, data: userBadge });
    }
    catch (error) {
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
router.delete('/:badgeId', admin_1.requireAdmin, async (req, res) => {
    try {
        const { badgeId } = req.params;
        await badge_service_1.default.deleteBadge(badgeId);
        res.json({ success: true, message: 'Badge deactivated successfully' });
    }
    catch (error) {
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
router.post('/check-qualifications', admin_1.requireAdmin, async (req, res) => {
    try {
        const badgesAwarded = await badge_service_1.default.runBadgeQualificationChecks();
        res.json({
            success: true,
            data: { badgesAwarded },
            message: `${badgesAwarded} badges awarded based on qualification criteria`
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=badges.js.map