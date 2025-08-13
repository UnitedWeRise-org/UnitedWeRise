interface TextAnalysisResult {
    embedding: number[];
    sentiment?: number;
    topics?: string[];
    category?: string;
    hostilityScore?: number;
    argumentStrength?: number;
    evidenceLevel?: number;
    topicRelevance?: number;
    argumentType?: string;
}
export declare class EmbeddingService {
    private static readonly EMBEDDING_DIMENSION;
    private static readonly QWEN3_API_URL;
    private static readonly MODEL_NAME;
    private static readonly API_KEY;
    private static readonly USE_QDRANT;
    /**
     * Generate embedding using best available service (Azure OpenAI > Local)
     */
    static generateEmbedding(text: string): Promise<number[]>;
    /**
     * Generate comprehensive text analysis including embedding, sentiment, and topic classification
     */
    static analyzeText(text: string): Promise<TextAnalysisResult>;
    /**
     * Calculate cosine similarity between two embeddings
     */
    static calculateSimilarity(embedding1: number[], embedding2: number[]): number;
    /**
     * Find posts similar to a given embedding using PostgreSQL vector operations
     */
    static findSimilarPosts(targetEmbedding: number[], limit?: number, minSimilarity?: number, categoryFilter?: string): Promise<any[]>;
    /**
     * Update post embedding in both PostgreSQL and Qdrant
     */
    static updatePostEmbedding(postId: string, content: string): Promise<TextAnalysisResult>;
    /**
     * Batch process embeddings for existing posts
     */
    static batchProcessEmbeddings(batchSize?: number): Promise<number>;
    private static cleanText;
    private static extractTopics;
    private static assessArgumentStrength;
    private static assessEvidenceLevel;
    private static estimateSentiment;
    private static detectCategory;
    private static classifyArgumentType;
    private static generateFallbackEmbedding;
    private static simpleHash;
    private static assessHostility;
}
export {};
//# sourceMappingURL=embeddingService.d.ts.map