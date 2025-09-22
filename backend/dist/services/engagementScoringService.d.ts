/**
 * Modular Engagement Scoring Service
 * Configurable algorithm for calculating post engagement scores
 * Designed for easy adjustment and A/B testing of different approaches
 */
export interface EngagementWeights {
    likes: number;
    dislikes: number;
    agrees: number;
    disagrees: number;
    comments: number;
    shares: number;
    views: number;
    communityNotes: number;
    reportsWeight: number;
    commentEngagement: number;
    enhancedShares: number;
}
export interface EngagementMetrics {
    likesCount: number;
    dislikesCount: number;
    agreesCount: number;
    disagreesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    communityNotesCount: number;
    reportsCount: number;
    commentEngagement?: {
        totalCommentReactions: number;
        avgReactionsPerComment: number;
        commentQualityScore: number;
    };
    shareMetrics?: {
        simpleSharesCount: number;
        quoteSharesCount: number;
        avgQuoteLength: number;
        recentSharesBoost: number;
        shareQualityScore: number;
    };
}
export interface EngagementConfig {
    algorithm: 'standard' | 'controversy' | 'quality' | 'balanced' | 'custom';
    weights: EngagementWeights;
    modifiers: {
        timeDecayEnabled: boolean;
        timeDecayFactor: number;
        controversyBoost: boolean;
        controversyThreshold: number;
        qualityBias: boolean;
        newContentBoost: boolean;
        authorReputationWeight: number;
    };
    adjustments: {
        minScore: number;
        maxScore: number;
        scaleToRange: boolean;
    };
}
export declare class EngagementScoringService {
    private static config;
    /**
     * Update scoring configuration
     */
    static updateConfig(newConfig: Partial<EngagementConfig>): void;
    /**
     * Get current configuration
     */
    static getConfig(): EngagementConfig;
    /**
     * Apply algorithm preset
     */
    static applyPreset(algorithm: EngagementConfig['algorithm']): void;
    /**
     * Calculate engagement score for a post
     */
    static calculateScore(metrics: EngagementMetrics, postCreatedAt: Date, authorReputation?: number): {
        score: number;
        breakdown: any;
        algorithm: string;
    };
    /**
     * Determine if a post is controversial
     */
    private static isControversial;
    /**
     * Calculate quality ratio based on positive vs negative engagement
     */
    private static calculateQualityRatio;
    /**
     * Batch calculate scores for multiple posts
     */
    static batchCalculateScores(posts: Array<{
        metrics: EngagementMetrics;
        createdAt: Date;
        authorReputation?: number;
    }>): Array<{
        score: number;
        breakdown: any;
        algorithm: string;
    }>;
    /**
     * Calculate comment engagement metrics for a post
     */
    static calculateCommentEngagement(comments: Array<{
        likesCount: number;
        dislikesCount: number;
        agreesCount: number;
        disagreesCount: number;
    }>): EngagementMetrics['commentEngagement'];
    /**
     * Calculate enhanced share metrics for a post
     */
    static calculateShareMetrics(shares: Array<{
        shareType: 'SIMPLE' | 'QUOTE';
        content?: string | null;
        createdAt: Date;
    }>, postCreatedAt: Date): EngagementMetrics['shareMetrics'];
    /**
     * Calculate engagement score for individual comments
     */
    static calculateCommentScore(comment: {
        likesCount: number;
        dislikesCount: number;
        agreesCount: number;
        disagreesCount: number;
        replyCount: number;
        createdAt: Date;
        content: string;
    }, authorReputation?: number): {
        score: number;
        breakdown: any;
    };
    /**
     * Find trending comments for a post
     */
    static findTrendingComments(comments: Array<{
        id: string;
        likesCount: number;
        dislikesCount: number;
        agreesCount: number;
        disagreesCount: number;
        replyCount?: number;
        createdAt: Date;
        content: string;
        author?: {
            reputation?: number;
        };
    }>, options?: {
        limit?: number;
        minScore?: number;
        timeWindow?: number;
    }): {
        trendingComments: {
            engagementData: {
                score: number;
                breakdown: any;
            };
            id: string;
            likesCount: number;
            dislikesCount: number;
            agreesCount: number;
            disagreesCount: number;
            replyCount?: number;
            createdAt: Date;
            content: string;
            author?: {
                reputation?: number;
            };
        }[];
        stats: {
            totalComments: number;
            recentComments: number;
            qualifyingComments: number;
            averageScore: number;
            timeWindow: number;
        };
    };
    /**
     * Get algorithm performance metrics
     */
    static getAlgorithmMetrics(posts: Array<{
        metrics: EngagementMetrics;
        createdAt: Date;
        authorReputation?: number;
    }>): {
        algorithm: "custom" | "standard" | "controversy" | "quality" | "balanced";
        totalPosts: number;
        scoreDistribution: {
            min: number;
            max: number;
            average: number;
            standardDeviation: number;
        };
        config: EngagementConfig;
    };
}
export default EngagementScoringService;
//# sourceMappingURL=engagementScoringService.d.ts.map