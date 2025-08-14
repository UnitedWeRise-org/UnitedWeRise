/**
 * Feedback Analysis Service
 *
 * Uses Azure OpenAI to detect and categorize user feedback about
 * the UnitedWeRise platform itself.
 *
 * Migrated from Qwen/Qdrant to Azure OpenAI for production deployment.
 */
export interface FeedbackAnalysis {
    isFeedback: boolean;
    type?: 'suggestion' | 'bug_report' | 'concern' | 'feature_request';
    category?: 'ui_ux' | 'performance' | 'functionality' | 'accessibility' | 'moderation' | 'content' | 'general';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    summary?: string;
    confidence: number;
    actionable?: boolean;
    keywords?: string[];
}
export declare class FeedbackAnalysisService {
    private feedbackEmbeddings;
    private isEmbeddingsInitialized;
    private feedbackKeywords;
    private feedbackReferencePhrases;
    /**
     * Initialize embeddings for reference phrases using Azure OpenAI
     */
    private initializeEmbeddings;
    /**
     * Calculate cosine similarity between two vectors (delegated to Azure OpenAI service)
     */
    private cosineSimilarity;
    /**
     * Azure OpenAI-powered feedback analysis
     * Direct analysis without requiring pre-existing similar posts
     */
    private performAzureOpenAIFeedbackAnalysis;
    /**
     * Vector similarity analysis using Azure OpenAI embeddings
     * Compare against reference feedback phrases
     */
    private performVectorSimilarityAnalysis;
    /**
     * Async post-creation feedback analysis
     * Updates the post with feedback data after creation
     */
    analyzePostAsync(postId: string, content: string, userId?: string): Promise<void>;
    /**
     * Analyze a post to determine if it contains feedback about the site
     */
    analyzePost(content: string, userId?: string): Promise<FeedbackAnalysis>;
    /**
     * Ultra-fast keyword check for async determination
     * Public method for posts.ts to use synchronously
     */
    performQuickKeywordCheck(content: string): {
        isPotentialFeedback: boolean;
    };
    /**
     * Quick keyword-based analysis for initial screening
     */
    private performKeywordAnalysis;
    /**
     * Combine keyword, vector, and AI analysis results
     */
    private combineMultipleAnalyses;
    /**
     * Combine keyword and AI analysis results (legacy method)
     */
    private combineAnalysis;
    /**
     * Determine priority based on feedback type and keywords
     */
    private determinePriority;
    /**
     * Batch analyze multiple posts for feedback
     */
    analyzeBatch(posts: Array<{
        id: string;
        content: string;
    }>): Promise<Map<string, FeedbackAnalysis>>;
    /**
     * Get feedback statistics for admin dashboard
     */
    getFeedbackStats(timeframe?: 'day' | 'week' | 'month'): Promise<{
        totalFeedback: number;
        byType: {};
        byPriority: {};
        byCategory: {};
        avgConfidence: number;
    }>;
}
export declare const feedbackAnalysisService: FeedbackAnalysisService;
//# sourceMappingURL=feedbackAnalysisService.d.ts.map