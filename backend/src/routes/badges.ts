import { Router, Response } from 'express';
import multer from 'multer';
import badgeService from '../services/badge.service';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 } // 1MB limit
});

// Get current user's badge vault (for frontend BadgeVault component)
router.get('/vault', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const badges = await badgeService.getUserBadges(userId);
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's badges by userId (for viewing other users' profiles)
router.get('/user/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const badges = await badgeService.getUserBadges(userId);
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all available badges (for BadgeVault "available" section)
router.get('/available', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await badgeService.getAllBadges();
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all badges (admin endpoint)
router.get('/all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await badgeService.getAllBadges();
    res.json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update badge display preferences
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

// Admin: Create new badge
router.post('/create', requireAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, qualificationCriteria, isAutoAwarded, maxAwards, displayOrder } = req.body;

    const criteria = typeof qualificationCriteria === 'string'
      ? JSON.parse(qualificationCriteria)
      : qualificationCriteria;

    const badge = await badgeService.createBadge({
      name,
      description,
      imageFile: req.file as Express.Multer.File,
      qualificationCriteria: criteria,
      isAutoAwarded: isAutoAwarded === 'true',
      maxAwards: maxAwards ? parseInt(maxAwards) : undefined,
      displayOrder: displayOrder ? parseInt(displayOrder) : undefined,
      createdBy: req.user!.id
    });

    res.json({ success: true, data: badge });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Update badge
router.put('/:badgeId', requireAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;
    const { name, description, qualificationCriteria, isAutoAwarded, maxAwards, displayOrder } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (qualificationCriteria) {
      updates.qualificationCriteria = typeof qualificationCriteria === 'string'
        ? JSON.parse(qualificationCriteria)
        : qualificationCriteria;
    }
    if (isAutoAwarded !== undefined) updates.isAutoAwarded = isAutoAwarded === 'true';
    if (maxAwards !== undefined) updates.maxAwards = parseInt(maxAwards);
    if (displayOrder !== undefined) updates.displayOrder = parseInt(displayOrder);
    if (req.file) updates.imageFile = req.file;

    const badge = await badgeService.updateBadge(badgeId, updates);
    res.json({ success: true, data: badge });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Award badge manually
router.post('/award', requireAdmin, async (req: AuthRequest, res: Response) => {
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

// Admin: Delete (deactivate) badge
router.delete('/:badgeId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;
    await badgeService.deleteBadge(badgeId);
    res.json({ success: true, message: 'Badge deactivated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Run badge qualification checks
router.post('/check-qualifications', requireAdmin, async (req: AuthRequest, res: Response) => {
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

export default router;