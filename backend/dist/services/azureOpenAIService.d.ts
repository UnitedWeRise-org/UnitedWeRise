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
    private clients;
    private endpoint;
    private apiKey;
    private embeddingDeployment;
    private chatDeployment;
    private tier1Reasoning;
    private tier2Reasoning;
    private generalChat;
    private vision;
    private isConfigured;
    constructor();
    /**
     * Get or create an OpenAI client for a specific deployment
     * Azure OpenAI routes requests based on URL path, not model parameter
     * Each deployment needs its own client with deployment name in baseURL
     */
    private getClient;
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
    /**
     * Tier 1: Mission-critical political reasoning
     * Use for: Stance detection, News accountability summaries
     * Model: o1 reasoning model (highest quality)
     */
    generateTier1Completion(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemMessage?: string;
    }): Promise<string>;
    /**
     * Tier 2: Complex reasoning tasks
     * Use for: Topic discovery, Semantic classification
     * Model: o4-mini reasoning model
     */
    generateTier2Completion(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemMessage?: string;
    }): Promise<string>;
    /**
     * General: Pattern matching and classification
     * Use for: Text moderation, Feedback analysis
     * Model: gpt-4o-mini (cost-effective)
     */
    generateGeneralCompletion(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemMessage?: string;
    }): Promise<string>;
    /**
     * Vision: Image content analysis
     * Use for: Photo moderation
     * Model: gpt-4o-mini with vision (cost-effective pattern recognition)
     */
    generateVisionCompletion(messages: any[], options?: {
        maxTokens?: number;
        temperature?: number;
    }): Promise<string>;
}
export declare const azureOpenAI: AzureOpenAIService;
export {};
//# sourceMappingURL=azureOpenAIService.d.ts.map