/**
 * User Interest Service
 *
 * Constructs user interest vectors from multiple signal sources for
 * personalized feed ranking. Used by SlotRollService for the PERSONALIZED pool.
 *
 * Signal Sources (weighted by relevance):
 * 1. SOCIAL GRAPH
 *    - Subscriptions (2.0x) - Highest priority, explicit strong interest
 *    - Friends (1.5x) - Mutual relationship indicates shared interests
 *    - Follows (1.0x) - One-way interest signal
 *
 * 2. BEHAVIORAL SIGNALS
 *    - Recent likes (last 50) - Strong positive signal
 *    - User's own posts (last 20) - Self-similarity
 *    - Comments/reactions - Engagement patterns
 *    - Agree/disagree patterns - Topic stance inference
 *
 * 3. EXPLICIT PREFERENCES
 *    - User.interests[] - Explicit topic subscriptions
 *    - Onboarding data - Initial preferences
 *    - Geographic scope - Location-based relevance
 *
 * 4. NEGATIVE SIGNALS
 *    - Muted accounts - Exclude from feed
 *    - Blocked accounts - Hard exclude
 *    - Hidden posts - Reduce similar content
 */
interface SocialGraphRelationship {
    userId: string;
    type: 'subscription' | 'friend' | 'follow';
    weight: number;
}
export interface UserInterestProfile {
    userId: string;
    relationships: SocialGraphRelationship[];
    subscribedIds: Set<string>;
    friendIds: Set<string>;
    followedIds: Set<string>;
    interactionEmbeddings: number[][];
    likedPostEmbeddings: number[][];
    ownPostEmbeddings: number[][];
    explicitInterests: string[];
    h3Index: string | null;
    mutedIds: Set<string>;
    blockedIds: Set<string>;
    aggregateVector: number[] | null;
}
export declare class UserInterestService {
    /**
     * Build complete interest profile for a user
     * Aggregates all signal sources into a unified profile
     */
    static buildProfile(userId: string): Promise<UserInterestProfile>;
    /**
     * Compute aggregate interest vector from embeddings
     * Uses weighted average of liked posts and own posts
     */
    private static computeAggregateVector;
    /**
     * Calculate relevance score for a post given user profile
     * Returns 0-1 score combining all signals
     */
    static calculatePostRelevance(post: {
        id: string;
        authorId: string;
        embedding: number[];
        tags?: string[];
    }, profile: UserInterestProfile): number;
    /**
     * Get author relationship score based on social graph
     */
    static getAuthorRelationshipScore(authorId: string, profile: UserInterestProfile): number;
    /**
     * Check if author should be excluded (muted/blocked)
     */
    static shouldExcludeAuthor(authorId: string, profile: UserInterestProfile): boolean;
    /**
     * Calculate cosine similarity between two vectors
     */
    private static cosineSimilarity;
    /**
     * Calculate interest match score between user interests and post tags
     */
    private static calculateInterestMatch;
    /**
     * Get relationship weight for priority multiplier
     */
    static getRelationshipWeight(authorId: string, profile: UserInterestProfile): number;
    /**
     * Calculate geographic proximity boost based on H3 indexes
     * Returns 1.0-1.5 boost for nearby posts, 1.0 for distant/no location
     */
    static calculateGeoBoost(postH3Index: string | null, profile: UserInterestProfile): number;
    /**
     * Get muted user IDs
     * Excludes expired mutes (if expiresAt is set and in the past)
     */
    private static getMutedUsers;
    /**
     * Get blocked user IDs
     */
    private static getBlockedUsers;
}
export declare const userInterestService: UserInterestService;
export {};
//# sourceMappingURL=userInterestService.d.ts.map