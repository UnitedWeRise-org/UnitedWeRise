import { ModerationStatus, ModerationCategory, ModerationDecision } from '@prisma/client';
interface CreateModerationResultData {
    photoId: string;
    moderationType?: string;
    aiAnalysisResults?: any;
    overallConfidence?: number;
    categories?: ModerationCategory[];
    primaryCategory?: ModerationCategory;
    riskScore?: number;
    isSafe?: boolean;
    requiresHumanReview?: boolean;
    detectedObjects?: string[];
    detectedText?: string;
    textAnalysis?: any;
    faceCount?: number;
    adultContentScore?: number;
    violenceScore?: number;
    racyScore?: number;
    hateSpeechScore?: number;
    spamScore?: number;
    qualityScore?: number;
    technicalMetadata?: any;
    processingTime?: number;
    aiModel?: string;
    modelVersion?: string;
}
interface CreateModerationReviewData {
    moderationResultId: string;
    reviewerId: string;
    decision: ModerationDecision;
    reason?: string;
    notes?: string;
    confidenceOverride?: number;
    categoryOverride?: ModerationCategory;
    isAppeal?: boolean;
    originalDecision?: ModerationDecision;
}
interface ModerationResultsQuery {
    status?: ModerationStatus;
    requiresReview?: boolean;
    riskScoreMin?: number;
    riskScoreMax?: number;
    categories?: ModerationCategory[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'riskScore' | 'overallConfidence';
    orderDirection?: 'asc' | 'desc';
}
/**
 * Service for managing image moderation results and reviews
 */
export declare class ModerationResultsService {
    /**
     * Create a new moderation result for a photo
     */
    static createModerationResult(data: CreateModerationResultData): Promise<any>;
    /**
     * Get moderation result by photo ID
     */
    static getModerationResultByPhotoId(photoId: string): Promise<any>;
    /**
     * Query moderation results with filters for admin dashboard
     */
    static queryModerationResults(query?: ModerationResultsQuery): Promise<{
        results: any;
        totalCount: any;
        hasMore: boolean;
    }>;
    /**
     * Get pending items requiring human review
     */
    static getPendingReviewItems(limit?: number, offset?: number): Promise<{
        results: any;
        totalPending: any;
        hasMore: boolean;
    }>;
    /**
     * Create a human moderation review
     */
    static createModerationReview(data: CreateModerationReviewData): Promise<any>;
    /**
     * Get moderation statistics for admin dashboard
     */
    static getModerationStatistics(): Promise<{
        totalImages: any;
        pendingReview: any;
        highRiskImages: any;
        recentActivity: any;
    }>;
    /**
     * Update photo moderation status based on AI analysis
     * NOTE: Photo model removed - this method is now a no-op
     */
    private static updatePhotoModerationStatus;
    /**
     * Apply moderation decision to photo
     * NOTE: Photo model removed - this method is now a no-op
     */
    private static applyModerationDecision;
    /**
     * Bulk approve multiple images
     */
    static bulkApproveImages(photoIds: string[], reviewerId: string, reason?: string): Promise<any[]>;
}
export default ModerationResultsService;
//# sourceMappingURL=moderationResultsService.d.ts.map