import { Quest, QuestType, QuestCategory, QuestTimeframe } from '@prisma/client';
interface QuestRequirement {
    type: 'LOGIN' | 'READ_POSTS' | 'CIVIC_ACTION' | 'SOCIAL_INTERACTION' | 'COMPLETE_QUESTS';
    target: number;
    timeframe: 'daily' | 'weekly' | 'monthly';
    metadata?: {
        categories?: string[];
        minDuration?: number;
        actionType?: string;
        questTypes?: string[];
    };
}
interface QuestReward {
    reputationPoints?: number;
    badges?: string[];
    specialRecognition?: string;
    experiencePoints?: number;
}
interface QuestCreateInput {
    type: QuestType;
    category: QuestCategory;
    title: string;
    description: string;
    shortDescription?: string;
    requirements: QuestRequirement;
    rewards: QuestReward;
    timeframe: QuestTimeframe;
    displayOrder?: number;
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
    createdBy?: string;
}
declare class QuestService {
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
    generateDailyQuests(userId: string): Promise<Quest[]>;
    private getOrCreateDailyHabitQuest;
    private getOrCreateDailyCivicQuest;
    private getOrCreateSocialQuest;
    private assignQuestToUser;
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
    updateQuestProgress(userId: string, actionType: string, metadata?: any): Promise<void>;
    private handleQuestCompletion;
    private updateUserStreak;
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
    getUserQuestProgress(userId: string): Promise<any>;
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
    createWeeklyQuest(): Promise<Quest>;
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
    createQuest(data: QuestCreateInput): Promise<Quest>;
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
    getAllQuests(): Promise<Quest[]>;
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
    updateQuest(questId: string, updates: Partial<QuestCreateInput>): Promise<Quest>;
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
    getQuestAnalytics(): Promise<any>;
}
declare const _default: QuestService;
export default _default;
//# sourceMappingURL=quest.service.d.ts.map