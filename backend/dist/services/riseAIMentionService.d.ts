/**
 * RiseAI Mention Detection Service
 *
 * Detects @RiseAI mentions in posts and comments, validates rate limits,
 * and initiates the analysis pipeline.
 */
import { Prisma } from '@prisma/client';
interface MentionContext {
    mentionIndex: number;
    contentBefore: string;
    contentAfter: string;
    targetContent: string;
    isDirectMention: boolean;
}
interface MentionDetectionResult {
    hasMention: boolean;
    contexts: MentionContext[];
}
interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetTime: Date;
}
export declare class RiseAIMentionService {
    private static readonly MENTION_PATTERNS;
    /**
     * Detect @RiseAI mentions in text content
     */
    static detectMentions(content: string): MentionDetectionResult;
    /**
     * Get or create RiseAI settings
     */
    static getSettings(): Promise<{
        id: string;
        updatedAt: Date;
        dailyLimitNonAdmin: number;
        dailyLimitAdmin: number;
        confidenceThreshold: number;
        isEnabled: boolean;
        updatedById: string | null;
    }>;
    /**
     * Check if user can make a RiseAI request (rate limiting)
     */
    static checkRateLimit(userId: string): Promise<RateLimitResult>;
    /**
     * Increment usage count for user
     */
    static incrementUsage(userId: string): Promise<void>;
    /**
     * Create a new RiseAI interaction record
     */
    static createInteraction(params: {
        triggerPostId: string;
        triggerUserId: string;
        triggerCommentId?: string;
        targetContent: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        entropyScore: number | null;
        triggerCommentId: string | null;
        triggerPostId: string;
        triggerUserId: string;
        targetContent: string;
        analysisResult: Prisma.JsonValue | null;
        fallaciesFound: string[];
        argumentsUsed: string[];
        argumentsReferenced: string[];
        responseCommentId: string | null;
        responseContent: string | null;
        followUpCount: number;
    }>;
    /**
     * Update interaction with analysis results
     */
    static updateInteraction(interactionId: string, updates: {
        analysisResult?: Prisma.InputJsonValue;
        entropyScore?: number;
        fallaciesFound?: string[];
        argumentsUsed?: string[];
        argumentsReferenced?: string[];
        responseContent?: string;
        responseCommentId?: string;
        status: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        entropyScore: number | null;
        triggerCommentId: string | null;
        triggerPostId: string;
        triggerUserId: string;
        targetContent: string;
        analysisResult: Prisma.JsonValue | null;
        fallaciesFound: string[];
        argumentsUsed: string[];
        argumentsReferenced: string[];
        responseCommentId: string | null;
        responseContent: string | null;
        followUpCount: number;
    }>;
    /**
     * Get user's recent interactions
     */
    static getUserInteractions(userId: string, limit?: number): Promise<({
        triggerPost: {
            id: string;
            content: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        entropyScore: number | null;
        triggerCommentId: string | null;
        triggerPostId: string;
        triggerUserId: string;
        targetContent: string;
        analysisResult: Prisma.JsonValue | null;
        fallaciesFound: string[];
        argumentsUsed: string[];
        argumentsReferenced: string[];
        responseCommentId: string | null;
        responseContent: string | null;
        followUpCount: number;
    })[]>;
    /**
     * Get interaction by ID
     */
    static getInteraction(interactionId: string): Promise<{
        triggerPost: {
            id: string;
            content: string;
            author: {
                id: string;
                username: string;
                displayName: string;
            };
        };
        triggerUser: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        entropyScore: number | null;
        triggerCommentId: string | null;
        triggerPostId: string;
        triggerUserId: string;
        targetContent: string;
        analysisResult: Prisma.JsonValue | null;
        fallaciesFound: string[];
        argumentsUsed: string[];
        argumentsReferenced: string[];
        responseCommentId: string | null;
        responseContent: string | null;
        followUpCount: number;
    }>;
    /**
     * Process a mention in a post or comment
     */
    static processMention(params: {
        postId: string;
        commentId?: string;
        userId: string;
        content: string;
    }): Promise<{
        success: boolean;
        interactionId?: string;
        error?: string;
        rateLimitInfo?: RateLimitResult;
    }>;
    /**
     * Get the next midnight for rate limit reset
     */
    private static getNextResetTime;
    /**
     * Admin: Update RiseAI settings
     */
    static updateSettings(updatedById: string, updates: {
        dailyLimitNonAdmin?: number;
        dailyLimitAdmin?: number;
        confidenceThreshold?: number;
        isEnabled?: boolean;
    }): Promise<{
        id: string;
        updatedAt: Date;
        dailyLimitNonAdmin: number;
        dailyLimitAdmin: number;
        confidenceThreshold: number;
        isEnabled: boolean;
        updatedById: string | null;
    }>;
}
export {};
//# sourceMappingURL=riseAIMentionService.d.ts.map