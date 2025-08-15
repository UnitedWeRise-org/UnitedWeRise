export interface NewsArticleData {
    title: string;
    description?: string;
    content?: string;
    aiSummary?: string;
    url: string;
    publishedAt: string;
    sourceName: string;
    sourceType: 'NEWSPAPER' | 'MAGAZINE' | 'BLOG' | 'PRESS_RELEASE' | 'GOVERNMENT' | 'SOCIAL_MEDIA' | 'WIRE_SERVICE' | 'BROADCAST';
    author?: string;
    sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
    sentimentScore?: number;
    keywords: string[];
    politicalTopics?: string[];
    positionKeywords?: string[];
    embedding?: number[];
}
export interface OfficialNews {
    officialName: string;
    officialId?: string;
    articles: NewsArticleData[];
    totalCount: number;
    averageSentiment: number;
    topKeywords: string[];
}
export declare class NewsAggregationService {
    /**
     * Search for news articles about a specific politician
     * Implements historical accountability tracking with permanent caching
     */
    static searchPoliticianNews(officialName: string, officialId?: string, limit?: number, daysBack?: number): Promise<OfficialNews>;
    /**
     * Get articles from permanent historical cache
     */
    private static getHistoricalArticles;
    /**
     * Format articles for OfficialNews response
     */
    private static formatOfficialNews;
    /**
     * Get trending political news stories
     */
    static getTrendingPoliticalNews(limit?: number): Promise<NewsArticleData[]>;
    /**
     * Get news coverage for multiple officials
     */
    static getMultipleOfficialsNews(officials: Array<{
        name: string;
        id?: string;
    }>, daysBack?: number): Promise<Map<string, OfficialNews>>;
    /**
     * Generate AI summary for historical accountability tracking
     */
    static generateAISummary(title: string, description?: string, content?: string): Promise<string>;
    private static generateAzureAISummary;
    private static generateExtractiveSummary;
    /**
     * Extract political topics and position keywords for accountability tracking
     */
    static extractPoliticalContent(text: string): {
        politicalTopics: string[];
        positionKeywords: string[];
    };
    /**
     * Analyze sentiment with both categorical and numerical scores
     */
    static analyzeSentiment(text: string): Promise<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED'>;
    /**
     * Calculate numerical sentiment score (-1.0 to 1.0) for fine-grained analysis
     */
    static calculateSentimentScore(text: string): {
        score: number;
        category: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
    };
    /**
     * Get news articles from database with filtering
     */
    static getStoredArticles(officialId?: string, sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED', limit?: number, offset?: number): Promise<{
        articles: any[];
        total: number;
    }>;
    private static searchNewsAPI;
    private static searchTheNewsAPI;
    private static storeArticle;
    private static calculateRelevanceScore;
    private static calculateAverageSentiment;
    private static extractTopKeywords;
    private static extractKeywords;
    private static inferSourceType;
    private static extractMentionContext;
    private static sentimentToScore;
    private static calculateProminenceScore;
    private static findFirstMention;
    private static countMentions;
    private static chunkArray;
}
//# sourceMappingURL=newsAggregationService.d.ts.map