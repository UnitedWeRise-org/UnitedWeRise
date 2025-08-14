/**
 * Probability-based Feed Algorithm
 * Created: August 10, 2025
 * Purpose: Implement electron-cloud-like probability sampling for social media feed
 * Author: Claude Code Assistant
 */
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
     * Generate personalized feed using probability cloud sampling
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
     */
    private static getUserProfile;
    /**
     * Get candidate posts for feed consideration
     */
    private static getCandidatePosts;
    /**
     * Score a single post across all dimensions
     */
    private static scorePost;
    /**
     * Sample posts from probability distribution based on scores
     */
    private static probabilitySample;
    /**
     * Calculate cosine similarity between two vectors
     */
    private static cosineSimilarity;
    /**
     * Calculate average score for analytics
     */
    private static avgScore;
}
export {};
//# sourceMappingURL=probabilityFeedService.d.ts.map