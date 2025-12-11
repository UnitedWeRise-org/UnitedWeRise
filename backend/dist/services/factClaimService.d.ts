/**
 * FactClaim Service
 *
 * Manages factual claims that underlie arguments.
 * When facts are challenged or debunked, confidence cascades to dependent arguments.
 */
import { Prisma } from '@prisma/client';
interface FactCreateParams {
    claim: string;
    sourcePostId?: string;
    sourceUserId?: string;
    initialConfidence?: number;
}
interface FactChallengeResult {
    factId: string;
    oldConfidence: number;
    newConfidence: number;
    affectedArguments: string[];
}
export declare class FactClaimService {
    /**
     * Create a new fact claim with embedding
     */
    static createFact(params: FactCreateParams): Promise<{
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
    }>;
    /**
     * Find similar facts using embedding similarity
     */
    static findSimilarFacts(claim: string, limit?: number, minSimilarity?: number): Promise<{
        embedding: any;
        similarity: number;
        id: string;
        confidence: number;
        citationCount: number;
        claim: string;
        challengeCount: number;
    }[]>;
    /**
     * Update fact confidence and cascade to dependent arguments
     */
    static updateFactConfidence(factId: string, newConfidence: number, reason: string): Promise<FactChallengeResult>;
    /**
     * Challenge a fact (reduces confidence)
     */
    static challengeFact(factId: string, reason: string): Promise<FactChallengeResult>;
    /**
     * Cite a fact (increases confidence)
     */
    static citeFact(factId: string, contextPostId?: string): Promise<FactChallengeResult>;
    /**
     * Get fact with linked arguments
     */
    static getFact(factId: string): Promise<{
        communityNotes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            postId: string | null;
            authorId: string;
            isDisplayed: boolean;
            factClaimId: string | null;
            noteType: string;
            helpfulScore: number;
            notHelpfulScore: number;
            voteCount: number;
            displayThreshold: number;
            isAppealed: boolean;
            appealResolved: boolean;
            appealOutcome: string | null;
            confidenceImpact: number | null;
        }[];
        dependentArguments: ({
            argument: {
                id: string;
                confidence: number;
                content: string;
                summary: string;
                effectiveConfidence: number;
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
        sourcePostId: string | null;
        sourceUserId: string | null;
        confidenceHistory: Prisma.JsonValue;
        citationCount: number;
        claim: string;
        challengeCount: number;
    }>;
    /**
     * Get facts below a confidence threshold (potentially debunked)
     */
    static getLowConfidenceFacts(threshold?: number, limit?: number): Promise<({
        dependentArguments: {
            argumentId: string;
        }[];
    } & {
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
    })[]>;
    /**
     * Get high confidence facts (well-established)
     */
    static getEstablishedFacts(threshold?: number, limit?: number): Promise<{
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
    }[]>;
    /**
     * Search facts by claim text
     */
    static searchFacts(query: string, limit?: number): Promise<{
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
    }[]>;
}
export {};
//# sourceMappingURL=factClaimService.d.ts.map