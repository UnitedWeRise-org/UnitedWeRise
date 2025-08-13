/**
 * Universal Semantic Search Service
 *
 * Implements the pattern you identified:
 * 1. Query Qdrant for semantically similar content
 * 2. Use AI to rank/filter/classify results
 * 3. Apply to any topic: feedback, election issues, policy discussions, etc.
 */
interface SemanticSearchResult {
    isRelevant: boolean;
    confidence: number;
    classification?: string;
    category?: string;
    summary: string;
    relatedPosts: Array<{
        content: string;
        similarity: number;
        postId: string;
    }>;
}
interface SearchConfig {
    topic: string;
    limit?: number;
    scoreThreshold?: number;
    classificationOptions?: string[];
    categories?: string[];
    additionalContext?: string;
}
export declare class SemanticSearchService {
    /**
     * Universal semantic search and classification
     *
     * @param content - Content to analyze
     * @param config - Search configuration
     * @returns Analysis results with AI classification
     */
    static searchAndClassify(content: string, config: SearchConfig): Promise<SemanticSearchResult>;
    /**
     * Use AI to classify content based on similar posts
     */
    private static performAIClassification;
    /**
     * Pre-configured search for common topics
     */
    static searchFeedback(content: string): Promise<SemanticSearchResult>;
    static searchPolicyTopic(content: string, topic: string): Promise<SemanticSearchResult>;
    static searchElectionContent(content: string): Promise<SemanticSearchResult>;
}
export default SemanticSearchService;
//# sourceMappingURL=semanticSearchService.d.ts.map