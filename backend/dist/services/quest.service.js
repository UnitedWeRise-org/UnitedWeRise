"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const badge_service_1 = __importDefault(require("./badge.service"));
const logger_1 = require("./logger");
class QuestService {
    /**
     * Generates or retrieves daily quests for a user
     *
     * If user already has daily quests for today, returns existing quests.
     * Otherwise generates 2-3 personalized quests based on user profile:
     * - Daily habit quest (always included)
     * - Daily civic quest based on interests
     * - Social engagement quest (for new users <30 days old)
     *
     * @param userId - The unique identifier of the user
     * @returns Promise<Quest[]> Array of daily quests (typically 2-3 quests)
     * @throws {Error} When user is not found
     *
     * @example
     * const quests = await questService.generateDailyQuests('user_123');
     * console.log(quests.length); // 2 or 3
     * console.log(quests[0].type); // 'DAILY_HABIT'
     */
    async generateDailyQuests(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                interests: true,
                createdAt: true,
                lastLoginAt: true
            }
        });
        if (!user)
            throw new Error('User not found');
        // Check if user already has daily quests for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const existingDailyQuests = await prisma_1.prisma.userQuestProgress.findMany({
            where: {
                userId,
                startedAt: {
                    gte: today,
                    lt: tomorrow
                },
                quest: {
                    timeframe: 'DAILY'
                }
            }
        });
        if (existingDailyQuests.length > 0) {
            // Return existing daily quests
            return await prisma_1.prisma.quest.findMany({
                where: {
                    id: { in: existingDailyQuests.map(q => q.questId) }
                }
            });
        }
        // Generate new daily quests based on user profile
        const quests = [];
        // Always include one daily habit quest
        const habitQuest = await this.getOrCreateDailyHabitQuest();
        if (habitQuest) {
            quests.push(habitQuest);
            await this.assignQuestToUser(userId, habitQuest.id);
        }
        // Include one civic action quest
        const civicQuest = await this.getOrCreateDailyCivicQuest(user.interests);
        if (civicQuest) {
            quests.push(civicQuest);
            await this.assignQuestToUser(userId, civicQuest.id);
        }
        // Include one social engagement quest for new users
        const userAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (userAge < 30) {
            const socialQuest = await this.getOrCreateSocialQuest();
            if (socialQuest) {
                quests.push(socialQuest);
                await this.assignQuestToUser(userId, socialQuest.id);
            }
        }
        return quests;
    }
    async getOrCreateDailyHabitQuest() {
        let quest = await prisma_1.prisma.quest.findFirst({
            where: {
                type: 'DAILY_HABIT',
                timeframe: 'DAILY',
                isActive: true,
                title: 'Daily Check-In'
            }
        });
        if (!quest) {
            quest = await prisma_1.prisma.quest.create({
                data: {
                    type: 'DAILY_HABIT',
                    category: 'INFORMATION',
                    title: 'Daily Check-In',
                    description: 'Start your day by checking in with your community. Read at least 3 posts from your feed to stay informed.',
                    shortDescription: 'Read 3 posts from your feed',
                    requirements: {
                        type: 'READ_POSTS',
                        target: 3,
                        timeframe: 'daily'
                    },
                    rewards: {
                        reputationPoints: 2,
                        experiencePoints: 10
                    },
                    timeframe: 'DAILY',
                    displayOrder: 1
                }
            });
        }
        return quest;
    }
    async getOrCreateDailyCivicQuest(userInterests) {
        const civicActions = [
            {
                title: 'Voice Your Opinion',
                description: 'Share your thoughts on a local issue or policy. Create a post about something happening in your community.',
                shortDescription: 'Create a civic-minded post',
                actionType: 'POST_CREATED'
            },
            {
                title: 'Support a Cause',
                description: 'Find and sign a petition that aligns with your values. Every signature counts!',
                shortDescription: 'Sign a petition',
                actionType: 'PETITION_SIGNED'
            },
            {
                title: 'Engage in Discussion',
                description: 'Join the conversation on important issues. Comment on at least 2 civic posts.',
                shortDescription: 'Comment on 2 civic posts',
                actionType: 'COMMENT_CREATED'
            }
        ];
        const randomAction = civicActions[Math.floor(Math.random() * civicActions.length)];
        let quest = await prisma_1.prisma.quest.findFirst({
            where: {
                type: 'DAILY_CIVIC',
                title: randomAction.title,
                timeframe: 'DAILY',
                isActive: true
            }
        });
        if (!quest) {
            quest = await prisma_1.prisma.quest.create({
                data: {
                    type: 'DAILY_CIVIC',
                    category: 'PARTICIPATION',
                    title: randomAction.title,
                    description: randomAction.description,
                    shortDescription: randomAction.shortDescription,
                    requirements: {
                        type: 'CIVIC_ACTION',
                        target: randomAction.actionType === 'COMMENT_CREATED' ? 2 : 1,
                        timeframe: 'daily',
                        metadata: {
                            actionType: randomAction.actionType
                        }
                    },
                    rewards: {
                        reputationPoints: 3,
                        experiencePoints: 20
                    },
                    timeframe: 'DAILY',
                    displayOrder: 2
                }
            });
        }
        return quest;
    }
    async getOrCreateSocialQuest() {
        let quest = await prisma_1.prisma.quest.findFirst({
            where: {
                type: 'SOCIAL_ENGAGEMENT',
                timeframe: 'DAILY',
                isActive: true,
                title: 'Build Your Network'
            }
        });
        if (!quest) {
            quest = await prisma_1.prisma.quest.create({
                data: {
                    type: 'SOCIAL_ENGAGEMENT',
                    category: 'COMMUNITY',
                    title: 'Build Your Network',
                    description: 'Connect with like-minded citizens. Follow or friend request at least 1 new person today.',
                    shortDescription: 'Connect with 1 new person',
                    requirements: {
                        type: 'SOCIAL_INTERACTION',
                        target: 1,
                        timeframe: 'daily'
                    },
                    rewards: {
                        reputationPoints: 1,
                        experiencePoints: 15
                    },
                    timeframe: 'DAILY',
                    displayOrder: 3
                }
            });
        }
        return quest;
    }
    // Assign quest to user (with upsert to prevent duplicate key errors)
    async assignQuestToUser(userId, questId) {
        return await prisma_1.prisma.userQuestProgress.upsert({
            where: {
                userId_questId: {
                    userId,
                    questId
                }
            },
            update: {
            // Don't update existing progress, just return existing record
            },
            create: {
                userId,
                questId,
                progress: { completed: 0, target: 0 }
            }
        });
    }
    /**
     * Updates quest progress based on user actions
     *
     * Called by other services when users perform actions that contribute to quest completion.
     * Checks all active quests for the user and increments progress if action matches quest requirements.
     * Automatically handles quest completion and reward distribution.
     *
     * Supported action types:
     * - USER_LOGIN: Daily login quests
     * - POST_VIEWED: Reading posts quests
     * - POST_CREATED, COMMENT_CREATED, PETITION_SIGNED: Civic action quests
     * - FOLLOW_ADDED, FRIEND_REQUEST_SENT: Social interaction quests
     *
     * @param userId - The unique identifier of the user
     * @param actionType - The type of action performed (e.g., 'POST_CREATED', 'PETITION_SIGNED')
     * @param metadata - Optional additional data about the action (e.g., post ID, category)
     * @returns Promise<void>
     *
     * @example
     * // When user creates a post
     * await questService.updateQuestProgress('user_123', 'POST_CREATED', { postId: 'post_456' });
     *
     * @example
     * // When user views a post
     * await questService.updateQuestProgress('user_123', 'POST_VIEWED');
     */
    async updateQuestProgress(userId, actionType, metadata) {
        // Get user's active quests
        const activeQuests = await prisma_1.prisma.userQuestProgress.findMany({
            where: {
                userId,
                completed: false
            },
            include: {
                quest: true
            }
        });
        for (const questProgress of activeQuests) {
            const requirements = questProgress.quest.requirements;
            let shouldUpdate = false;
            let progressIncrement = 0;
            // Check if this action contributes to the quest
            switch (requirements.type) {
                case 'LOGIN':
                    if (actionType === 'USER_LOGIN') {
                        shouldUpdate = true;
                        progressIncrement = 1;
                    }
                    break;
                case 'READ_POSTS':
                    if (actionType === 'POST_VIEWED') {
                        shouldUpdate = true;
                        progressIncrement = 1;
                    }
                    break;
                case 'CIVIC_ACTION':
                    if (requirements.metadata?.actionType === actionType) {
                        shouldUpdate = true;
                        progressIncrement = 1;
                    }
                    break;
                case 'SOCIAL_INTERACTION':
                    if (['FOLLOW_ADDED', 'FRIEND_REQUEST_SENT'].includes(actionType)) {
                        shouldUpdate = true;
                        progressIncrement = 1;
                    }
                    break;
            }
            if (shouldUpdate) {
                const currentProgress = questProgress.progress;
                const newProgress = {
                    ...currentProgress,
                    completed: (currentProgress.completed || 0) + progressIncrement,
                    target: requirements.target
                };
                const isCompleted = newProgress.completed >= requirements.target;
                await prisma_1.prisma.userQuestProgress.update({
                    where: { id: questProgress.id },
                    data: {
                        progress: newProgress,
                        completed: isCompleted,
                        completedAt: isCompleted ? new Date() : null
                    }
                });
                if (isCompleted) {
                    await this.handleQuestCompletion(userId, questProgress.questId);
                }
            }
        }
    }
    // Handle quest completion
    async handleQuestCompletion(userId, questId) {
        const quest = await prisma_1.prisma.quest.findUnique({
            where: { id: questId }
        });
        if (!quest)
            return;
        const rewards = quest.rewards;
        // Award reputation points
        if (rewards.reputationPoints) {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId }
            });
            if (user) {
                const newScore = Math.min(100, (user.reputationScore || 70) + rewards.reputationPoints);
                await prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: {
                        reputationScore: newScore,
                        reputationUpdatedAt: new Date()
                    }
                });
                // Log reputation event
                await prisma_1.prisma.reputationEvent.create({
                    data: {
                        userId,
                        eventType: 'QUEST_COMPLETED',
                        impact: rewards.reputationPoints,
                        reason: `Completed quest: ${quest.title}`,
                        details: { questId, questTitle: quest.title }
                    }
                });
            }
        }
        // Award badges
        if (rewards.badges && rewards.badges.length > 0) {
            for (const badgeId of rewards.badges) {
                try {
                    await badge_service_1.default.awardBadge(userId, badgeId, undefined, `Earned from quest: ${quest.title}`);
                }
                catch (error) {
                    logger_1.logger.error({ error, badgeId, userId, questId }, 'Error awarding badge from quest');
                }
            }
        }
        // Update streak
        await this.updateUserStreak(userId, quest.type);
        // Send notification
        await prisma_1.prisma.notification.create({
            data: {
                type: 'REACTION',
                senderId: 'system',
                receiverId: userId,
                message: `Quest completed: ${quest.title}!`
            }
        });
    }
    // Update user streak
    async updateUserStreak(userId, questType) {
        let streak = await prisma_1.prisma.userQuestStreak.findUnique({
            where: { userId }
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!streak) {
            streak = await prisma_1.prisma.userQuestStreak.create({
                data: {
                    userId,
                    currentDailyStreak: 1,
                    longestDailyStreak: 1,
                    lastCompletedDate: today,
                    totalQuestsCompleted: 1
                }
            });
        }
        else {
            const lastCompleted = streak.lastCompletedDate ? new Date(streak.lastCompletedDate) : null;
            if (lastCompleted) {
                lastCompleted.setHours(0, 0, 0, 0);
            }
            const daysSinceLastCompletion = lastCompleted
                ? Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
            let newDailyStreak = streak.currentDailyStreak;
            if (daysSinceLastCompletion === 0) {
                // Already completed today, just increment total
            }
            else if (daysSinceLastCompletion === 1) {
                // Consecutive day, increment streak
                newDailyStreak++;
            }
            else {
                // Streak broken, reset to 1
                newDailyStreak = 1;
            }
            const longestDailyStreak = Math.max(newDailyStreak, streak.longestDailyStreak);
            // Update weekly streak if applicable
            const currentWeek = Math.floor(today.getTime() / (1000 * 60 * 60 * 24 * 7));
            const lastCompletedWeek = lastCompleted
                ? Math.floor(lastCompleted.getTime() / (1000 * 60 * 60 * 24 * 7))
                : 0;
            let newWeeklyStreak = streak.currentWeeklyStreak;
            if (currentWeek === lastCompletedWeek + 1) {
                newWeeklyStreak++;
            }
            else if (currentWeek > lastCompletedWeek + 1) {
                newWeeklyStreak = 1;
            }
            await prisma_1.prisma.userQuestStreak.update({
                where: { userId },
                data: {
                    currentDailyStreak: newDailyStreak,
                    longestDailyStreak,
                    currentWeeklyStreak: newWeeklyStreak,
                    longestWeeklyStreak: Math.max(newWeeklyStreak, streak.longestWeeklyStreak),
                    lastCompletedDate: today,
                    totalQuestsCompleted: streak.totalQuestsCompleted + 1
                }
            });
        }
    }
    /**
     * Retrieves comprehensive quest progress data for a user
     *
     * Returns all quest progress entries organized by timeframe and completion status,
     * plus streak statistics and summary data.
     *
     * @param userId - The unique identifier of the user
     * @returns Promise<Object> Object containing:
     *   - dailyQuests: Daily quest progress entries
     *   - weeklyQuests: Weekly quest progress entries
     *   - activeQuests: Currently incomplete quests
     *   - completedQuests: All completed quests
     *   - streak: UserQuestStreak record with current/longest streaks
     *   - stats: Summary statistics (totalCompleted, dailyStreak, weeklyStreak, longestStreak)
     *
     * @example
     * const progress = await questService.getUserQuestProgress('user_123');
     * console.log(progress.stats.dailyStreak); // 7
     * console.log(progress.activeQuests.length); // 2
     */
    async getUserQuestProgress(userId) {
        const questProgress = await prisma_1.prisma.userQuestProgress.findMany({
            where: { userId },
            include: {
                quest: true
            },
            orderBy: [
                { completed: 'asc' },
                { startedAt: 'desc' }
            ]
        });
        const streak = await prisma_1.prisma.userQuestStreak.findUnique({
            where: { userId }
        });
        const dailyQuests = questProgress.filter(qp => qp.quest.timeframe === 'DAILY');
        const weeklyQuests = questProgress.filter(qp => qp.quest.timeframe === 'WEEKLY');
        const activeQuests = questProgress.filter(qp => !qp.completed);
        const completedQuests = questProgress.filter(qp => qp.completed);
        return {
            dailyQuests,
            weeklyQuests,
            activeQuests,
            completedQuests,
            streak,
            stats: {
                totalCompleted: completedQuests.length,
                dailyStreak: streak?.currentDailyStreak || 0,
                weeklyStreak: streak?.currentWeeklyStreak || 0,
                longestStreak: streak?.longestDailyStreak || 0
            }
        };
    }
    /**
     * Creates a standard weekly engagement quest
     *
     * Creates the "Weekly Civic Champion" quest that requires completing 5 daily quests
     * within a week. Typically called by scheduled task at the start of each week.
     *
     * @returns Promise<Quest> The created weekly quest
     *
     * @example
     * const weeklyQuest = await questService.createWeeklyQuest();
     * console.log(weeklyQuest.title); // "Weekly Civic Champion"
     * console.log(weeklyQuest.requirements.target); // 5
     */
    async createWeeklyQuest() {
        return await prisma_1.prisma.quest.create({
            data: {
                type: 'WEEKLY_ENGAGEMENT',
                category: 'COMMUNITY',
                title: 'Weekly Civic Champion',
                description: 'Complete at least 5 daily quests this week to maintain your civic engagement streak.',
                shortDescription: 'Complete 5 daily quests',
                requirements: {
                    type: 'COMPLETE_QUESTS',
                    target: 5,
                    timeframe: 'weekly',
                    metadata: {
                        questTypes: ['DAILY_HABIT', 'DAILY_CIVIC']
                    }
                },
                rewards: {
                    reputationPoints: 10,
                    experiencePoints: 100,
                    badges: [] // Could include weekly champion badge
                },
                timeframe: 'WEEKLY',
                displayOrder: 10
            }
        });
    }
    /**
     * Creates a custom quest with specified parameters (admin function)
     *
     * @param data - Quest creation data including type, category, title, description,
     *   requirements (JSON object), rewards (JSON object), timeframe, etc.
     * @returns Promise<Quest> The created quest
     * @throws {Error} When required fields are missing or invalid
     *
     * @example
     * const quest = await questService.createQuest({
     *   type: 'SPECIAL_EVENT',
     *   category: 'ADVOCACY',
     *   title: 'Climate Action Week',
     *   description: 'Take climate action this week',
     *   requirements: { type: 'CIVIC_ACTION', target: 3, timeframe: 'weekly' },
     *   rewards: { reputationPoints: 15, badges: ['badge_climate'] },
     *   timeframe: 'WEEKLY',
     *   createdBy: 'admin_123'
     * });
     */
    async createQuest(data) {
        return await prisma_1.prisma.quest.create({
            data: {
                ...data,
                requirements: data.requirements,
                rewards: data.rewards
            }
        });
    }
    /**
     * Retrieves all quests in the system (admin function)
     *
     * Returns all quests with user progress counts, sorted by active status,
     * display order, and creation date.
     *
     * @returns Promise<Quest[]> Array of all quests with _count.userProgress included
     *
     * @example
     * const allQuests = await questService.getAllQuests();
     * console.log(allQuests[0]._count.userProgress); // 42 users working on this quest
     */
    async getAllQuests() {
        return await prisma_1.prisma.quest.findMany({
            include: {
                _count: {
                    select: {
                        userProgress: true
                    }
                }
            },
            orderBy: [
                { isActive: 'desc' },
                { displayOrder: 'asc' },
                { createdAt: 'desc' }
            ]
        });
    }
    /**
     * Updates an existing quest's properties (admin function)
     *
     * Only provided fields will be updated - all fields are optional.
     *
     * @param questId - The unique identifier of the quest to update
     * @param updates - Partial quest data with fields to update
     * @returns Promise<Quest> The updated quest
     * @throws {Error} When quest is not found
     *
     * @example
     * const updated = await questService.updateQuest('quest_123', {
     *   isActive: false,
     *   description: 'Updated description'
     * });
     */
    async updateQuest(questId, updates) {
        const data = {};
        if (updates.title !== undefined)
            data.title = updates.title;
        if (updates.description !== undefined)
            data.description = updates.description;
        if (updates.shortDescription !== undefined)
            data.shortDescription = updates.shortDescription;
        if (updates.requirements !== undefined)
            data.requirements = updates.requirements;
        if (updates.rewards !== undefined)
            data.rewards = updates.rewards;
        if (updates.displayOrder !== undefined)
            data.displayOrder = updates.displayOrder;
        if (updates.isActive !== undefined)
            data.isActive = updates.isActive;
        if (updates.startDate !== undefined)
            data.startDate = updates.startDate;
        if (updates.endDate !== undefined)
            data.endDate = updates.endDate;
        return await prisma_1.prisma.quest.update({
            where: { id: questId },
            data
        });
    }
    /**
     * Retrieves quest system analytics (admin function)
     *
     * Returns aggregated statistics about quest system performance including:
     * - Total/active quest counts
     * - Progress data by quest and completion status
     * - Streak statistics (averages and maximums)
     * - Completion rates per quest
     *
     * @returns Promise<Object> Object containing:
     *   - totalQuests: Total count of quests
     *   - activeQuests: Count of active quests
     *   - questProgress: Array of progress grouped by questId and completion status
     *   - streakStats: Aggregate streak statistics (_avg and _max)
     *   - completionRates: Array of completion data per quest
     *
     * @example
     * const analytics = await questService.getQuestAnalytics();
     * console.log(analytics.streakStats._avg.currentDailyStreak); // 5.3
     * console.log(analytics.totalQuests); // 15
     */
    async getQuestAnalytics() {
        const totalQuests = await prisma_1.prisma.quest.count();
        const activeQuests = await prisma_1.prisma.quest.count({ where: { isActive: true } });
        const questProgress = await prisma_1.prisma.userQuestProgress.groupBy({
            by: ['questId', 'completed'],
            _count: true
        });
        const streakStats = await prisma_1.prisma.userQuestStreak.aggregate({
            _avg: {
                currentDailyStreak: true,
                longestDailyStreak: true,
                totalQuestsCompleted: true
            },
            _max: {
                currentDailyStreak: true,
                longestDailyStreak: true,
                totalQuestsCompleted: true
            }
        });
        return {
            totalQuests,
            activeQuests,
            questProgress,
            streakStats,
            completionRates: questProgress.map(qp => ({
                questId: qp.questId,
                completed: qp.completed,
                count: qp._count
            }))
        };
    }
}
exports.default = new QuestService();
//# sourceMappingURL=quest.service.js.map