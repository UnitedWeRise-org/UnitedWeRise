/**
 * Argument Ledger Service
 *
 * Manages the dynamic repository of arguments extracted from user discourse.
 * Handles semantic similarity matching, confidence propagation, and clustering.
 */
import { Prisma } from '@prisma/client';
interface ArgumentCreateParams {
    content: string;
    summary?: string;
    sourcePostId: string;
    sourceUserId: string;
    logicalValidity?: number;
    evidenceQuality?: number;
    coherence?: number;
    entropyScore?: number;
}
interface ArgumentUpdateResult {
    argumentId: string;
    oldConfidence: number;
    newConfidence: number;
    propagatedTo: string[];
}
interface SimilarArgument {
    id: string;
    content: string;
    summary: string | null;
    confidence: number;
    effectiveConfidence: number | null;
    similarity: number;
}
export declare class ArgumentLedgerService {
    /**
     * Create a new argument entry with embedding
     */
    static createArgument(params: ArgumentCreateParams): Promise<{
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        confidence: number;
        content: string;
        summary: string | null;
        sourcePostId: string;
        sourceUserId: string;
        confidenceHistory: Prisma.JsonValue;
        logicalValidity: number | null;
        evidenceQuality: number | null;
        coherence: number | null;
        entropyScore: number | null;
        supportCount: number;
        refuteCount: number;
        citationCount: number;
        clusterId: string | null;
        isClusterHead: boolean;
        effectiveConfidence: number | null;
    }>;
    /**
     * Find semantically similar arguments
     */
    static findSimilarArguments(embedding: number[], limit?: number, excludeId?: string): Promise<SimilarArgument[]>;
    /**
     * Update argument confidence with propagation to similar arguments
     */
    static updateConfidence(argumentId: string, newConfidence: number, reason: string, interactionId?: string): Promise<ArgumentUpdateResult>;
    /**
     * Recalculate effective confidence based on linked facts
     */
    static recalculateEffectiveConfidence(argumentId: string): Promise<number>;
    /**
     * Check if argument should be clustered with similar ones
     */
    private static checkForClustering;
    /**
     * Get arguments by cluster
     */
    static getClusterArguments(clusterId: string): Promise<({
        sourcePost: {
            id: string;
            content: string;
        };
        sourceUser: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        confidence: number;
        content: string;
        summary: string | null;
        sourcePostId: string;
        sourceUserId: string;
        confidenceHistory: Prisma.JsonValue;
        logicalValidity: number | null;
        evidenceQuality: number | null;
        coherence: number | null;
        entropyScore: number | null;
        supportCount: number;
        refuteCount: number;
        citationCount: number;
        clusterId: string | null;
        isClusterHead: boolean;
        effectiveConfidence: number | null;
    })[]>;
    /**
     * Get top arguments by confidence
     */
    static getTopArguments(limit?: number): Promise<({
        sourceUser: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        confidence: number;
        content: string;
        summary: string | null;
        sourcePostId: string;
        sourceUserId: string;
        confidenceHistory: Prisma.JsonValue;
        logicalValidity: number | null;
        evidenceQuality: number | null;
        coherence: number | null;
        entropyScore: number | null;
        supportCount: number;
        refuteCount: number;
        citationCount: number;
        clusterId: string | null;
        isClusterHead: boolean;
        effectiveConfidence: number | null;
    })[]>;
    /**
     * Get arguments related to a post
     */
    static getPostArguments(postId: string): Promise<({
        sourceUser: {
            id: string;
            username: string;
            displayName: string;
        };
        factDependencies: ({
            factClaim: {
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                confidence: number;
                sourcePostId: string | null;
                sourceUserId: string | null;
                confidenceHistory: Prisma.JsonValue;
                citationCount: number;
                claim: string;
                challengeCount: number;
            };
        } & {
            id: string;
            factClaimId: string;
            argumentId: string;
            dependencyStrength: number;
        })[];
    } & {
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        confidence: number;
        content: string;
        summary: string | null;
        sourcePostId: string;
        sourceUserId: string;
        confidenceHistory: Prisma.JsonValue;
        logicalValidity: number | null;
        evidenceQuality: number | null;
        coherence: number | null;
        entropyScore: number | null;
        supportCount: number;
        refuteCount: number;
        citationCount: number;
        clusterId: string | null;
        isClusterHead: boolean;
        effectiveConfidence: number | null;
    })[]>;
    /**
     * Get argument by ID with full details
     */
    static getArgument(argumentId: string): Promise<{
        confidenceUpdates: {
            id: string;
            createdAt: Date;
            reason: string;
            argumentId: string;
            interactionId: string | null;
            oldConfidence: number;
            newConfidence: number;
            propagatedFrom: string | null;
            cosineSimilarity: number | null;
        }[];
        sourcePost: {
            id: string;
            content: string;
        };
        sourceUser: {
            id: string;
            username: string;
            displayName: string;
        };
        factDependencies: ({
            factClaim: {
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                confidence: number;
                sourcePostId: string | null;
                sourceUserId: string | null;
                confidenceHistory: Prisma.JsonValue;
                citationCount: number;
                claim: string;
                challengeCount: number;
            };
        } & {
            id: string;
            factClaimId: string;
            argumentId: string;
            dependencyStrength: number;
        })[];
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        confidence: number;
        content: string;
        summary: string | null;
        sourcePostId: string;
        sourceUserId: string;
        confidenceHistory: Prisma.JsonValue;
        logicalValidity: number | null;
        evidenceQuality: number | null;
        coherence: number | null;
        entropyScore: number | null;
        supportCount: number;
        refuteCount: number;
        citationCount: number;
        clusterId: string | null;
        isClusterHead: boolean;
        effectiveConfidence: number | null;
    }>;
    /**
     * Support an argument (increase confidence)
     */
    static supportArgument(argumentId: string, userId: string, interactionId?: string): Promise<ArgumentUpdateResult>;
    /**
     * Refute an argument (decrease confidence)
     */
    static refuteArgument(argumentId: string, userId: string, interactionId?: string): Promise<ArgumentUpdateResult>;
    /**
     * Link argument to a fact claim
     */
    static linkToFact(argumentId: string, factClaimId: string, dependencyStrength?: number): Promise<{
        id: string;
        factClaimId: string;
        argumentId: string;
        dependencyStrength: number;
    }>;
}
export {};
//# sourceMappingURL=argumentLedgerService.d.ts.map