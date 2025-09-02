/**
 * Azure OpenAI Service for UnitedWeRise Platform
 *
 * Provides embeddings and chat completions using Azure OpenAI
 * Replaces local Ollama/Qwen setup for production deployment
 */
interface EmbeddingResult {
    embedding: number[];
    processingTime: number;
    model: string;
    usage?: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
interface TopicSummary {
    title: string;
    prevailingPosition: string;
    leadingCritique: string;
    confidence: number;
}
export declare class AzureOpenAIService {
    private client;
    private embeddingDeployment;
    private chatDeployment;
    private isConfigured;
    constructor();
    /**
     * Generate embedding for text using Azure OpenAI
     */
    generateEmbedding(text: string): Promise<EmbeddingResult>;
    /**
     * Generate embeddings for multiple texts in batch
     */
    batchGenerateEmbeddings(texts: string[], batchSize?: number): Promise<EmbeddingResult[]>;
    /**
     * Generate topic summary using Azure OpenAI
     */
    generateTopicSummary(posts: Array<{
        id: string;
        content: string;
        author?: {
            username: string;
        };
        createdAt: Date;
    }>): Promise<TopicSummary>;
    /**
     * Calculate cosine similarity between two embeddings
     */
    static calculateSimilarity(embedding1: number[], embedding2: number[]): number;
    /**
     * Health check for Azure OpenAI service
     */
    healthCheck(): Promise<{
        status: string;
        latency?: number;
        error?: string;
    }>;
    private cleanText;
    private buildTopicAnalysisPrompt;
    private parseTopicSummaryText;
    private extractFromLines;
    /**
     * Generate general completion using Azure OpenAI
     */
    generateCompletion(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        systemMessage?: string;
    }): Promise<string>;
}
export declare const azureOpenAI: AzureOpenAIService;
export {};
//# sourceMappingURL=azureOpenAIService.d.ts.map