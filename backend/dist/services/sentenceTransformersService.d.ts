interface EmbeddingResult {
    embedding: number[];
    processingTime: number;
}
interface BasicAnalysis {
    category?: string;
    sentiment: number;
    argumentType: string;
    evidenceKeywords: string[];
}
export declare class SentenceTransformersService {
    private static embeddingPipeline;
    private static readonly MODEL_NAME;
    private static readonly FALLBACK_DIMENSION;
    /**
     * Initialize local embedding pipeline
     */
    private static getEmbeddingPipeline;
    /**
     * Generate embedding using local Sentence Transformers
     * Tries local @xenova/transformers first, falls back to semantic analysis
     */
    static generateEmbedding(text: string): Promise<EmbeddingResult>;
    /**
     * Batch generate embeddings for multiple texts
     */
    static batchGenerateEmbeddings(texts: string[], batchSize?: number): Promise<EmbeddingResult[]>;
    /**
     * Perform basic content analysis
     * Fast categorization and sentiment for real-time processing
     */
    static analyzeContent(text: string): BasicAnalysis;
    /**
     * Calculate cosine similarity between two embeddings
     */
    static calculateSimilarity(embedding1: number[], embedding2: number[]): number;
    private static cleanText;
    /**
     * Generate semantic embedding locally without API calls
     * Creates embeddings based on word frequency, sentiment, and topic features
     */
    private static generateSemanticEmbedding;
    private static generateFallbackEmbedding;
    private static simpleHash;
    private static detectCategory;
    private static estimateSentiment;
    private static classifyArgumentType;
    private static extractEvidenceKeywords;
}
export {};
//# sourceMappingURL=sentenceTransformersService.d.ts.map