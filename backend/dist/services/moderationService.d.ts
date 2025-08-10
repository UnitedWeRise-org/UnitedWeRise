declare class ModerationService {
    private prisma;
    private toxicityThreshold;
    private spamKeywords;
    constructor();
    analyzeContent(content: string, contentType: 'POST' | 'COMMENT' | 'MESSAGE', contentId: string): Promise<void>;
    private detectSpam;
    private detectToxicity;
    private detectHateSpeech;
    private detectDuplicateContent;
    private getSpamIndicators;
    private getHateSpeechTerms;
    private autoModerate;
    createReport(reporterId: string, targetType: 'POST' | 'COMMENT' | 'USER' | 'MESSAGE', targetId: string, reason: string, description?: string): Promise<string>;
    private determinePriority;
    private escalateReport;
    getUserSuspensionStatus(userId: string): Promise<{
        isSuspended: boolean;
        suspension?: any;
        canPost: boolean;
        canComment: boolean;
    }>;
    issueWarning(userId: string, moderatorId: string, reason: string, severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'FINAL', notes?: string): Promise<void>;
    suspendUser(userId: string, moderatorId: string, reason: string, type: 'TEMPORARY' | 'PERMANENT' | 'POSTING_RESTRICTED' | 'COMMENTING_RESTRICTED', endsAt?: Date): Promise<void>;
    cleanupExpiredSuspensions(): Promise<void>;
}
export declare const moderationService: ModerationService;
export {};
//# sourceMappingURL=moderationService.d.ts.map