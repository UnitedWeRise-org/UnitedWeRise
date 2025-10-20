import { Router, Response } from 'express';
import questService from '../services/quest.service';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();

/**
 * @swagger
 * /api/quests/daily:
 *   get:
 *     tags: [Quest]
 *     summary: Get user's daily quests
 *     description: Generates or retrieves today's daily quests for the authenticated user. Returns existing quests if already generated today, otherwise creates new personalized quests based on user profile.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Daily quests retrieved successfully
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
 *                     $ref: '#/components/schemas/Quest'
 *                   description: Array of daily quests (typically 2-3 quests)
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while generating quests
 */
router.get('/daily', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const quests = await questService.generateDailyQuests(userId);
    res.json({ success: true, data: quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/quests/progress:
 *   get:
 *     tags: [Quest]
 *     summary: Get user's quest progress
 *     description: Returns comprehensive quest progress data including daily/weekly quests, active/completed quests, and streak information
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Quest progress retrieved successfully
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
 *                     dailyQuests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserQuestProgress'
 *                       description: All daily quest progress entries
 *                     weeklyQuests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserQuestProgress'
 *                       description: All weekly quest progress entries
 *                     activeQuests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserQuestProgress'
 *                       description: Currently active incomplete quests
 *                     completedQuests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserQuestProgress'
 *                       description: All completed quests
 *                     streak:
 *                       $ref: '#/components/schemas/UserQuestStreak'
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalCompleted:
 *                           type: integer
 *                         dailyStreak:
 *                           type: integer
 *                         weeklyStreak:
 *                           type: integer
 *                         longestStreak:
 *                           type: integer
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while retrieving progress
 */
router.get('/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const progress = await questService.getUserQuestProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/quests/streaks:
 *   get:
 *     tags: [Quest]
 *     summary: Get user's quest streaks
 *     description: Returns just the streak data extracted from user's quest progress (subset of /progress endpoint for UI convenience)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Streak data retrieved successfully
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
 *                     dailyStreak:
 *                       type: integer
 *                       description: Current consecutive daily quest completion streak
 *                       example: 7
 *                     weeklyStreak:
 *                       type: integer
 *                       description: Current consecutive weekly quest completion streak
 *                       example: 2
 *                     longestStreak:
 *                       type: integer
 *                       description: Longest daily streak ever achieved
 *                       example: 14
 *                     totalCompleted:
 *                       type: integer
 *                       description: Total quests completed all-time
 *                       example: 42
 *                     lastCompletedDate:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of last completed quest
 *                       nullable: true
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while retrieving streaks
 */
router.get('/streaks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const progress = await questService.getUserQuestProgress(userId);
    // Extract just the streak data from the progress response
    const streakData = {
      dailyStreak: progress.streak?.currentDailyStreak || 0,
      weeklyStreak: progress.streak?.currentWeeklyStreak || 0,
      longestStreak: progress.streak?.longestDailyStreak || 0,
      totalCompleted: progress.streak?.totalQuestsCompleted || 0,
      lastCompletedDate: progress.streak?.lastCompletedDate
    };
    res.json({ success: true, data: streakData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/quests/update-progress:
 *   post:
 *     tags: [Quest]
 *     summary: Update quest progress
 *     description: Updates progress for active quests based on user actions. Called internally by other services when relevant actions occur (e.g., creating posts, signing petitions).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actionType
 *             properties:
 *               actionType:
 *                 type: string
 *                 description: Type of action performed
 *                 enum: [USER_LOGIN, POST_VIEWED, POST_CREATED, COMMENT_CREATED, PETITION_SIGNED, FOLLOW_ADDED, FRIEND_REQUEST_SENT]
 *                 example: POST_CREATED
 *               metadata:
 *                 type: object
 *                 description: Optional additional data about the action
 *                 example: { postId: "post_123" }
 *     responses:
 *       200:
 *         description: Quest progress updated successfully
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
 *                   example: Quest progress updated
 *       400:
 *         description: Invalid action type
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error while updating progress
 */
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

/**
 * @swagger
 * /api/quests/create:
 *   post:
 *     tags: [Quest]
 *     summary: Create new quest (admin only)
 *     description: Creates a custom quest with specified requirements and rewards. Requires admin privileges.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - category
 *               - title
 *               - description
 *               - requirements
 *               - rewards
 *               - timeframe
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [DAILY_HABIT, DAILY_CIVIC, SOCIAL_ENGAGEMENT, WEEKLY_ENGAGEMENT, SPECIAL_EVENT]
 *                 description: Quest type classification
 *               category:
 *                 type: string
 *                 enum: [INFORMATION, PARTICIPATION, COMMUNITY, ADVOCACY]
 *                 description: Quest category
 *               title:
 *                 type: string
 *                 description: Quest display title
 *                 example: Daily Check-In
 *               description:
 *                 type: string
 *                 description: Full quest description
 *               shortDescription:
 *                 type: string
 *                 description: Brief summary for UI
 *                 example: Read 3 posts from your feed
 *               requirements:
 *                 type: object
 *                 description: JSON object defining completion criteria
 *                 example: { "type": "READ_POSTS", "target": 3, "timeframe": "daily" }
 *               rewards:
 *                 type: object
 *                 description: JSON object defining rewards on completion
 *                 example: { "reputationPoints": 2, "experiencePoints": 10 }
 *               timeframe:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY, ONE_TIME]
 *                 description: Quest reset timeframe
 *               displayOrder:
 *                 type: integer
 *                 description: Sort order for display
 *               isActive:
 *                 type: boolean
 *                 description: Whether quest is currently active
 *                 default: true
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Quest start date (for time-limited quests)
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Quest end date (for time-limited quests)
 *     responses:
 *       200:
 *         description: Quest created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quest'
 *       400:
 *         description: Validation error - invalid quest data
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error while creating quest
 */
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

/**
 * @swagger
 * /api/quests/all:
 *   get:
 *     tags: [Quest]
 *     summary: Get all quests (admin only)
 *     description: Returns all quests in the system with progress counts. Sorted by active status, display order, and creation date.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All quests retrieved successfully
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
 *                       - $ref: '#/components/schemas/Quest'
 *                       - type: object
 *                         properties:
 *                           _count:
 *                             type: object
 *                             properties:
 *                               userProgress:
 *                                 type: integer
 *                                 description: Number of users with progress on this quest
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error while retrieving quests
 */
router.get('/all', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const quests = await questService.getAllQuests();
    res.json({ success: true, data: quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/quests/{questId}:
 *   put:
 *     tags: [Quest]
 *     summary: Update quest (admin only)
 *     description: Updates an existing quest's properties. All fields are optional - only provided fields will be updated.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: questId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quest unique identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Quest display title
 *               description:
 *                 type: string
 *                 description: Full quest description
 *               shortDescription:
 *                 type: string
 *                 description: Brief summary for UI
 *               requirements:
 *                 type: object
 *                 description: JSON object defining completion criteria
 *               rewards:
 *                 type: object
 *                 description: JSON object defining rewards on completion
 *               displayOrder:
 *                 type: integer
 *                 description: Sort order for display
 *               isActive:
 *                 type: boolean
 *                 description: Whether quest is currently active
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Quest start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Quest end date
 *     responses:
 *       200:
 *         description: Quest updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quest'
 *       400:
 *         description: Validation error - invalid quest data
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       404:
 *         description: Quest not found
 *       500:
 *         description: Server error while updating quest
 */
router.put('/:questId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { questId } = req.params;
    const quest = await questService.updateQuest(questId, req.body);
    res.json({ success: true, data: quest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/quests/analytics:
 *   get:
 *     tags: [Quest]
 *     summary: Get quest analytics (admin only)
 *     description: Returns aggregated statistics about quest system performance including completion rates and streak data
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
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
 *                     totalQuests:
 *                       type: integer
 *                       description: Total number of quests in system
 *                     activeQuests:
 *                       type: integer
 *                       description: Number of currently active quests
 *                     questProgress:
 *                       type: array
 *                       description: Progress data grouped by quest and completion status
 *                       items:
 *                         type: object
 *                         properties:
 *                           questId:
 *                             type: string
 *                           completed:
 *                             type: boolean
 *                           _count:
 *                             type: integer
 *                     streakStats:
 *                       type: object
 *                       description: Aggregate streak statistics across all users
 *                       properties:
 *                         _avg:
 *                           type: object
 *                           properties:
 *                             currentDailyStreak:
 *                               type: number
 *                             longestDailyStreak:
 *                               type: number
 *                             totalQuestsCompleted:
 *                               type: number
 *                         _max:
 *                           type: object
 *                           properties:
 *                             currentDailyStreak:
 *                               type: integer
 *                             longestDailyStreak:
 *                               type: integer
 *                             totalQuestsCompleted:
 *                               type: integer
 *                     completionRates:
 *                       type: array
 *                       description: Completion rate data per quest
 *                       items:
 *                         type: object
 *                         properties:
 *                           questId:
 *                             type: string
 *                           completed:
 *                             type: boolean
 *                           count:
 *                             type: integer
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error while retrieving analytics
 */
router.get('/analytics', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await questService.getQuestAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/quests/create-weekly:
 *   post:
 *     tags: [Quest]
 *     summary: Create weekly quest (admin only)
 *     description: Creates a standard weekly engagement quest. Typically called by scheduled task at the start of each week.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Weekly quest created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quest'
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error while creating weekly quest
 */
router.post('/create-weekly', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const quest = await questService.createWeeklyQuest();
    res.json({ success: true, data: quest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;