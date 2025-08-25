interface ReputationEvent {
    userId: string;
    eventType: string;
    reason: string;
    impact: number;
    postId?: string;
    validated: boolean;
    details?: any;
}
interface ReputationScore {
    current: number;
    tier: 'boosted' | 'normal' | 'suppressed' | 'heavily_suppressed';
    visibilityMultiplier: number;
    lastUpdated: Date;
}
export declare class ReputationService {
    private prisma;
    constructor();
    /**
     * Get user's current reputation score
     */
    getUserReputation(userId: string): Promise<ReputationScore>;
    /**
     * Apply reputation change with all validations
     */
    applyReputationChange(event: ReputationEvent): Promise<ReputationScore>;
    /**
     * Analyze content and apply appropriate penalties
     */
    analyzeAndApplyPenalties(content: string, userId: string, postId: string): Promise<{
        penalties: string[];
        totalPenalty: number;
    }>;
    /**
     * Generate content warning before posting
     */
    generateContentWarning(content: string, userId: string): Promise<{
        showWarning: boolean;
        issues: string[];
        potentialPenalty: number;
        message: string;
    }>;
    /**
     * Award reputation for positive actions
     */
    awardReputation(userId: string, reason: 'quality_post' | 'constructive' | 'helpful' | 'positive_feedback', postId?: string): Promise<ReputationScore>;
    /**
     * Handle community reports
     */
    processReport(reporterId: string, targetUserId: string, postId: string, reason: string, content: string): Promise<{
        accepted: boolean;
        penalty?: number;
    }>;
    /**
     * Appeal a reputation penalty
     */
    processAppeal(userId: string, eventId: string, reason: string): Promise<{
        decision: 'overturned' | 'upheld' | 'under_review';
        explanation: string;
    }>;
    private getTier;
    private getVisibilityMultiplier;
    private getTodayGain;
    private analyzeContent;
    private validateReport;
    private reviewAppeal;
    private flagForAdminReview;
    private logReputationEvent;
}
export declare const reputationService: ReputationService;
export {};
//# sourceMappingURL=reputationService.d.ts.map