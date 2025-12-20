/**
 * RiseAI Agent Service
 *
 * Core AI agent that performs logical analysis using the Entropy/Homeostasis Framework.
 * Uses Azure OpenAI for reasoning and the Argument Ledger for context.
 */
import { Prisma } from '@prisma/client';
interface AnalysisResult {
    entropyScore: number;
    logicalValidity: number;
    evidenceQuality: number;
    fallaciesFound: string[];
    ethicalConcerns: string[];
    confidence: number;
    summary: string;
    relatedArguments: {
        id: string;
        content: string;
        similarity: number;
        supportOrRefute: 'support' | 'refute' | 'neutral';
    }[];
    recommendation: string;
}
export declare class RiseAIAgentService {
    /**
     * Ensure RiseAI system user exists
     * Uses upsert to handle race conditions and existing users with matching email/username
     */
    static ensureSystemUser(): Promise<{
        password: string | null;
        id: string;
        email: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        bio: string | null;
        website: string | null;
        location: string | null;
        verified: boolean;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        streetAddress: string | null;
        streetAddress2: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        h3Index: string | null;
        politicalProfileType: import(".prisma/client").$Enums.PoliticalProfileType;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        verificationDocuments: string[];
        office: string | null;
        campaignWebsite: string | null;
        officialTitle: string | null;
        termStart: Date | null;
        termEnd: Date | null;
        emailVerified: boolean;
        emailVerifyToken: string | null;
        emailVerifyExpiry: Date | null;
        phoneNumber: string | null;
        phoneVerified: boolean;
        phoneVerifyCode: string | null;
        phoneVerifyExpiry: Date | null;
        maritalStatus: string | null;
        profilePrivacySettings: Prisma.JsonValue | null;
        resetToken: string | null;
        resetExpiry: Date | null;
        isOnline: boolean;
        lastSeenAt: Date;
        isModerator: boolean;
        isAdmin: boolean;
        isSuperAdmin: boolean;
        isSuspended: boolean;
        onboardingData: Prisma.JsonValue | null;
        onboardingCompleted: boolean;
        interests: string[];
        notificationPreferences: Prisma.JsonValue | null;
        uiPreferences: Prisma.JsonValue | null;
        displayName: string | null;
        followingCount: number;
        followersCount: number;
        deviceFingerprint: Prisma.JsonValue | null;
        lastLoginAt: Date | null;
        lastLoginIp: string | null;
        lockedUntil: Date | null;
        loginAttempts: number;
        passwordChangedAt: Date | null;
        riskScore: number;
        suspiciousActivityCount: number;
        reputationScore: number | null;
        reputationUpdatedAt: Date | null;
        allowTagsByFriendsOnly: boolean;
        photoTaggingEnabled: boolean;
        requireTagApproval: boolean;
        backgroundImage: string | null;
        totpBackupCodes: string[];
        totpEnabled: boolean;
        totpLastUsedAt: Date | null;
        totpSecret: string | null;
        totpSetupAt: Date | null;
    }>;
    /**
     * Analyze content using the Entropy/Homeostasis Framework
     */
    static analyzeContent(content: string, interactionId: string): Promise<AnalysisResult>;
    /**
     * Process a complete RiseAI interaction
     */
    static processInteraction(interactionId: string): Promise<{
        success: boolean;
        responseContent?: string;
        responseCommentId?: string;
        error?: string;
    }>;
    /**
     * Create a reply comment from RiseAI system user
     */
    private static createReplyComment;
    /**
     * Detect logical fallacies in content
     */
    private static detectFallacies;
    /**
     * Assess content against ethical/IHL framework
     */
    private static assessEthicalFramework;
    /**
     * Calculate entropy score (stability assessment)
     * 10 = promotes stability/peace
     * 0 = promotes chaos/conflict
     */
    private static calculateEntropyScore;
    /**
     * Determine if related argument supports or refutes the content
     */
    private static determineStance;
    /**
     * Generate recommendation based on analysis
     */
    private static generateRecommendation;
    /**
     * Format analysis into a public response
     */
    private static formatResponse;
    /**
     * Generate heuristic summary when AI is unavailable
     */
    private static generateHeuristicSummary;
    /**
     * Use Azure OpenAI for deeper analysis
     */
    private static performAIAnalysis;
    /**
     * Generate a conversational response using Azure OpenAI
     * This replaces the scorecard-based formatResponse for user-facing output
     */
    static generateConversationalResponse(fullContent: string, context: {
        relatedArguments: Array<{
            id: string;
            content: string;
            similarity: number;
        }>;
        relatedFacts: Array<{
            id: string;
            claim: string;
            confidence: number;
        }>;
    }): Promise<string>;
    /**
     * Extract arguments from analyzed content and store in ledger
     */
    private static extractAndStoreArguments;
}
export {};
//# sourceMappingURL=riseAIAgentService.d.ts.map