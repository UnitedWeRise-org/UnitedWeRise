import { Post } from '@prisma/client';
interface StanceVector {
    vector: number[];
    posts: Array<Post & {
        similarity: number;
    }>;
    summary: string;
    percentage: number;
}
interface AggregatedTopic {
    id: string;
    title: string;
    supportVector: StanceVector;
    opposeVector: StanceVector;
    neutralPosts?: Array<Post & {
        similarity: number;
    }>;
    totalPosts: number;
    score: number;
    geographicScope: 'national' | 'state' | 'local';
    state?: string;
    city?: string;
    createdAt: Date;
    expiresAt: Date;
}
interface TopicAggregationOptions {
    timeframeHours?: number;
    minPostsPerTopic?: number;
    maxTopics?: number;
    geographicScope?: 'national' | 'state' | 'local';
    userState?: string;
    userCity?: string;
    similarityThreshold?: number;
}
export declare class TopicAggregationService {
    private static readonly DEFAULT_TIMEFRAME_HOURS;
    private static readonly MIN_POSTS_PER_TOPIC;
    private static readonly SIMILARITY_THRESHOLD;
    private static readonly STANCE_SIMILARITY_THRESHOLD;
    private static readonly MAX_TOPICS;
    private static readonly CACHE_DURATION_MINUTES;
    private static topicCache;
    private static cacheTimestamps;
    /**
     * Generate aggregated topics with dual-vector stance detection
     */
    static aggregateTopics(options?: TopicAggregationOptions): Promise<AggregatedTopic[]>;
    /**
     * Fetch posts relevant to the geographic scope
     */
    private static fetchRelevantPosts;
    /**
     * Cluster posts by similarity
     */
    private static clusterPosts;
    /**
     * Analyze stances within a topic cluster
     */
    private static analyzeStances;
    /**
     * Determine stance of a post using AI
     */
    private static determineStance;
    /**
     * Generate topic title and summaries using AI
     */
    private static generateTopicMetadata;
    /**
     * Calculate topic relevance score
     */
    private static calculateTopicScore;
    /**
     * Determine the geographic scope of a topic
     */
    private static determineTopicScope;
    /**
     * Calculate centroid of posts
     */
    private static calculateCentroid;
    /**
     * Get cached topics if still valid
     */
    private static getCachedTopics;
    /**
     * Cache topics
     */
    private static cacheTopics;
    /**
     * Get topics for map display (rotating subset)
     */
    static getMapTopics(userState?: string, userCity?: string, count?: number): Promise<AggregatedTopic[]>;
}
export {};
//# sourceMappingURL=topicAggregationService.d.ts.map