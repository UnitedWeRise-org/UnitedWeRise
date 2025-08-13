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
class AzureOpenAIService {
    constructor() {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002';
        this.chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-35-turbo';
        this.isConfigured = !!(endpoint && apiKey);
        if (this.isConfigured) {
            this.client = new openai_1.default({
                apiKey: apiKey,
                baseURL: `${endpoint.replace(/\/+$/, '')}/openai/deployments`,
                defaultQuery: { 'api-version': '2024-02-15-preview' },
                defaultHeaders: {
                    'api-key': apiKey,
                },
            });
            logger_1.default.info('Azure OpenAI Service initialized', {
                endpoint: endpoint.replace(/\/+$/, ''),
                embeddingModel: this.embeddingDeployment,
                chatModel: this.chatDeployment
            });
        }
        else {
            logger_1.default.warn('Azure OpenAI Service not configured - missing endpoint or API key');
        }
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
            const response = await this.client.embeddings.create({
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
            const response = await this.client.chat.completions.create({
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
}
exports.AzureOpenAIService = AzureOpenAIService;
// Singleton instance for consistent usage
exports.azureOpenAI = new AzureOpenAIService();
//# sourceMappingURL=azureOpenAIService.js.map