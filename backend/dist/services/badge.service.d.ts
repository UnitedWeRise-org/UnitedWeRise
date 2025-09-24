import { Badge, UserBadge } from '@prisma/client';
interface BadgeQualificationCriteria {
    type: 'QUEST_COMPLETION' | 'USER_ACTIVITY' | 'CIVIC_ACTION' | 'SOCIAL_METRIC' | 'CUSTOM_ENDPOINT';
    requirements: {
        questTypes?: string[];
        questCompletionCount?: number;
        streakDays?: number;
        activityTypes?: string[];
        activityCount?: number;
        timeframe?: string;
        petitionsSigned?: number;
        eventsAttended?: number;
        postsCreated?: number;
        reputationScore?: number;
        followersCount?: number;
        friendsCount?: number;
        customEndpoint?: string;
        customParams?: any;
    };
}
interface BadgeCreateInput {
    name: string;
    description: string;
    imageFile?: Express.Multer.File;
    imageUrl?: string;
    qualificationCriteria: BadgeQualificationCriteria;
    isAutoAwarded?: boolean;
    maxAwards?: number;
    displayOrder?: number;
    createdBy?: string;
}
declare class BadgeService {
    private storageClient;
    private containerName;
    constructor();
    uploadBadgeImage(file: Express.Multer.File, badgeName: string): Promise<string>;
    createBadge(data: BadgeCreateInput): Promise<Badge>;
    awardBadge(userId: string, badgeId: string, awardedBy?: string, reason?: string): Promise<UserBadge>;
    checkUserQualifications(userId: string, badgeId: string): Promise<boolean>;
    private checkQuestCriteria;
    private checkActivityCriteria;
    private checkCivicCriteria;
    private checkSocialCriteria;
    private checkCustomEndpoint;
    runBadgeQualificationChecks(): Promise<number>;
    getUserBadges(userId: string): Promise<any>;
    updateBadgeDisplay(userId: string, badgeId: string, isDisplayed: boolean, displayOrder?: number): Promise<UserBadge>;
    getAllBadges(): Promise<Badge[]>;
    updateBadge(badgeId: string, updates: Partial<BadgeCreateInput>): Promise<Badge>;
    deleteBadge(badgeId: string): Promise<void>;
}
declare const _default: BadgeService;
export default _default;
//# sourceMappingURL=badge.service.d.ts.map