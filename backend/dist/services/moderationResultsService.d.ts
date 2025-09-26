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
    static createModerationResult(data: CreateModerationResultData): Promise<{
        photo: {
            id: string;
            createdAt: Date;
            userId: string;
            filename: string;
            url: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        riskScore: number;
        photoId: string;
        categories: import(".prisma/client").$Enums.ModerationCategory[];
        moderationType: string;
        aiAnalysisResults: import("@prisma/client/runtime/library.js").JsonValue | null;
        overallConfidence: number;
        primaryCategory: import(".prisma/client").$Enums.ModerationCategory | null;
        isSafe: boolean;
        requiresHumanReview: boolean;
        detectedObjects: string[];
        detectedText: string | null;
        textAnalysis: import("@prisma/client/runtime/library.js").JsonValue | null;
        faceCount: number | null;
        adultContentScore: number | null;
        violenceScore: number | null;
        racyScore: number | null;
        hateSpeechScore: number | null;
        spamScore: number | null;
        qualityScore: number | null;
        technicalMetadata: import("@prisma/client/runtime/library.js").JsonValue | null;
        processingTime: number | null;
        aiModel: string | null;
        modelVersion: string | null;
    }>;
    /**
     * Get moderation result by photo ID
     */
    static getModerationResultByPhotoId(photoId: string): Promise<{
        photo: {
            id: string;
            createdAt: Date;
            userId: string;
            filename: string;
            url: string;
            thumbnailUrl: string;
            moderationStatus: import(".prisma/client").$Enums.ModerationStatus;
        };
        reviews: ({
            reviewer: {
                id: string;
                username: string;
                isModerator: boolean;
                isAdmin: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            reason: string | null;
            reviewedAt: Date;
            notes: string | null;
            moderationResultId: string;
            reviewerId: string;
            decision: import(".prisma/client").$Enums.ModerationDecision;
            confidenceOverride: number | null;
            categoryOverride: import(".prisma/client").$Enums.ModerationCategory | null;
            isAppeal: boolean;
            originalDecision: import(".prisma/client").$Enums.ModerationDecision | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        riskScore: number;
        photoId: string;
        categories: import(".prisma/client").$Enums.ModerationCategory[];
        moderationType: string;
        aiAnalysisResults: import("@prisma/client/runtime/library.js").JsonValue | null;
        overallConfidence: number;
        primaryCategory: import(".prisma/client").$Enums.ModerationCategory | null;
        isSafe: boolean;
        requiresHumanReview: boolean;
        detectedObjects: string[];
        detectedText: string | null;
        textAnalysis: import("@prisma/client/runtime/library.js").JsonValue | null;
        faceCount: number | null;
        adultContentScore: number | null;
        violenceScore: number | null;
        racyScore: number | null;
        hateSpeechScore: number | null;
        spamScore: number | null;
        qualityScore: number | null;
        technicalMetadata: import("@prisma/client/runtime/library.js").JsonValue | null;
        processingTime: number | null;
        aiModel: string | null;
        modelVersion: string | null;
    }>;
    /**
     * Query moderation results with filters for admin dashboard
     */
    static queryModerationResults(query?: ModerationResultsQuery): Promise<{
        results: ({
            photo: {
                user: {
                    id: string;
                    email: string;
                    username: string;
                };
                id: string;
                createdAt: Date;
                userId: string;
                filename: string;
                url: string;
                thumbnailUrl: string;
                moderationStatus: import(".prisma/client").$Enums.ModerationStatus;
            };
            reviews: ({
                reviewer: {
                    id: string;
                    username: string;
                    isModerator: boolean;
                    isAdmin: boolean;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                reason: string | null;
                reviewedAt: Date;
                notes: string | null;
                moderationResultId: string;
                reviewerId: string;
                decision: import(".prisma/client").$Enums.ModerationDecision;
                confidenceOverride: number | null;
                categoryOverride: import(".prisma/client").$Enums.ModerationCategory | null;
                isAppeal: boolean;
                originalDecision: import(".prisma/client").$Enums.ModerationDecision | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            riskScore: number;
            photoId: string;
            categories: import(".prisma/client").$Enums.ModerationCategory[];
            moderationType: string;
            aiAnalysisResults: import("@prisma/client/runtime/library.js").JsonValue | null;
            overallConfidence: number;
            primaryCategory: import(".prisma/client").$Enums.ModerationCategory | null;
            isSafe: boolean;
            requiresHumanReview: boolean;
            detectedObjects: string[];
            detectedText: string | null;
            textAnalysis: import("@prisma/client/runtime/library.js").JsonValue | null;
            faceCount: number | null;
            adultContentScore: number | null;
            violenceScore: number | null;
            racyScore: number | null;
            hateSpeechScore: number | null;
            spamScore: number | null;
            qualityScore: number | null;
            technicalMetadata: import("@prisma/client/runtime/library.js").JsonValue | null;
            processingTime: number | null;
            aiModel: string | null;
            modelVersion: string | null;
        })[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Get pending items requiring human review
     */
    static getPendingReviewItems(limit?: number, offset?: number): Promise<{
        results: ({
            photo: {
                user: {
                    id: string;
                    email: string;
                    username: string;
                };
                id: string;
                createdAt: Date;
                userId: string;
                filename: string;
                url: string;
                thumbnailUrl: string;
                moderationStatus: import(".prisma/client").$Enums.ModerationStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            riskScore: number;
            photoId: string;
            categories: import(".prisma/client").$Enums.ModerationCategory[];
            moderationType: string;
            aiAnalysisResults: import("@prisma/client/runtime/library.js").JsonValue | null;
            overallConfidence: number;
            primaryCategory: import(".prisma/client").$Enums.ModerationCategory | null;
            isSafe: boolean;
            requiresHumanReview: boolean;
            detectedObjects: string[];
            detectedText: string | null;
            textAnalysis: import("@prisma/client/runtime/library.js").JsonValue | null;
            faceCount: number | null;
            adultContentScore: number | null;
            violenceScore: number | null;
            racyScore: number | null;
            hateSpeechScore: number | null;
            spamScore: number | null;
            qualityScore: number | null;
            technicalMetadata: import("@prisma/client/runtime/library.js").JsonValue | null;
            processingTime: number | null;
            aiModel: string | null;
            modelVersion: string | null;
        })[];
        totalPending: number;
        hasMore: boolean;
    }>;
    /**
     * Create a human moderation review
     */
    static createModerationReview(data: CreateModerationReviewData): Promise<{
        moderationResult: {
            photo: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                candidateId: string | null;
                isActive: boolean;
                postId: string | null;
                filename: string;
                url: string;
                thumbnailUrl: string | null;
                photoType: import(".prisma/client").$Enums.PhotoType;
                purpose: import(".prisma/client").$Enums.PhotoPurpose;
                originalSize: number;
                compressedSize: number;
                width: number;
                height: number;
                mimeType: string;
                isApproved: boolean;
                flaggedBy: string | null;
                flagReason: string | null;
                moderatedAt: Date | null;
                caption: string | null;
                gallery: string | null;
                moderationStatus: import(".prisma/client").$Enums.ModerationStatus;
                moderationScore: number | null;
                requiresReview: boolean;
                autoModerationPassed: boolean | null;
                humanReviewRequired: boolean;
                lastModerationAt: Date | null;
                moderationMetadata: import("@prisma/client/runtime/library.js").JsonValue | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            riskScore: number;
            photoId: string;
            categories: import(".prisma/client").$Enums.ModerationCategory[];
            moderationType: string;
            aiAnalysisResults: import("@prisma/client/runtime/library.js").JsonValue | null;
            overallConfidence: number;
            primaryCategory: import(".prisma/client").$Enums.ModerationCategory | null;
            isSafe: boolean;
            requiresHumanReview: boolean;
            detectedObjects: string[];
            detectedText: string | null;
            textAnalysis: import("@prisma/client/runtime/library.js").JsonValue | null;
            faceCount: number | null;
            adultContentScore: number | null;
            violenceScore: number | null;
            racyScore: number | null;
            hateSpeechScore: number | null;
            spamScore: number | null;
            qualityScore: number | null;
            technicalMetadata: import("@prisma/client/runtime/library.js").JsonValue | null;
            processingTime: number | null;
            aiModel: string | null;
            modelVersion: string | null;
        };
        reviewer: {
            id: string;
            username: string;
            isModerator: boolean;
            isAdmin: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
        reviewedAt: Date;
        notes: string | null;
        moderationResultId: string;
        reviewerId: string;
        decision: import(".prisma/client").$Enums.ModerationDecision;
        confidenceOverride: number | null;
        categoryOverride: import(".prisma/client").$Enums.ModerationCategory | null;
        isAppeal: boolean;
        originalDecision: import(".prisma/client").$Enums.ModerationDecision | null;
    }>;
    /**
     * Get moderation statistics for admin dashboard
     */
    static getModerationStatistics(): Promise<{
        totalImages: number;
        pendingReview: number;
        approved: number;
        rejected: number;
        flagged: number;
        highRiskImages: number;
        recentActivity: number;
    }>;
    /**
     * Update photo moderation status based on AI analysis
     */
    private static updatePhotoModerationStatus;
    /**
     * Apply moderation decision to photo
     */
    private static applyModerationDecision;
    /**
     * Bulk approve multiple images
     */
    static bulkApproveImages(photoIds: string[], reviewerId: string, reason?: string): Promise<any[]>;
}
export default ModerationResultsService;
//# sourceMappingURL=moderationResultsService.d.ts.map