/**
 * Feedback Analysis Service
 *
 * Uses existing Qwen3 and Sentence Transformers infrastructure to detect
 * and categorize user feedback about the UnitedWeRise platform itself.
 *
 * Integrates with existing AI pipeline for efficient processing.
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
     * Initialize embeddings for reference phrases
     */
    private initializeEmbeddings;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Universal semantic search approach - your brilliant idea!
     * Query Qdrant for content similar to "website feedback and suggestions"
     * Then use Qwen3 to determine relevance and classification
     */
    private performSemanticFeedbackSearch;
    /**
     * Legacy: Qdrant search against pre-flagged feedback only
     */
    private performQdrantSimilarityAnalysis;
    /**
     * Perform vector similarity analysis (legacy in-memory approach)
     */
    private performVectorAnalysis;
    /**
     * Analyze a post to determine if it contains feedback about the site
     */
    analyzePost(content: string, userId?: string): Promise<FeedbackAnalysis>;
    /**
     * Quick keyword-based analysis for initial screening
     */
    private performKeywordAnalysis;
    /**
     * Use Qwen3 for sophisticated feedback analysis
     */
    private performAIAnalysis;
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