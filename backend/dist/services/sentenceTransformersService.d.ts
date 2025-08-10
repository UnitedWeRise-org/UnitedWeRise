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
    private static hf;
    private static readonly MODEL_NAME;
    private static readonly FALLBACK_DIMENSION;
    /**
     * Initialize Hugging Face client
     */
    private static getClient;
    /**
     * Generate embedding using Sentence Transformers
     * Fast, lightweight, runs on CPU
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
    private static generateFallbackEmbedding;
    private static simpleHash;
    private static detectCategory;
    private static estimateSentiment;
    private static classifyArgumentType;
    private static extractEvidenceKeywords;
}
export {};
//# sourceMappingURL=sentenceTransformersService.d.ts.map