"use strict";
/**
 * Azure OpenAI Service for UnitedWeRise Platform
 *
 * Provides embeddings and chat completions using Azure OpenAI
 * Replaces local Ollama/Qwen setup for production deployment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureOpenAI = exports.AzureOpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("../utils/logger"));
const errorLoggingService_1 = require("./errorLoggingService");
class AzureOpenAIService {
    clients = new Map();
    endpoint;
    apiKey;
    embeddingDeployment;
    chatDeployment;
    tier1Reasoning;
    tier2Reasoning;
    generalChat;
    vision;
    isConfigured;
    constructor() {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        // Tier-based deployments (o1/o4-mini reasoning upgrade - December 2024)
        // Tier 1: o1 reasoning model for RiseAI political analysis
        // Tier 2: o4-mini reasoning model for complex tasks
        // General: gpt-4.1-mini for pattern matching/classification
        // Vision: gpt-4o for image analysis
        this.tier1Reasoning = process.env.AZURE_OPENAI_TIER1_REASONING || 'o1';
        this.tier2Reasoning = process.env.AZURE_OPENAI_TIER2_REASONING || 'o4-mini';
        this.generalChat = process.env.AZURE_OPENAI_GENERAL_CHAT || 'gpt-4.1-mini';
        this.vision = process.env.AZURE_OPENAI_VISION || 'gpt-4o';
        // Embeddings (unchanged)
        this.embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDINGS ||
            process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ||
            'text-embedding-ada-002';
        // SAFETY NET: Backwards compatibility for old environment variables
        this.chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || this.generalChat;
        this.isConfigured = !!(endpoint && apiKey);
        this.endpoint = endpoint?.replace(/\/+$/, '') || '';
        this.apiKey = apiKey || '';
        if (this.isConfigured) {
            logger_1.default.info('🤖 Azure OpenAI 4-Tier Architecture Initialized', {
                endpoint: this.endpoint,
                tier1Reasoning: this.tier1Reasoning,
                tier2Reasoning: this.tier2Reasoning,
                generalChat: this.generalChat,
                vision: this.vision,
                embeddings: this.embeddingDeployment
            });
        }
        else {
            logger_1.default.warn('Azure OpenAI Service not configured - missing endpoint or API key');
        }
    }
    /**
     * Get or create an OpenAI client for a specific deployment
     * Azure OpenAI routes requests based on URL path, not model parameter
     * Each deployment needs its own client with deployment name in baseURL
     */
    getClient(deploymentName) {
        if (!this.clients.has(deploymentName)) {
            this.clients.set(deploymentName, new openai_1.default({
                apiKey: this.apiKey,
                baseURL: `${this.endpoint}/openai/deployments/${deploymentName}`,
                defaultQuery: { 'api-version': '2024-12-01-preview' },
                defaultHeaders: { 'api-key': this.apiKey },
            }));
            logger_1.default.debug(`Created OpenAI client for deployment: ${deploymentName}`);
        }
        return this.clients.get(deploymentName);
    }
    /**
     * Generate embedding for text using Azure OpenAI
     */
    async generateEmbedding(text) {
        const startTime = Date.now();
        try {
            if (!text || text.trim().length === 0) {
                return {
                    embedding: new Array(1536).fill(0), // Ada-002 dimension
                    processingTime: 0,
                    model: this.embeddingDeployment
                };
            }
            if (!this.isConfigured) {
                logger_1.default.warn('Azure OpenAI not configured, returning zero vector');
                return {
                    embedding: new Array(1536).fill(0),
                    processingTime: Date.now() - startTime,
                    model: 'not-configured'
                };
            }
            // Clean and truncate text for embeddings
            const cleanText = this.cleanText(text).slice(0, 8000); // Stay within token limits
            const client = this.getClient(this.embeddingDeployment);
            const response = await client.embeddings.create({
                model: this.embeddingDeployment,
                input: [cleanText]
            });
            const embedding = response.data[0].embedding;
            const processingTime = Date.now() - startTime;
            logger_1.default.debug('Generated Azure OpenAI embedding', {
                textLength: cleanText.length,
                embeddingDimension: embedding.length,
                processingTime,
                tokens: response.usage?.total_tokens
            });
            return {
                embedding,
                processingTime,
                model: this.embeddingDeployment,
                usage: response.usage
            };
        }
        catch (error) {
            logger_1.default.error('Failed to generate Azure OpenAI embedding', { error, textLength: text.length });
            // Return zero vector as fallback
            return {
                embedding: new Array(1536).fill(0),
                processingTime: Date.now() - startTime,
                model: 'error-fallback'
            };
        }
    }
    /**
     * Generate embeddings for multiple texts in batch
     */
    async batchGenerateEmbeddings(texts, batchSize = 5) {
        // Placeholder - use single embedding for each text
        const results = await Promise.all(texts.map(text => this.generateEmbedding(text)));
        return results;
    }
    /**
     * Generate topic summary using Azure OpenAI
     */
    async generateTopicSummary(posts) {
        try {
            if (posts.length === 0) {
                return {
                    title: 'Empty Topic',
                    prevailingPosition: 'No posts to analyze',
                    leadingCritique: 'No opposing viewpoints found',
                    confidence: 0
                };
            }
            if (!this.isConfigured) {
                return {
                    title: `Discussion (${posts.length} posts)`,
                    prevailingPosition: 'Azure OpenAI not configured',
                    leadingCritique: 'Azure OpenAI not configured',
                    confidence: 0.1
                };
            }
            const prompt = this.buildTopicAnalysisPrompt(posts);
            const client = this.getClient(this.chatDeployment);
            const response = await client.chat.completions.create({
                model: this.chatDeployment,
                messages: [
                    {
                        role: "system",
                        content: "You are a political analyst specializing in civic discourse. Analyze political discussions objectively and identify key positions and counterarguments."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 400,
                temperature: 0.3, // Lower temperature for more consistent analysis
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });
            const content = response.choices[0].message?.content;
            if (!content) {
                throw new Error('No response from Azure OpenAI');
            }
            // Try to parse JSON response, fall back to text parsing
            try {
                const parsed = JSON.parse(content);
                return {
                    title: parsed.title || 'Political Discussion',
                    prevailingPosition: parsed.prevailingPosition || 'Multiple viewpoints present',
                    leadingCritique: parsed.leadingCritique || 'Various concerns raised',
                    confidence: parsed.confidence || 0.8
                };
            }
            catch (parseError) {
                // Fallback text parsing if JSON fails
                return this.parseTopicSummaryText(content);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to generate topic summary', { error, postCount: posts.length });
            return {
                title: `Discussion (${posts.length} posts)`,
                prevailingPosition: 'Unable to analyze prevailing position',
                leadingCritique: 'Unable to identify main criticisms',
                confidence: 0.1
            };
        }
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
    static calculateSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
            return 0;
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    /**
     * Health check for Azure OpenAI service
     */
    async healthCheck() {
        if (!this.isConfigured) {
            return {
                status: 'not-configured',
                latency: 0,
                error: 'Azure OpenAI endpoint or API key not configured'
            };
        }
        const startTime = Date.now();
        try {
            // Test with a simple embedding request
            await this.generateEmbedding("Health check test");
            return {
                status: 'healthy',
                latency: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                latency: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Private helper methods
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?;:\-'"()]/g, '')
            .trim();
    }
    buildTopicAnalysisPrompt(posts) {
        const postSummaries = posts.slice(0, 10).map((post, i) => `Post ${i + 1}: ${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}`).join('\n');
        return `Analyze these ${posts.length} political discussion posts and provide a topic summary.

Posts to analyze:
${postSummaries}

Respond in JSON format with these fields:
{
  "title": "4-6 word topic title",
  "prevailingPosition": "Most common viewpoint in 1-2 sentences", 
  "leadingCritique": "Main opposing argument in 1-2 sentences",
  "confidence": 0.8
}

Focus on:
- Identifying the core political topic or issue
- Finding the most commonly expressed position
- Identifying the strongest counter-argument or criticism
- Being objective and balanced in analysis`;
    }
    parseTopicSummaryText(content) {
        // Fallback text parsing if JSON parsing fails
        const lines = content.split('\n').filter(line => line.trim());
        return {
            title: this.extractFromLines(lines, ['title', 'topic']) || 'Political Discussion',
            prevailingPosition: this.extractFromLines(lines, ['prevailing', 'position', 'common']) || 'Multiple viewpoints expressed',
            leadingCritique: this.extractFromLines(lines, ['critique', 'criticism', 'opposing']) || 'Various concerns raised',
            confidence: 0.6 // Lower confidence for text parsing
        };
    }
    extractFromLines(lines, keywords) {
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (keywords.some(keyword => lowerLine.includes(keyword))) {
                // Extract text after colon or return the line
                const colonIndex = line.indexOf(':');
                return colonIndex >= 0 ? line.substring(colonIndex + 1).trim() : line.trim();
            }
        }
        return null;
    }
    /**
     * Generate general completion using Azure OpenAI
     */
    async generateCompletion(prompt, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Azure OpenAI not configured');
        }
        const client = this.getClient(this.chatDeployment);
        const response = await client.chat.completions.create({
            model: this.chatDeployment,
            messages: [
                {
                    role: "system",
                    content: options.systemMessage || "You are a helpful AI assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: options.maxTokens || 200,
            temperature: options.temperature || 0.3
        });
        const content = response.choices[0].message?.content;
        if (!content) {
            throw new Error('No response from AI service');
        }
        return content;
    }
    /**
     * Tier 1: Mission-critical political reasoning
     * Use for: Stance detection, News accountability summaries
     * Model: o1 reasoning model (highest quality)
     */
    async generateTier1Completion(prompt, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Azure OpenAI not configured');
        }
        try {
            // Check if using o-series reasoning model (o1, o3, o4, etc.)
            const isReasoningModel = /^o[1-9]/.test(this.tier1Reasoning);
            const client = this.getClient(this.tier1Reasoning);
            let response;
            if (isReasoningModel) {
                // o-series models have different API requirements:
                // - No temperature parameter (fixed to 1)
                // - Use max_completion_tokens instead of max_tokens
                // - No system role (use developer role or combine with user message)
                // - max_completion_tokens includes BOTH reasoning tokens AND output tokens
                //   o1 uses many tokens for internal reasoning, so we need a high limit (16000+)
                const systemContext = options.systemMessage || "You are a political analyst providing objective, nuanced analysis.";
                response = await client.chat.completions.create({
                    model: this.tier1Reasoning,
                    messages: [
                        {
                            role: 'user',
                            content: `[SYSTEM CONTEXT: ${systemContext}]\n\n${prompt}`
                        }
                    ],
                    max_completion_tokens: options.maxTokens || 16000
                }); // Type assertion needed for o-series specific params
            }
            else {
                // Standard GPT models
                response = await client.chat.completions.create({
                    model: this.tier1Reasoning,
                    messages: [
                        {
                            role: "system",
                            content: options.systemMessage || "You are a political analyst providing objective, nuanced analysis."
                        },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: options.maxTokens || 500,
                    temperature: options.temperature ?? 0.3
                });
            }
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from Tier 1 AI');
            }
            logger_1.default.debug('Tier 1 completion generated', {
                model: this.tier1Reasoning,
                isReasoningModel,
                tokens: response.usage?.total_tokens
            });
            return content;
        }
        catch (error) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'azure-openai',
                operation: 'generateTier1Completion',
                error,
                additionalContext: { model: this.tier1Reasoning }
            });
            logger_1.default.error('Tier 1 completion failed', { error, model: this.tier1Reasoning });
            throw error;
        }
    }
    /**
     * Tier 2: Complex reasoning tasks
     * Use for: Topic discovery, Semantic classification
     * Model: o4-mini reasoning model
     */
    async generateTier2Completion(prompt, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Azure OpenAI not configured');
        }
        try {
            // Check if using o-series reasoning model (o1, o3, o4, etc.)
            const isReasoningModel = /^o[1-9]/.test(this.tier2Reasoning);
            const client = this.getClient(this.tier2Reasoning);
            let response;
            if (isReasoningModel) {
                // o-series models have different API requirements
                // max_completion_tokens includes BOTH reasoning tokens AND output tokens
                // o4-mini uses fewer tokens than o1 but still needs room for reasoning (8000+)
                const systemContext = options.systemMessage || "You are a helpful AI assistant.";
                response = await client.chat.completions.create({
                    model: this.tier2Reasoning,
                    messages: [
                        {
                            role: 'user',
                            content: `[SYSTEM CONTEXT: ${systemContext}]\n\n${prompt}`
                        }
                    ],
                    max_completion_tokens: options.maxTokens || 8000
                });
            }
            else {
                // Standard GPT models
                response = await client.chat.completions.create({
                    model: this.tier2Reasoning,
                    messages: [
                        {
                            role: "system",
                            content: options.systemMessage || "You are a helpful AI assistant."
                        },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: options.maxTokens || 500,
                    temperature: options.temperature ?? 0.3
                });
            }
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from Tier 2 AI');
            }
            return content;
        }
        catch (error) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'azure-openai',
                operation: 'generateTier2Completion',
                error,
                additionalContext: { model: this.tier2Reasoning }
            });
            logger_1.default.error('Tier 2 completion failed', { error, model: this.tier2Reasoning });
            throw error;
        }
    }
    /**
     * General: Pattern matching and classification
     * Use for: Text moderation, Feedback analysis
     * Model: gpt-4o-mini (cost-effective)
     */
    async generateGeneralCompletion(prompt, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Azure OpenAI not configured');
        }
        try {
            const client = this.getClient(this.generalChat);
            const response = await client.chat.completions.create({
                model: this.generalChat,
                messages: [
                    {
                        role: "system",
                        content: options.systemMessage || "You are a helpful AI assistant."
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature ?? 0.3
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from General AI');
            }
            return content;
        }
        catch (error) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'azure-openai',
                operation: 'generateGeneralCompletion',
                error,
                additionalContext: { model: this.generalChat }
            });
            logger_1.default.error('General completion failed', { error, model: this.generalChat });
            throw error;
        }
    }
    /**
     * Vision: Image content analysis
     * Use for: Photo moderation
     * Model: gpt-4o-mini with vision (cost-effective pattern recognition)
     */
    async generateVisionCompletion(messages, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Azure OpenAI not configured');
        }
        try {
            const client = this.getClient(this.vision);
            const response = await client.chat.completions.create({
                model: this.vision,
                messages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature ?? 0.3
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from Vision AI');
            }
            return content;
        }
        catch (error) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'azure-openai',
                operation: 'generateVisionCompletion',
                error,
                additionalContext: { model: this.vision }
            });
            logger_1.default.error('Vision completion failed', { error, model: this.vision });
            throw error;
        }
    }
}
exports.AzureOpenAIService = AzureOpenAIService;
// Singleton instance for consistent usage
exports.azureOpenAI = new AzureOpenAIService();
//# sourceMappingURL=azureOpenAIService.js.map