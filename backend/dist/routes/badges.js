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
// Get current user's badge vault (for frontend BadgeVault component)
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
// Get user's badges by userId (for viewing other users' profiles)
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
// Get all available badges (for BadgeVault "available" section)
router.get('/available', auth_1.requireAuth, async (req, res) => {
    try {
        const badges = await badge_service_1.default.getAllBadges();
        res.json({ success: true, data: badges });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get all badges (admin endpoint)
router.get('/all', auth_1.requireAuth, async (req, res) => {
    try {
        const badges = await badge_service_1.default.getAllBadges();
        res.json({ success: true, data: badges });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update badge display preferences
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
// Admin: Create new badge
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
// Admin: Update badge
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
// Admin: Award badge manually
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
// Admin: Delete (deactivate) badge
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
// Admin: Run badge qualification checks
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