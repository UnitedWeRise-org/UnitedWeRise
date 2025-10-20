interface FeedWeights {
    recency: number;
    similarity: number;
    social: number;
    trending: number;
    reputation: number;
}
export declare class ProbabilityFeedService {
    private static defaultWeights;
    /**
     * Generate personalized feed using probability cloud sampling algorithm
     *
     * This algorithm uses electron-cloud-like probability distribution to sample posts
     * based on multiple weighted factors. Unlike deterministic ranking, this creates
     * more diverse feeds while still favoring relevant content.
     *
     * Algorithm steps:
     * 1. Get candidate posts from last 30 days
     * 2. Score each post across 5 dimensions (recency, similarity, social, trending, reputation)
     * 3. Apply weighted scoring with configurable weights
     * 4. Apply reputation-based visibility multipliers (±10-20% visibility)
     * 5. Use weighted random sampling (higher scores = higher probability)
     *
     * @param userId - User ID to generate feed for
     * @param limit - Maximum number of posts to return (default: 50)
     * @param customWeights - Optional custom weights to override defaults
     * @returns Promise<Object> Feed data with posts, algorithm info, and stats
     * @throws {Error} When user profile cannot be loaded or post scoring fails
     *
     * @example
     * const feed = await ProbabilityFeedService.generateFeed('user_123', 25, {
     *   recency: 0.4,  // Emphasize newer posts
     *   social: 0.3    // Increase content from followed users
     * });
     * console.log(feed.posts.length); // Up to 25 posts
     * console.log(feed.algorithm); // "probability-cloud"
     * console.log(feed.stats.avgRecencyScore); // 0.72
     */
    static generateFeed(userId: string, limit?: number, customWeights?: Partial<FeedWeights>): Promise<{
        posts: any[];
        algorithm: string;
        weights?: undefined;
        stats?: undefined;
    } | {
        posts: any[];
        algorithm: string;
        weights: {
            recency: number;
            similarity: number;
            social: number;
            trending: number;
            reputation: number;
        };
        stats: {
            candidateCount: number;
            avgRecencyScore: number;
            avgSimilarityScore: number;
            avgSocialScore: number;
            avgTrendingScore: number;
            avgReputationScore: number;
            avgVisibilityMultiplier: number;
        };
    }>;
    /**
     * Get user profile with interaction patterns for similarity scoring
     *
     * Fetches user data including:
     * - Followed users (for social scoring)
     * - Recent liked posts with embeddings (for similarity scoring)
     * - User's own posts with embeddings (for self-similarity)
     *
     * @param userId - User ID to fetch profile for
     * @returns Promise<Object> User profile with followedUserIds Set and interactionEmbeddings array
     * @throws {Error} When user lookup fails or database query errors
     *
     * @example
     * const profile = await this.getUserProfile('user_123');
     * console.log(profile.followedUserIds.size); // 42
     * console.log(profile.interactionEmbeddings.length); // 70 (max 50 likes + 20 posts)
     */
    private static getUserProfile;
    /**
     * Get candidate posts for feed consideration
     *
     * Fetches recent public posts from last 30 days, excluding user's own posts.
     * Includes post metadata, author details with badges, photos, engagement counts,
     * and comment reaction metrics.
     *
     * @param userId - User ID to exclude from results
     * @returns Promise<Post[]> Array of candidate posts (max 500)
     * @throws {Error} When database query fails
     *
     * @example
     * const candidates = await this.getCandidatePosts('user_123');
     * console.log(candidates.length); // Up to 500 posts
     * console.log(candidates[0].author.verified); // true
     */
    private static getCandidatePosts;
    /**
     * Score a single post across all dimensions
     *
     * Calculates 5 dimensional scores and applies weighted final score:
     * 1. Recency Score - Exponential decay with 24-hour half-life
     * 2. Social Score - 1.0 for followed users, 0.1 for others
     * 3. Trending Score - Normalized engagement score (0-1 range)
     * 4. Similarity Score - Cosine similarity to user's interaction history
     * 5. Reputation Score - Author's reputation normalized to 0-1
     *
     * Then applies visibility multiplier based on author reputation:
     * - 95+ reputation: 1.1x visibility boost (+10%)
     * - 50-94 reputation: 1.0x normal visibility
     * - 30-49 reputation: 0.9x suppression (-10%)
     * - 0-29 reputation: 0.8x suppression (-20%)
     *
     * @param post - Post object with author, engagement, and embedding data
     * @param userProfile - User profile with followedUserIds and interactionEmbeddings
     * @param weights - Scoring weights for each dimension
     * @returns Promise<PostScore & { post }> Scored post with breakdown of all scores
     *
     * @example
     * const scored = await this.scorePost(post, profile, weights);
     * console.log(scored.recencyScore); // 0.87 (recent post)
     * console.log(scored.socialScore); // 1.0 (from followed user)
     * console.log(scored.finalScore); // 0.73 (weighted + visibility)
     */
    private static scorePost;
    /**
     * Sample posts from probability distribution based on scores
     *
     * Implements weighted random sampling (electron cloud-like distribution):
     * - Higher-scored posts have higher probability of selection
     * - But lower-scored posts still have chance (creates diversity)
     * - Each selected post is removed from pool (no duplicates)
     * - Minimum score floor of 0.1 prevents zero-probability posts
     *
     * Algorithm: Accumulate scores as cumulative distribution, generate random
     * number in [0, totalScore], select first post where accumulator >= random.
     *
     * @param scoredPosts - Array of posts with calculated scores
     * @param limit - Maximum number of posts to sample
     * @returns Array of selected posts (up to limit)
     *
     * @example
     * const selected = this.probabilitySample(scoredPosts, 25);
     * // High-score posts more likely, but low-score posts can still appear
     * console.log(selected.length); // Up to 25
     */
    private static probabilitySample;
    /**
     * Calculate cosine similarity between two embedding vectors
     *
     * Measures similarity between content embeddings using cosine similarity formula:
     * similarity = (a · b) / (||a|| * ||b||)
     *
     * Returns 0 if vectors have different lengths or zero magnitude.
     * Returns value in [-1, 1] range where:
     * - 1 = identical content
     * - 0 = unrelated content
     * - -1 = opposite content
     *
     * @param a - First embedding vector
     * @param b - Second embedding vector
     * @returns Cosine similarity score (0 if incompatible vectors)
     *
     * @example
     * const sim = this.cosineSimilarity([0.1, 0.5, 0.3], [0.2, 0.6, 0.4]);
     * console.log(sim); // ~0.99 (very similar)
     */
    private static cosineSimilarity;
    /**
     * Calculate average score for analytics
     *
     * Computes mean value for a specific score field across all posts.
     * Used for feed stats/debugging.
     *
     * @param scoredPosts - Array of scored posts
     * @param field - Score field to average (e.g., 'recencyScore', 'finalScore')
     * @returns Average value (0 if empty array)
     *
     * @example
     * const avgRecency = this.avgScore(scoredPosts, 'recencyScore');
     * console.log(avgRecency); // 0.65
     */
    private static avgScore;
}
export {};
//# sourceMappingURL=probabilityFeedService.d.ts.map