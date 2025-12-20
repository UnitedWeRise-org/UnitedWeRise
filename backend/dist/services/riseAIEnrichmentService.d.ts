/**
 * RiseAI Enrichment Service
 *
 * Enriches posts and comments with their associated RiseAI responses
 * for inline display in the frontend.
 *
 * @module RiseAIEnrichmentService
 */
/**
 * Enriched RiseAI response data for frontend rendering
 */
export interface EnrichedRiseAIResponse {
    interactionId: string;
    status: 'pending' | 'processing' | 'analyzing' | 'complete' | 'completed' | 'failed' | 'challenged';
    responseComment: {
        id: string;
        content: string;
        createdAt: Date;
        likesCount: number;
        dislikesCount: number;
        agreesCount: number;
        disagreesCount: number;
        userSentiment?: 'LIKE' | 'DISLIKE' | null;
        userStance?: 'AGREE' | 'DISAGREE' | null;
        author: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
            verified: boolean;
        };
    } | null;
    entropyScore: number | null;
    createdAt: Date;
}
/**
 * RiseAI Enrichment Service
 *
 * Provides methods to enrich posts and comments with their associated
 * RiseAI responses for inline display.
 */
export declare class RiseAIEnrichmentService {
    /**
     * Get the RiseAI system user ID
     */
    static getSystemUserId(): string;
    /**
     * Get RiseAI response for a specific post trigger
     *
     * @param postId - The post that triggered the RiseAI analysis
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Enriched response data or null if no interaction exists
     */
    static getResponseForPost(postId: string, currentUserId?: string): Promise<EnrichedRiseAIResponse | null>;
    /**
     * Get RiseAI response for a specific comment trigger
     *
     * @param commentId - The comment that triggered the RiseAI analysis
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Enriched response data or null if no interaction exists
     */
    static getResponseForComment(commentId: string, currentUserId?: string): Promise<EnrichedRiseAIResponse | null>;
    /**
     * Batch enrich multiple posts with their RiseAI responses
     * Optimized for feed performance to avoid N+1 queries
     *
     * @param postIds - Array of post IDs to enrich
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Map of postId to enriched response
     */
    static enrichPostsWithResponses(postIds: string[], currentUserId?: string): Promise<Map<string, EnrichedRiseAIResponse>>;
    /**
     * Batch enrich multiple comments with their RiseAI responses
     *
     * @param commentIds - Array of comment IDs to enrich
     * @param currentUserId - Optional user ID for fetching their reactions
     * @returns Map of commentId to enriched response
     */
    static enrichCommentsWithResponses(commentIds: string[], currentUserId?: string): Promise<Map<string, EnrichedRiseAIResponse>>;
    /**
     * Get all RiseAI response comment IDs for a post
     * Used to filter these from regular comment lists
     *
     * @param postId - The post ID
     * @returns Array of comment IDs that are RiseAI responses
     */
    static getRiseAICommentIdsForPost(postId: string): Promise<string[]>;
    /**
     * Internal helper to enrich a single interaction
     */
    private static enrichInteraction;
}
//# sourceMappingURL=riseAIEnrichmentService.d.ts.map