/**
 * VideoFeedService
 *
 * Probability-cloud sampling algorithm for video snippet feeds.
 * Modeled after ProbabilityFeedService but adapted for video-specific
 * signals: engagement score, view velocity, hashtag matching, and social graph.
 *
 * Feed Types:
 * - for-you: Personalized probability sampling across all dimensions
 * - following: Videos from followed users, weighted by relationship type
 * - trending: Engagement-velocity-ranked videos from last 24 hours
 *
 * @module services/videoFeedService
 */
interface VideoFeedWeights {
    recency: number;
    engagement: number;
    social: number;
    trending: number;
    hashtagMatch: number;
}
export type VideoFeedType = 'for-you' | 'following' | 'trending';
interface VideoFeedOptions {
    userId?: string;
    feedType?: VideoFeedType;
    limit?: number;
    excludeIds?: string[];
    customWeights?: Partial<VideoFeedWeights>;
}
export declare class VideoFeedService {
    /**
     * Generate a personalized video feed using probability-cloud sampling.
     *
     * @param options - Feed generation options
     * @returns Scored and sampled video IDs with metadata
     */
    static generateFeed(options: VideoFeedOptions): Promise<{
        videoIds: string[];
        feedType: VideoFeedType;
        algorithm: string;
        candidateCount: number;
    }>;
    /**
     * For-You feed: probability-cloud sampling across all dimensions.
     */
    private static generateForYouFeed;
    /**
     * Following feed: videos from followed users, weighted by relationship type.
     */
    private static generateFollowingFeed;
    /**
     * Trending feed: engagement-velocity-ranked videos from last 24 hours.
     */
    private static generateTrendingFeed;
    /**
     * Weighted random sampling from scored candidates.
     * Higher scores have proportionally higher probability of being selected.
     *
     * @param scored - Scored video candidates
     * @param count - Number to select
     * @returns Selected videos in sampled order
     */
    private static weightedSample;
}
export {};
//# sourceMappingURL=videoFeedService.d.ts.map