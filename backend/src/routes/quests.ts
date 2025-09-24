import { Router, Response } from 'express';
import questService from '../services/quest.service';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();

// Get user's daily quests
router.get('/daily', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const quests = await questService.generateDailyQuests(userId);
    res.json({ success: true, data: quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's quest progress
router.get('/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const progress = await questService.getUserQuestProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update quest progress (called by other services)
router.post('/update-progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { actionType, metadata } = req.body;
    const userId = req.user!.id;

    await questService.updateQuestProgress(userId, actionType, metadata);
    res.json({ success: true, message: 'Quest progress updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Create new quest
router.post('/create', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const quest = await questService.createQuest({
      ...req.body,
      createdBy: req.user!.id
    });
    res.json({ success: true, data: quest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get all quests
router.get('/all', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const quests = await questService.getAllQuests();
    res.json({ success: true, data: quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Update quest
router.put('/:questId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { questId } = req.params;
    const quest = await questService.updateQuest(questId, req.body);
    res.json({ success: true, data: quest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get quest analytics
router.get('/analytics', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await questService.getQuestAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create weekly quest (scheduled task)
router.post('/create-weekly', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const quest = await questService.createWeeklyQuest();
    res.json({ success: true, data: quest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;