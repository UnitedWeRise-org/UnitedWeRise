export interface TopicCluster {
    id: string;
    title: string;
    summary: string;
    prevailingPosition?: string;
    leadingCritique?: string;
    participantCount: number;
    postCount: number;
    engagementScore: number;
    centroidEmbedding: number[];
    keyWords: string[];
    createdAt: Date;
    lastActivity: Date;
    category?: string;
    relatedPosts: Array<{
        id: string;
        content: string;
        author: string;
        similarity: number;
        engagement: {
            likes: number;
            comments: number;
        };
    }>;
}
export interface TopicNavigationState {
    activeTopic?: TopicCluster;
    filteredPostIds: string[];
    algorithmFallback: any;
}
export declare class TopicDiscoveryService {
    /**
     * Main entry point: Discover trending topics from recent activity
     */
    static discoverTrendingTopics(timeframeHours?: number, minPostsPerTopic?: number, maxTopics?: number): Promise<TopicCluster[]>;
    /**
     * Get posts that are suitable for topic clustering
     */
    private static getRecentEngagedPosts;
    /**
     * Cluster posts using semantic similarity
     */
    private static clusterPostsBySimilarity;
    /**
     * Generate comprehensive AI summary for a topic cluster
     */
    private static generateTopicSummary;
    /**
     * Enter topic navigation mode - filter content by topic
     */
    static enterTopicMode(topicId: string, userId: string, limit?: number): Promise<{
        topicCluster: TopicCluster;
        filteredPosts: any[];
        navigationState: TopicNavigationState;
    }>;
    /**
     * Exit topic mode and return to algorithm-based feed
     */
    static exitTopicMode(userId: string, navigationState: TopicNavigationState): Promise<any[]>;
    /**
     * Get posts for topic-filtered content creation
     */
    static getTopicPosts(topicId: string, offset?: number, limit?: number): Promise<any[]>;
    private static cosineSimilarity;
    private static calculateCentroid;
    private static calculateEngagementScore;
    private static generateTopicId;
    private static generateFallbackSummary;
    private static extractKeyWords;
    private static enrichPostsWithMetadata;
}
export default TopicDiscoveryService;
//# sourceMappingURL=topicDiscoveryService.d.ts.map