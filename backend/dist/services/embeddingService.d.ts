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
     * Generate embedding using Sentence Transformers (fast, CPU-based)
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
     * Find posts similar to a given embedding using Qdrant or fallback to PostgreSQL
     */
    static findSimilarPosts(targetEmbedding: number[], limit?: number, minSimilarity?: number, categoryFilter?: string): Promise<{
        similarity: any;
        author: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
        };
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        content: string;
        imageUrl: string | null;
        authorId: string;
        isPolitical: boolean;
        tags: string[];
        likesCount: number;
        commentsCount: number;
    }[]>;
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