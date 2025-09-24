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
    generateDailyQuests(userId: string): Promise<Quest[]>;
    private getOrCreateDailyHabitQuest;
    private getOrCreateDailyCivicQuest;
    private getOrCreateSocialQuest;
    private assignQuestToUser;
    updateQuestProgress(userId: string, actionType: string, metadata?: any): Promise<void>;
    private handleQuestCompletion;
    private updateUserStreak;
    getUserQuestProgress(userId: string): Promise<any>;
    createWeeklyQuest(): Promise<Quest>;
    createQuest(data: QuestCreateInput): Promise<Quest>;
    getAllQuests(): Promise<Quest[]>;
    updateQuest(questId: string, updates: Partial<QuestCreateInput>): Promise<Quest>;
    getQuestAnalytics(): Promise<any>;
}
declare const _default: QuestService;
export default _default;
//# sourceMappingURL=quest.service.d.ts.map